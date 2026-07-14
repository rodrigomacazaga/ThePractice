"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { setSetting, type SettingKey } from "@/lib/settings";
import { cancelRoomBooking, createAdminBlock, BookingError } from "@/lib/bookings/engine";
import { runJob, type JobName, ALL_JOBS } from "@/lib/jobs";

/** Server actions del panel admin. Toda acción sensible queda en AuditLog. */

export async function approvePractitioner(practitionerId: string) {
  const session = await requireAdmin();
  const profile = await db.practitionerProfile.update({
    where: { id: practitionerId },
    data: { verificationStatus: "APPROVED", approvedAt: new Date() },
    include: { user: true },
  });
  await audit({
    actorId: session.user.id,
    action: "practitioner.approved",
    entity: "PractitionerProfile",
    entityId: practitionerId,
  });
  await sendEmailSafe({
    to: profile.user.email,
    ...emailTemplates.practitionerApproved(profile.user.name.split(" ")[0] ?? profile.user.name),
  });
  revalidatePath("/admin/practitioners");
  revalidatePath("/directory");
  return { ok: true };
}

export async function rejectPractitioner(practitionerId: string) {
  const session = await requireAdmin();
  await db.practitionerProfile.update({
    where: { id: practitionerId },
    data: { verificationStatus: "REJECTED" },
  });
  await audit({
    actorId: session.user.id,
    action: "practitioner.rejected",
    entity: "PractitionerProfile",
    entityId: practitionerId,
  });
  revalidatePath("/admin/practitioners");
  return { ok: true };
}

export async function toggleFeatured(practitionerId: string) {
  const session = await requireAdmin();
  const profile = await db.practitionerProfile.findUnique({ where: { id: practitionerId } });
  if (!profile) return { error: "No encontrado" };
  await db.practitionerProfile.update({
    where: { id: practitionerId },
    data: { featured: !profile.featured },
  });
  await audit({
    actorId: session.user.id,
    action: profile.featured ? "practitioner.unfeatured" : "practitioner.featured",
    entity: "PractitionerProfile",
    entityId: practitionerId,
  });
  revalidatePath("/admin/practitioners");
  revalidatePath("/directory");
  return { ok: true };
}

const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "CALL_SCHEDULED",
  "PAYMENT_LINK_SENT",
  "DEPOSIT_PAID",
  "FOUNDER_RESERVED",
  "CONVERTED",
  "NOT_COMPATIBLE",
  "NOT_INTERESTED",
  "LOST",
]);

