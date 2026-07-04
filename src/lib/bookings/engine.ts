import { TZDate } from "@date-fns/tz";
import type { Booking, BookingStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { generateAccessCode, generateBookingCode, MX_TZ } from "@/lib/utils";
import { audit } from "@/lib/audit";

/**
 * Motor de reservas.
 *
 * Anti doble-reserva en serverless: dentro de una transacción tomamos un
 * advisory lock de Postgres por sala (pg_advisory_xact_lock). Dos funciones
 * concurrentes que intentan reservar la misma sala se serializan en la DB,
 * el check de overlap corre en serie y solo una gana. El lock se libera
 * automáticamente al terminar la transacción.
 */

/** Estados que ocupan la sala (bloquean otros bookings). */
export const BLOCKING_STATUSES: BookingStatus[] = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
  "ADMIN_BLOCKED",
];

export class BookingError extends Error {
  constructor(
    message: string,
    public code:
      | "SLOT_TAKEN"
      | "INSUFFICIENT_CREDITS"
      | "INVALID_SLOT"
      | "OUT_OF_HOURS"
      | "TOO_LATE"
      | "NOT_FOUND"
      | "FORBIDDEN"
  ) {
    super(message);
  }
}

/** Convierte fecha local de la ubicación (YYYY-MM-DD + hora) a instante UTC. */
export function zonedInstant(dateStr: string, hour: number, timezone: string = MX_TZ): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || d === undefined) throw new BookingError("Fecha inválida", "INVALID_SLOT");
  const tz = new TZDate(y, m - 1, d, hour, 0, 0, timezone);
  return new Date(tz.getTime());
}

export interface DayGridRoom {
  roomId: string;
  takenHours: number[];
}

