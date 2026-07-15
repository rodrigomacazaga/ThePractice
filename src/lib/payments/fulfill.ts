import { db } from "@/lib/db";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { formatMXN, formatCredits, formatDateTimeMX, generateAccessCode } from "@/lib/utils";
import { audit } from "@/lib/audit";
import { BLOCKING_STATUSES } from "@/lib/bookings/engine";
import { grantLot } from "@/lib/credits/ledger";

/**
 * Aplica los efectos de negocio de un pago PAID. IDEMPOTENTE:
 * solo actúa en la transición PENDING → PAID; llamadas repetidas
 * (webhook + redirect de confirmación) no duplican efectos.
 */
export async function fulfillPayment(paymentId: string): Promise<{ fulfilled: boolean }> {
  // Transición atómica: solo un caller gana la transición a PAID
  const result = await db.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "PAID", paidAt: new Date() },
  });
  if (result.count === 0) return { fulfilled: false }; // ya procesado o no existe

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });
  if (!payment) return { fulfilled: false };

  const meta = (payment.metadata ?? {}) as Record<string, string>;
  const firstName = payment.user.name.split(" ")[0] ?? payment.user.name;
  // Camino en que el pago llegó pero no hay reserva utilizable (la liberó el job
  // y el slot ya se ocupó): se marca para reembolso y se omite el email de éxito.
  let needsRefund = false;

  switch (payment.kind) {
    case "MEMBERSHIP": {
      const planCode = meta.planCode;
      const isFounder = meta.founder === "1";
      const plan = await db.membershipPlan.findUnique({ where: { code: planCode } });
      const profile = await db.practitionerProfile.findUnique({
        where: { userId: payment.userId },
        include: { wallet: true, membership: true },
      });
      if (!plan || !profile) break;

      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await db.$transaction(async (tx) => {
        if (profile.membership) {
          await tx.practitionerMembership.update({
            where: { id: profile.membership.id },
            data: {
              planId: plan.id,
              status: "ACTIVE",
              isFounder,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
              cancelAtPeriodEnd: false,
              pausedAt: null,
              cancelledAt: null,
            },
          });
        } else {
          await tx.practitionerMembership.create({
            data: {
              practitionerId: profile.id,
              planId: plan.id,
              status: "ACTIVE",
              isFounder,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          });
        }

        // Otorga créditos incluidos como lote de membresía (vence al fin del periodo)
        if (plan.includedCredits > 0) {
          const wallet =
            profile.wallet ??
            (await tx.creditWallet.create({ data: { practitionerId: profile.id } }));
          const membership = await tx.practitionerMembership.findUnique({
            where: { practitionerId: profile.id },
          });
          const balanceAfter = await grantLot(tx, {
            walletId: wallet.id,
            source: "MEMBERSHIP_GRANT",
            amount: plan.includedCredits,
            now: new Date(),
            expiresAt: periodEnd,
            membershipId: membership?.id,
            note: `Alta de membresía ${plan.name}${isFounder ? " (founder)" : ""}`,
          });
          await tx.creditTransaction.create({
            data: {
              walletId: wallet.id,
              type: "MEMBERSHIP_GRANT",
              amount: plan.includedCredits,
              balanceAfter,
              membershipId: membership?.id,
              note: `Alta de membresía ${plan.name}${isFounder ? " (founder)" : ""}`,
              expiresAt: periodEnd,
            },
          });
        }

        // Sube el tier del micrositio según el plan
        await tx.microsite.updateMany({
          where: { practitionerId: profile.id },
          data: { tier: plan.micrositeTier },
        });
      });

      await sendEmailSafe({
        to: payment.user.email,
        ...emailTemplates.membershipActivated(
          firstName,
          plan.name,
          formatCredits(plan.includedCredits)
        ),
      });
      break;
    }

    case "PACKAGE": {
      const packageCode = meta.packageCode;
      const pkg = await db.hourPackage.findUnique({ where: { code: packageCode } });
      const profile = await db.practitionerProfile.findUnique({
        where: { userId: payment.userId },
        include: { wallet: true },
      });
      if (!pkg || !profile) break;

      const now = new Date();
      const expiresAt = new Date(now.getTime() + pkg.validityDays * 24 * 3600_000);

      await db.$transaction(async (tx) => {
        const wallet =
          profile.wallet ??
          (await tx.creditWallet.create({ data: { practitionerId: profile.id } }));
        const purchase = await tx.packagePurchase.create({
          data: {
            practitionerId: profile.id,
            packageId: pkg.id,
            paymentId: payment.id,
            creditsGranted: pkg.hours,
            expiresAt,
          },
        });
        const balanceAfter = await grantLot(tx, {
          walletId: wallet.id,
          source: "PACKAGE_PURCHASE",
          amount: pkg.hours,
          now,
          expiresAt,
          purchaseId: purchase.id,
          note: `Paquete ${pkg.name}`,
        });
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "PACKAGE_PURCHASE",
            amount: pkg.hours,
            balanceAfter,
            purchaseId: purchase.id,
            note: `Paquete ${pkg.name}`,
            expiresAt,
          },
        });
      });

      const wallet = await db.creditWallet.findUnique({
        where: { practitionerId: profile.id },
      });
      await sendEmailSafe({
        to: payment.user.email,
        ...emailTemplates.creditsLoaded(
          firstName,
          formatCredits(pkg.hours),
          formatCredits(wallet?.balance ?? pkg.hours)
        ),
      });
      break;
    }

    case "BOOKING": {
      const bookingId = meta.bookingId;
      if (!bookingId) break;
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { room: true, location: true },
      });
      if (!booking) break;

      if (booking.status === "PENDING_PAYMENT") {
        const updated = await db.booking.update({
          where: { id: bookingId },
          data: {
            status: "CONFIRMED",
            paymentId: payment.id,
            accessCode: generateAccessCode(),
          },
        });

        await sendEmailSafe({
          to: payment.user.email,
          ...emailTemplates.bookingConfirmed(
            firstName,
            booking.room?.name ?? "Sala",
            formatDateTimeMX(booking.startsAt, booking.location.timezone),
            updated.accessCode ?? ""
          ),
        });
        break;
      }

      // El job releaseUnpaidBookings liberó la reserva antes de que llegara el
      // pago (típicamente CANCELLED). Intentamos re-confirmarla si el slot sigue
      // libre; si ya está ocupado, marcamos el pago para reembolso.
      const reconfirmed = await tryReconfirmReleasedBooking(booking.id, payment.id);
      if (reconfirmed) {
        const fresh = await db.booking.findUnique({
          where: { id: bookingId },
          select: { accessCode: true },
        });
        await sendEmailSafe({
          to: payment.user.email,
          ...emailTemplates.bookingConfirmed(
            firstName,
            booking.room?.name ?? "Sala",
            formatDateTimeMX(booking.startsAt, booking.location.timezone),
            fresh?.accessCode ?? ""
          ),
        });
        break;
      }

      // Slot ya no disponible: el pago quedó sin reserva → reembolso.
      needsRefund = true;
      await audit({
        actorId: payment.userId,
        action: "payment.needs_refund",
        entity: "Payment",
        entityId: payment.id,
        data: {
          reason: "booking_released_and_slot_taken",
          bookingId: booking.id,
          amountCents: payment.amountCents,
        },
      });
      break;
    }

    default:
      break;
  }

  // En el camino "needs refund" (pago sin reserva utilizable) no enviamos el
  // email genérico de pago exitoso: sería engañoso.
  if (!needsRefund) {
    await sendEmailSafe({
      to: payment.user.email,
      ...emailTemplates.paymentSucceeded(
        firstName,
        payment.description ?? "The Practice",
        formatMXN(payment.amountCents)
      ),
    });
  }

  await audit({
    actorId: payment.userId,
    action: "payment.fulfilled",
    entity: "Payment",
    entityId: payment.id,
    data: { kind: payment.kind, amountCents: payment.amountCents },
  });

  return { fulfilled: true };
}