export async function updateLead(formData: FormData) {
  const session = await requireAdmin();
  const leadId = String(formData.get("leadId"));
  const status = leadStatusSchema.safeParse(formData.get("status"));
  const depositRaw = formData.get("deposit");
  const notes = formData.get("adminNotes");

  if (!status.success) return { error: "Estado inválido" };

  const deposit =
    depositRaw != null && String(depositRaw).trim() !== ""
      ? Math.round(Number(depositRaw) * 100)
      : undefined;

  await db.lead.update({
    where: { id: leadId },
    data: {
      status: status.data,
      depositCents: Number.isFinite(deposit) ? deposit : undefined,
      adminNotes: notes ? String(notes).slice(0, 2000) : undefined,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "lead.updated",
    entity: "Lead",
    entityId: leadId,
    data: { status: status.data },
  });
  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function reviewDocument(documentId: string, approve: boolean) {
  const session = await requireAdmin();
  await db.document.update({
    where: { id: documentId },
    data: {
      status: approve ? "APPROVED" : "REJECTED",
      reviewedById: session.user.id,
    },
  });
  await audit({
    actorId: session.user.id,
    action: approve ? "document.approved" : "document.rejected",
    entity: "Document",
    entityId: documentId,
  });
  revalidatePath("/admin/practitioners");
  return { ok: true };
}

const planPricingSchema = z.object({
  planId: z.string().min(1),
  monthlyPrice: z.coerce.number().min(0).max(1000000),
  founderPrice: z.coerce.number().min(0).max(1000000).optional(),
  includedCredits: z.coerce.number().min(0).max(500),
});

export async function updatePlanPricing(formData: FormData) {
  const session = await requireAdmin();
  const parsed = planPricingSchema.safeParse({
    planId: formData.get("planId"),
    monthlyPrice: formData.get("monthlyPrice"),
    founderPrice: formData.get("founderPrice") || undefined,
    includedCredits: formData.get("includedCredits"),
  });
  if (!parsed.success) return { error: "Datos inválidos" };

  await db.membershipPlan.update({
    where: { id: parsed.data.planId },
    data: {
      monthlyPriceCents: Math.round(parsed.data.monthlyPrice * 100),
      founderPriceCents:
        parsed.data.founderPrice != null ? Math.round(parsed.data.founderPrice * 100) : null,
      includedCredits: parsed.data.includedCredits,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "plan.pricing_updated",
    entity: "MembershipPlan",
    entityId: parsed.data.planId,
    data: parsed.data,
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/memberships");
  revalidatePath("/la-ceiba");
  return { ok: true };
}

const roomTypePricingSchema = z.object({
  roomTypeId: z.string().min(1),
  basePrice: z.coerce.number().min(0).max(100000),
  memberPrice: z.coerce.number().min(0).max(100000).optional(),
  creditsPerHour: z.coerce.number().min(0.5).max(10),
});

export async function updateRoomTypePricing(formData: FormData) {
  const session = await requireAdmin();
  const parsed = roomTypePricingSchema.safeParse({
    roomTypeId: formData.get("roomTypeId"),
    basePrice: formData.get("basePrice"),
    memberPrice: formData.get("memberPrice") || undefined,
    creditsPerHour: formData.get("creditsPerHour"),
  });
  if (!parsed.success) return { error: "Datos inválidos" };

  await db.roomType.update({
    where: { id: parsed.data.roomTypeId },
    data: {
      baseHourlyPriceCents: Math.round(parsed.data.basePrice * 100),
      memberHourlyPriceCents:
        parsed.data.memberPrice != null ? Math.round(parsed.data.memberPrice * 100) : null,
      creditsPerHour: parsed.data.creditsPerHour,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "roomtype.pricing_updated",
    entity: "RoomType",
    entityId: parsed.data.roomTypeId,
    data: parsed.data,
  });
  revalidatePath("/admin/catalog");
  revalidatePath("/rooms");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function toggleRoomActive(roomId: string) {
  const session = await requireAdmin();
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) return { error: "Sala no encontrada" };
  await db.room.update({ where: { id: roomId }, data: { active: !room.active } });
  await audit({
    actorId: session.user.id,
    action: room.active ? "room.deactivated" : "room.activated",
    entity: "Room",
    entityId: roomId,
  });
  revalidatePath("/admin/rooms");
  return { ok: true };
}

export async function adminCancelBooking(bookingId: string) {
  const session = await requireAdmin();
  try {
    await cancelRoomBooking({
      bookingId,
      actorId: session.user.id,
      isAdmin: true,
      reason: "Cancelada por administración",
    });
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/bookings");
  return { ok: true };
}

const blockSchema = z.object({
  roomId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.coerce.number().int().min(0).max(23),
  hours: z.coerce.number().int().min(1).max(15),
  reason: z.string().max(200).optional(),
});

export async function createBlockAction(formData: FormData) {
  const session = await requireAdmin();
  const parsed = blockSchema.safeParse({
    roomId: formData.get("roomId"),
    date: formData.get("date"),
    startHour: formData.get("startHour"),
    hours: formData.get("hours"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { error: "Datos inválidos" };

  try {
    const { date, ...rest } = parsed.data;
    await createAdminBlock({ ...rest, dateStr: date, createdById: session.user.id });
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/bookings");
  return { ok: true };
}

const creditAdjustSchema = z.object({
  practitionerId: z.string().min(1),
  amount: z.coerce.number().min(-500).max(500),
  note: z.string().min(3).max(200),
});

export async function adjustCredits(formData: FormData) {
  const session = await requireAdmin();
  const parsed = creditAdjustSchema.safeParse({
    practitionerId: formData.get("practitionerId"),
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { error: "Datos inválidos (nota obligatoria)" };
  if (parsed.data.amount === 0) return { error: "El ajuste no puede ser 0" };

  const wallet = await db.creditWallet.upsert({
    where: { practitionerId: parsed.data.practitionerId },
    create: { practitionerId: parsed.data.practitionerId, balance: 0 },
    update: {},
  });

  await db.$transaction(async (tx) => {
    const updated = await tx.creditWallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: parsed.data.amount } },
    });
    await tx.creditTransaction.create({
      data: {
        walletId: wallet.id,
        type: "ADMIN_ADJUSTMENT",
        amount: parsed.data.amount,
        balanceAfter: updated.balance,
        note: parsed.data.note,
      },
    });
  });

  await audit({
    actorId: session.user.id,
    action: "credits.adjusted",
    entity: "CreditWallet",
    entityId: wallet.id,
    data: { amount: parsed.data.amount, note: parsed.data.note },
  });
  revalidatePath("/admin/practitioners");
  return { ok: true };
}

export async function updateBookingSettings(formData: FormData) {
  const session = await requireAdmin();
  const keys: SettingKey[] = [
    "booking.cancellation_window_hours",
    "booking.late_cancel_penalty_pct",
    "booking.no_show_penalty_pct",
    "booking.min_advance_minutes",
    "booking.max_days_ahead",
  ];
  for (const key of keys) {
    const raw = formData.get(key);
    if (raw == null || String(raw).trim() === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return { error: `Valor inválido para ${key}` };
    await setSetting(key, value);
  }
  await audit({
    actorId: session.user.id,
    action: "settings.updated",
    entity: "Setting",
    data: { keys },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function runJobAction(job: string) {
  const session = await requireAdmin();
  if (!ALL_JOBS.includes(job as JobName)) return { error: "Job desconocido" };
  const result = await runJob(job as JobName);
  await audit({
    actorId: session.user.id,
    action: "job.ran",
    entity: "Job",
    entityId: job,
    data: { processed: result.processed },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