/** Grid de ocupación por sala para un día (en TZ de la ubicación). */
export async function getDayGrid(params: {
  roomIds: string[];
  dateStr: string;
  timezone: string;
  openingHour: number;
  closingHour: number;
}): Promise<DayGridRoom[]> {
  const dayStart = zonedInstant(params.dateStr, params.openingHour, params.timezone);
  const dayEnd = zonedInstant(params.dateStr, params.closingHour, params.timezone);

  const bookings = await db.booking.findMany({
    where: {
      roomId: { in: params.roomIds },
      status: { in: BLOCKING_STATUSES },
      startsAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { roomId: true, startsAt: true, endsAt: true },
  });

  return params.roomIds.map((roomId) => {
    const taken = new Set<number>();
    for (const b of bookings.filter((x) => x.roomId === roomId)) {
      for (let h = params.openingHour; h < params.closingHour; h++) {
        const slotStart = zonedInstant(params.dateStr, h, params.timezone);
        const slotEnd = zonedInstant(params.dateStr, h + 1, params.timezone);
        if (b.startsAt < slotEnd && b.endsAt > slotStart) taken.add(h);
      }
    }
    return { roomId, takenHours: [...taken].sort((a, b) => a - b) };
  });
}

export interface CreateRoomBookingParams {
  roomId: string;
  practitionerId: string;
  createdById: string;
  dateStr: string; // fecha local de la ubicación
  startHour: number;
  hours: number; // duración en horas enteras
  payWith: "credits" | "card";
  notes?: string;
}

export interface CreateBookingResult {
  booking: Booking;
  /** Si payWith=card: monto a cobrar; el caller crea el checkout. */
  amountCents?: number;
}

export async function createRoomBooking(
  params: CreateRoomBookingParams
): Promise<CreateBookingResult> {
  if (params.hours < 1 || params.hours > 8 || !Number.isInteger(params.hours)) {
    throw new BookingError("Duración inválida (1–8 horas)", "INVALID_SLOT");
  }

  const room = await db.room.findUnique({
    where: { id: params.roomId },
    include: { roomType: true, location: true },
  });
  if (!room || !room.active) throw new BookingError("Sala no encontrada", "NOT_FOUND");

  const { location, roomType } = room;
  if (
    params.startHour < location.openingHour ||
    params.startHour + params.hours > location.closingHour
  ) {
    throw new BookingError(
      `Horario fuera de operación (${location.openingHour}:00–${location.closingHour}:00)`,
      "OUT_OF_HOURS"
    );
  }

  const startsAt = zonedInstant(params.dateStr, params.startHour, location.timezone);
  const endsAt = zonedInstant(params.dateStr, params.startHour + params.hours, location.timezone);

  const minAdvance = await getSetting("booking.min_advance_minutes", location.id);
  if (startsAt.getTime() - Date.now() < minAdvance * 60_000) {
    throw new BookingError(
      `Las reservas requieren al menos ${minAdvance} minutos de anticipación`,
      "TOO_LATE"
    );
  }
  const maxDays = await getSetting("booking.max_days_ahead", location.id);
  if (startsAt.getTime() - Date.now() > maxDays * 24 * 3600_000) {
    throw new BookingError(`Solo puedes reservar hasta ${maxDays} días adelante`, "INVALID_SLOT");
  }

  const practitioner = await db.practitionerProfile.findUnique({
    where: { id: params.practitionerId },
    include: { wallet: true, membership: { include: { plan: true } }, user: true },
  });
  if (!practitioner) throw new BookingError("Practitioner no encontrado", "NOT_FOUND");
  if (practitioner.verificationStatus !== "APPROVED") {
    throw new BookingError("Tu perfil aún no está aprobado", "FORBIDDEN");
  }

  const creditsNeeded = roomType.creditsPerHour * params.hours;
  const hasMembership = practitioner.membership?.status === "ACTIVE";
  const hourlyPrice =
    room.hourlyPriceCentsOverride ??
    (hasMembership && roomType.memberHourlyPriceCents != null
      ? roomType.memberHourlyPriceCents
      : roomType.baseHourlyPriceCents);
  const amountCents = hourlyPrice * params.hours;

  const booking = await db.$transaction(
    async (tx) => {
      // Serializa reservas concurrentes de la misma sala
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.roomId}))`;

      const conflict = await tx.booking.findFirst({
        where: {
          roomId: params.roomId,
          status: { in: BLOCKING_STATUSES },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
        select: { id: true },
      });
      if (conflict) {
        throw new BookingError("Ese horario acaba de ocuparse", "SLOT_TAKEN");
      }

      if (params.payWith === "credits") {
        const wallet = practitioner.wallet;
        if (!wallet || wallet.balance < creditsNeeded) {
          throw new BookingError(
            `Necesitas ${creditsNeeded} créditos (tienes ${wallet?.balance ?? 0})`,
            "INSUFFICIENT_CREDITS"
          );
        }

        const created = await tx.booking.create({
          data: {
            code: generateBookingCode(),
            kind: "ROOM_RENTAL",
            status: "CONFIRMED",
            locationId: location.id,
            roomId: room.id,
            practitionerId: practitioner.id,
            createdById: params.createdById,
            startsAt,
            endsAt,
            creditsUsed: creditsNeeded,
            accessCode: generateAccessCode(),
            notes: params.notes,
          },
        });

        const updatedWallet = await tx.creditWallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: creditsNeeded } },
        });
        await tx.creditTransaction.create({
          data: {
            walletId: wallet.id,
            type: "BOOKING_CONSUMPTION",
            amount: -creditsNeeded,
            balanceAfter: updatedWallet.balance,
            bookingId: created.id,
            note: `${room.name} · ${params.dateStr} ${params.startHour}:00`,
          },
        });
        return created;
      }

      // payWith === "card": queda pendiente de pago; un job libera si no se paga
      return tx.booking.create({
        data: {
          code: generateBookingCode(),
          kind: "ROOM_RENTAL",
          status: "PENDING_PAYMENT",
          locationId: location.id,
          roomId: room.id,
          practitionerId: practitioner.id,
          createdById: params.createdById,
          startsAt,
          endsAt,
          priceCents: amountCents,
          notes: params.notes,
        },
      });
    },
    { timeout: 15_000 }
  );

  await audit({
    actorId: params.createdById,
    action: "booking.created",
    entity: "Booking",
    entityId: booking.id,
    data: { roomId: room.id, startsAt: startsAt.toISOString(), payWith: params.payWith },
  });

  return {
    booking,
    amountCents: params.payWith === "card" ? amountCents : undefined,
  };
}

export interface CancelResult {
  booking: Booking;
  refundedCredits: number;
  wasLate: boolean;
}

/** Cancela una reserva de sala aplicando la política de cancelación. */
export async function cancelRoomBooking(params: {
  bookingId: string;
  actorId: string;
  isAdmin?: boolean;
  reason?: string;
}): Promise<CancelResult> {
  const booking = await db.booking.findUnique({
    where: { id: params.bookingId },
    include: { practitioner: { include: { wallet: true } } },
  });
  if (!booking) throw new BookingError("Reserva no encontrada", "NOT_FOUND");
  if (!BLOCKING_STATUSES.includes(booking.status) || booking.status === "ADMIN_BLOCKED") {
    throw new BookingError("Esta reserva ya no puede cancelarse", "INVALID_SLOT");
  }

  const windowHours = await getSetting("booking.cancellation_window_hours", booking.locationId);
  const penaltyPct = await getSetting("booking.late_cancel_penalty_pct", booking.locationId);
  const hoursUntil = (booking.startsAt.getTime() - Date.now()) / 3600_000;
  // Admin cancela sin penalización; el practitioner según ventana
  const isLate = !params.isAdmin && hoursUntil < windowHours;

  const creditsToRefund =
    booking.creditsUsed != null
      ? isLate
        ? booking.creditsUsed * (1 - penaltyPct / 100)
        : booking.creditsUsed
      : 0;

  const updated = await db.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: isLate ? "LATE_CANCELLED" : "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: params.reason,
      },
    });

    const wallet = booking.practitioner?.wallet;
    if (wallet && creditsToRefund > 0) {
      const w = await tx.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: creditsToRefund } },
      });
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: "REFUND",
          amount: creditsToRefund,
          balanceAfter: w.balance,
          bookingId: booking.id,
          note: isLate
            ? `Cancelación tardía: reembolso parcial (${100 - penaltyPct}%)`
            : "Cancelación dentro de la ventana",
        },
      });
    } else if (wallet && booking.creditsUsed && creditsToRefund === 0) {
      await tx.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CANCELLATION_PENALTY",
          amount: 0,
          balanceAfter: wallet.balance,
          bookingId: booking.id,
          note: "Cancelación tardía: créditos no reembolsados",
        },
      });
    }
    return b;
  });

  await audit({
    actorId: params.actorId,
    action: params.isAdmin ? "booking.cancelled_by_admin" : "booking.cancelled",
    entity: "Booking",
    entityId: booking.id,
    data: { isLate, creditsToRefund },
  });

  return { booking: updated, refundedCredits: creditsToRefund, wasLate: isLate };
}

/** Check-in digital: activa el registro de entrada. */
export async function checkInBooking(bookingId: string, actorId: string): Promise<Booking> {
  const booking = await db.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new BookingError("Reserva no encontrada", "NOT_FOUND");
  if (booking.status !== "CONFIRMED") {
    throw new BookingError("Solo reservas confirmadas pueden hacer check-in", "INVALID_SLOT");
  }
  // Ventana: desde 15 min antes del inicio hasta el final
  const now = Date.now();
  if (now < booking.startsAt.getTime() - 15 * 60_000 || now > booking.endsAt.getTime()) {
    throw new BookingError("Fuera de la ventana de check-in", "TOO_LATE");
  }
  const updated = await db.booking.update({
    where: { id: bookingId },
    data: { status: "CHECKED_IN", checkedInAt: new Date() },
  });
  await audit({ actorId, action: "booking.checked_in", entity: "Booking", entityId: bookingId });
  return updated;
}

/** Bloqueo administrativo de sala (mantenimiento, evento, etc.). */
export async function createAdminBlock(params: {
  roomId: string;
  createdById: string;
  dateStr: string;
  startHour: number;
  hours: number;
  reason?: string;
}): Promise<Booking> {
  const room = await db.room.findUnique({
    where: { id: params.roomId },
    include: { location: true },
  });
  if (!room) throw new BookingError("Sala no encontrada", "NOT_FOUND");

  const startsAt = zonedInstant(params.dateStr, params.startHour, room.location.timezone);
  const endsAt = zonedInstant(
    params.dateStr,
    params.startHour + params.hours,
    room.location.timezone
  );

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${params.roomId}))`;
    const conflict = await tx.booking.findFirst({
      where: {
        roomId: params.roomId,
        status: { in: BLOCKING_STATUSES },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    });
    if (conflict) throw new BookingError("Hay una reserva activa en ese horario", "SLOT_TAKEN");

    return tx.booking.create({
      data: {
        code: generateBookingCode(),
        kind: "ADMIN_BLOCK",
        status: "ADMIN_BLOCKED",
        locationId: room.locationId,
        roomId: room.id,
        createdById: params.createdById,
        startsAt,
        endsAt,
        notes: params.reason ?? "Bloqueo administrativo",
      },
    });
  });
}

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { room: { include: { roomType: true } }; location: true };
}>;