/**
 * Reintenta confirmar una reserva que el job liberó justo antes de que llegara
 * el pago. Toma el advisory lock por sala y verifica solapamiento igual que el
 * motor de reservas (createRoomBooking): si el slot sigue libre re-confirma y
 * enlaza el pago; si ya está ocupado devuelve false para que el caller gestione
 * el reembolso. Idempotente: si la reserva ya volvió a CONFIRMED, no la duplica.
 */
async function tryReconfirmReleasedBooking(
  bookingId: string,
  paymentId: string
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        roomId: true,
        status: true,
        startsAt: true,
        endsAt: true,
        accessCode: true,
      },
    });
    if (!booking || !booking.roomId) return false;

    // Ya reconfirmada por una llamada previa (webhook + redirect): éxito idempotente.
    if (booking.status === "CONFIRMED") return true;
    // Solo re-confirmamos reservas que el job liberó (CANCELLED). Estados como
    // NO_SHOW/COMPLETED/ADMIN_BLOCKED no deben resucitarse por un pago tardío.
    if (booking.status !== "CANCELLED") return false;

    // Serializa contra createRoomBooking sobre la misma sala.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.roomId}))`;

    const conflict = await tx.booking.findFirst({
      where: {
        roomId: booking.roomId,
        id: { not: booking.id },
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: booking.endsAt },
        endsAt: { gt: booking.startsAt },
      },
      select: { id: true },
    });
    if (conflict) return false;

    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: "CONFIRMED",
        paymentId,
        cancellationReason: null,
        cancelledAt: null,
        accessCode: booking.accessCode ?? generateAccessCode(),
      },
    });
    return true;
  });
}

/** Marca un pago como fallido (webhook o confirmación fallida). */
export async function failPayment(paymentId: string) {
  const result = await db.payment.updateMany({
    where: { id: paymentId, status: "PENDING" },
    data: { status: "FAILED" },
  });
  if (result.count === 0) return;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { user: true },
  });
  if (!payment) return;

  await sendEmailSafe({
    to: payment.user.email,
    ...emailTemplates.paymentFailed(
      payment.user.name.split(" ")[0] ?? payment.user.name,
      payment.description ?? "The Practice"
    ),
  });
}
