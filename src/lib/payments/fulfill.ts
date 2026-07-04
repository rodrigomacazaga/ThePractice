import { db } from "@/lib/db";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { formatMXN, formatCredits, formatDateTimeMX, generateAccessCode } from "@/lib/utils";
import { audit } from "@/lib/audit";

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

        // Otorga créditos incluidos
        if (plan.includedCredits > 0) {
          const wallet =
            profile.wallet ??
            (await tx.creditWallet.create({ data: { practitionerId: profile.id } }));
          const updated = await tx.creditWallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: plan.includedCredits } },
          });
          const membership = await tx.practitionerMembership.findUnique({
            where: { practitionerId: profile.id },
          });
          await tx.creditTransaction.create({
            data: {
              walletId: wallet.id,
              type: "MEMBERSHIP_GRANT",
              amount: plan.includedCredits,
              balanceAfter: updated.balance,
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

      const expiresAt = new Date(Date.now() + pkg.validityDays * 24 * 3600_000);

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
        const updated = await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: pkg.hours } },
        });
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "PACKAGE_PURCHASE",
            amount: pkg.hours,
            balanceAfter: updated.balance,
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
      if (!booking || booking.status !== "PENDING_PAYMENT") break;

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

    default:
      break;
  }

  await sendEmailSafe({
    to: payment.user.email,
    ...emailTemplates.paymentSucceeded(
      firstName,
      payment.description ?? "The Practice",
      formatMXN(payment.amountCents)
    ),
  });

  await audit({
    actorId: payment.userId,
    action: "payment.fulfilled",
    entity: "Payment",
    entityId: payment.id,
    data: { kind: payment.kind, amountCents: payment.amountCents },
  });

  return { fulfilled: true };
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
