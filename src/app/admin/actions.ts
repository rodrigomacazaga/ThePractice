"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin, requirePermission } from "@/lib/auth-helpers";
import { isValidPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { setSetting, clearSetting, type SettingKey } from "@/lib/settings";
import { grantLot, consumeCredits, getAvailableCredits } from "@/lib/credits/ledger";
import { cancelRoomBooking, createAdminBlock, BookingError } from "@/lib/bookings/engine";
import { runJob, type JobName, ALL_JOBS } from "@/lib/jobs";

/** Server actions del panel admin. Toda acción sensible queda en AuditLog. */

/**
 * Mensaje de error accionable a partir de un ZodError: usa el mensaje custom
 * del schema si lo hay (ya en español), o nombra el campo que falló. Evita el
 * genérico "Datos inválidos" que no le dice al usuario qué corregir.
 */
function firstError(err: z.ZodError): string {
  const issue = err.issues[0];
  if (!issue) return "Datos inválidos";
  const field = issue.path.join(".");
  const generic = !issue.message || issue.message === "Required" || issue.message.startsWith("Invalid");
  if (generic) return field ? `Revisa el campo "${field}"` : "Datos inválidos";
  return field ? `${field}: ${issue.message}` : issue.message;
}

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
  if (!parsed.success) return { error: firstError(parsed.error) };

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
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  revalidatePath("/l", "layout");
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
  if (!parsed.success) return { error: firstError(parsed.error) };

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
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/locations");
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
  if (!parsed.success) return { error: firstError(parsed.error) };

  // El bloqueo administrativo debe caber en el horario de operación de la
  // sede (createAdminBlock no lo valida). Cargamos la sala con su ubicación.
  const room = await db.room.findUnique({
    where: { id: parsed.data.roomId },
    include: { location: true },
  });
  if (!room) return { error: "Sala no encontrada" };
  const { openingHour, closingHour } = room.location;
  if (parsed.data.startHour < openingHour || parsed.data.startHour + parsed.data.hours > closingHour)
    return {
      error: `Horario fuera de operación (${openingHour}:00–${closingHour}:00)`,
    };

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

  const now = new Date();
  const amount = parsed.data.amount;
  const result = await db.$transaction(async (tx) => {
    if (amount > 0) {
      // Ajuste positivo: lote sin vencimiento.
      const balanceAfter = await grantLot(tx, {
        walletId: wallet.id,
        source: "ADMIN_ADJUSTMENT",
        amount,
        now,
        note: parsed.data.note,
      });
      return { balanceAfter, error: null as string | null };
    }
    // Ajuste negativo: consume FIFO; falla si no hay saldo suficiente.
    const available = await getAvailableCredits(tx, wallet.id, now);
    if (available + 1e-9 < -amount) {
      return { balanceAfter: available, error: "Saldo insuficiente para el ajuste negativo" };
    }
    await consumeCredits(tx, wallet.id, -amount, now);
    const balanceAfter = await getAvailableCredits(tx, wallet.id, now);
    return { balanceAfter, error: null as string | null };
  });
  if (result.error) return { error: result.error };

  await db.creditTransaction.create({
    data: {
      walletId: wallet.id,
      type: "ADMIN_ADJUSTMENT",
      amount,
      balanceAfter: result.balanceAfter,
      note: parsed.data.note,
    },
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

const BOOKING_SETTING_KEYS: SettingKey[] = [
  "booking.cancellation_window_hours",
  "booking.late_cancel_penalty_pct",
  "booking.no_show_penalty_pct",
  "booking.min_advance_minutes",
  "booking.max_days_ahead",
  "booking.pending_payment_hold_minutes",
  "founder.deposit_cents",
  "founder.campaign_ends_ts",
];

/**
 * Guarda reglas operativas. Con `locationId` crea/actualiza el override de esa
 * ubicación; sin él, edita el valor global (heredado por las sedes sin
 * override). Un campo vacío se ignora (no borra el override — para eso está
 * removeSettingOverride).
 */
export async function updateBookingSettings(formData: FormData) {
  const session = await requireAdmin();
  const rawLocation = formData.get("locationId");
  const locationId = rawLocation ? String(rawLocation) : undefined;

  for (const key of BOOKING_SETTING_KEYS) {
    const raw = formData.get(key);
    if (raw == null || String(raw).trim() === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return { error: `Valor inválido para ${key}` };
    await setSetting(key, value, locationId);
  }
  await audit({
    actorId: session.user.id,
    action: "settings.updated",
    entity: "Setting",
    data: { locationId: locationId ?? "global" },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

/** Quita el override de una key en una ubicación: vuelve a heredar el global. */
export async function removeSettingOverride(formData: FormData) {
  const session = await requireAdmin();
  const key = String(formData.get("key"));
  const locationId = String(formData.get("locationId"));
  if (!BOOKING_SETTING_KEYS.includes(key as SettingKey) || !locationId)
    return { error: "Parámetros inválidos" };
  await clearSetting(key, locationId);
  await audit({
    actorId: session.user.id,
    action: "settings.override_removed",
    entity: "Setting",
    data: { key, locationId },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}

// ------------------------------------------------------------
// Planes de membresía: alta, edición y baja
// ------------------------------------------------------------

const planSchema = z.object({
  planId: z.string().optional(),
  code: z
    .string()
    .regex(/^[a-z0-9-]{2,24}$/, "minúsculas, números y guiones")
    .optional(),
  name: z.string().min(2).max(40),
  tagline: z.string().max(120).optional(),
  monthlyPrice: z.coerce.number().min(0).max(1000000).optional(),
  founderPrice: z.coerce.number().min(0).max(1000000).optional(),
  includedCredits: z.coerce.number().min(0).max(500).optional(),
  rolloverLimit: z.coerce.number().min(0).max(500),
  micrositeTier: z.enum(["BASIC", "PRO", "PREMIUM", "FEATURED"]),
  sort: z.coerce.number().int().min(0).max(999),
});

/**
 * Alta y edición de atributos de planes. El código es inmutable tras crear.
 * Precios y créditos incluidos de planes existentes se editan en su
 * formulario dedicado (updatePlanPricing) para no pisarse entre sí.
 */
export async function upsertPlan(formData: FormData) {
  const session = await requireAdmin();
  const parsed = planSchema.safeParse({
    planId: formData.get("planId") || undefined,
    code: formData.get("code") || undefined,
    name: formData.get("name"),
    tagline: formData.get("tagline") || undefined,
    monthlyPrice: formData.get("monthlyPrice") || undefined,
    founderPrice: formData.get("founderPrice") || undefined,
    includedCredits: formData.get("includedCredits") || undefined,
    rolloverLimit: formData.get("rolloverLimit"),
    micrositeTier: formData.get("micrositeTier"),
    sort: formData.get("sort"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { planId, code, monthlyPrice, founderPrice, includedCredits, ...data } = parsed.data;
  const features = parseList(formData.get("features"));
  const flags = {
    highlighted: formData.get("highlighted") === "on",
    includesLocker: formData.get("includesLocker") === "on",
    active: formData.get("active") === "on",
  };
  const common = { ...data, tagline: data.tagline ?? null, features, ...flags };

  let id = planId;
  if (planId) {
    await db.membershipPlan.update({ where: { id: planId }, data: common });
  } else {
    if (!code) return { error: "El código es obligatorio (ej. \"starter\")" };
    if (monthlyPrice == null || includedCredits == null)
      return { error: "Precio mensual y horas incluidas son obligatorios al crear" };
    if (await db.membershipPlan.findUnique({ where: { code } }))
      return { error: `Ya existe un plan con el código "${code}"` };
    const created = await db.membershipPlan.create({
      data: {
        ...common,
        code,
        monthlyPriceCents: Math.round(monthlyPrice * 100),
        founderPriceCents: founderPrice != null ? Math.round(founderPrice * 100) : null,
        includedCredits,
      },
    });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: planId ? "plan.updated" : "plan.created",
    entity: "MembershipPlan",
    entityId: id,
    data: { name: data.name },
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  revalidatePath("/l", "layout");
  revalidatePath("/for-practitioners");
  revalidatePath("/the-practice");
  return { ok: true };
}

/**
 * Baja de plan: hard delete solo si nadie lo ha contratado nunca; si tiene
 * membresías (activas o históricas) se desactiva para preservar el historial
 * de cobros y créditos.
 */
export async function deletePlan(planId: string) {
  const session = await requireAdmin();
  const plan = await db.membershipPlan.findUnique({
    where: { id: planId },
    include: { _count: { select: { memberships: true } } },
  });
  if (!plan) return { error: "Plan no encontrado" };

  if (plan._count.memberships > 0) {
    await db.membershipPlan.update({ where: { id: planId }, data: { active: false } });
    await audit({
      actorId: session.user.id,
      action: "plan.deactivated",
      entity: "MembershipPlan",
      entityId: planId,
      data: { reason: `${plan._count.memberships} membresías existentes` },
    });
  } else {
    await db.membershipPlan.delete({ where: { id: planId } });
    await audit({
      actorId: session.user.id,
      action: "plan.deleted",
      entity: "MembershipPlan",
      entityId: planId,
      data: { name: plan.name },
    });
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  revalidatePath("/l", "layout");
  revalidatePath("/for-practitioners");
  revalidatePath("/the-practice");
  return { ok: true };
}

// ------------------------------------------------------------
// Paquetes de horas y add-ons
// ------------------------------------------------------------

const hourPackageSchema = z.object({
  packageId: z.string().optional(),
  code: z
    .string()
    .regex(/^[a-z0-9-]{2,24}$/, "minúsculas, números y guiones")
    .optional(),
  name: z.string().min(2).max(40),
  hours: z.coerce.number().min(0.5).max(500),
  price: z.coerce.number().min(0).max(1000000),
  validityDays: z.coerce.number().int().min(1).max(365),
  sort: z.coerce.number().int().min(0).max(999),
});

// ------------------------------------------------------------
// Bajas: hard delete si el objeto no tiene historial; si lo tiene, se
// desactiva (o se cierra) para preservar reservas, compras y cobros.
// ------------------------------------------------------------

export async function deleteLocation(locationId: string) {
  const session = await requireAdmin();
  const loc = await db.location.findUnique({
    where: { id: locationId },
    include: { _count: { select: { rooms: true, bookings: true, leads: true } } },
  });
  if (!loc) return { error: "Ubicación no encontrada" };

  const hasHistory =
    loc._count.rooms > 0 || loc._count.bookings > 0 || loc._count.leads > 0;
  if (hasHistory) {
    if (loc.status === "CLOSED")
      return { error: "La ubicación ya está cerrada (tiene salas/reservas/leads, no se puede borrar)" };
    await db.location.update({ where: { id: locationId }, data: { status: "CLOSED" } });
    await audit({
      actorId: session.user.id,
      action: "location.closed",
      entity: "Location",
      entityId: locationId,
      data: { reason: "tiene historial (salas/reservas/leads)" },
    });
  } else {
    await db.location.delete({ where: { id: locationId } });
    await audit({
      actorId: session.user.id,
      action: "location.deleted",
      entity: "Location",
      entityId: locationId,
      data: { name: loc.name },
    });
  }
  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath(`/locations/${loc.slug}`);
  revalidatePath("/the-practice");
  revalidatePath("/l", "layout");
  return { ok: true };
}

export async function deleteRoomType(roomTypeId: string) {
  const session = await requireAdmin();
  const rt = await db.roomType.findUnique({
    where: { id: roomTypeId },
    include: { _count: { select: { rooms: true } } },
  });
  if (!rt) return { error: "Tipo de sala no encontrado" };

  if (rt._count.rooms > 0) {
    if (!rt.active) return { error: "El tipo ya está inactivo" };
    await db.roomType.update({ where: { id: roomTypeId }, data: { active: false } });
    await audit({
      actorId: session.user.id,
      action: "roomtype.deactivated",
      entity: "RoomType",
      entityId: roomTypeId,
      data: { reason: `${rt._count.rooms} salas de este tipo` },
    });
  } else {
    await db.roomType.delete({ where: { id: roomTypeId } });
    await audit({
      actorId: session.user.id,
      action: "roomtype.deleted",
      entity: "RoomType",
      entityId: roomTypeId,
      data: { name: rt.name },
    });
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/locations");
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/l", "layout");
  return { ok: true };
}

export async function deleteRoom(roomId: string) {
  const session = await requireAdmin();
  const room = await db.room.findUnique({
    where: { id: roomId },
    include: { _count: { select: { bookings: true } } },
  });
  if (!room) return { error: "Sala no encontrada" };

  if (room._count.bookings > 0) {
    if (!room.active) return { error: "La sala ya está inactiva" };
    await db.room.update({ where: { id: roomId }, data: { active: false } });
    await audit({
      actorId: session.user.id,
      action: "room.deactivated",
      entity: "Room",
      entityId: roomId,
      data: { reason: `${room._count.bookings} reservas` },
    });
  } else {
    await db.room.delete({ where: { id: roomId } });
    await audit({
      actorId: session.user.id,
      action: "room.deleted",
      entity: "Room",
      entityId: roomId,
      data: { name: room.name },
    });
  }
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/l", "layout");
  return { ok: true };
}

export async function deleteHourPackage(packageId: string) {
  const session = await requireAdmin();
  const pkg = await db.hourPackage.findUnique({
    where: { id: packageId },
    include: { _count: { select: { purchases: true } } },
  });
  if (!pkg) return { error: "Paquete no encontrado" };

  if (pkg._count.purchases > 0) {
    if (!pkg.active) return { error: "El paquete ya está inactivo" };
    await db.hourPackage.update({ where: { id: packageId }, data: { active: false } });
    await audit({
      actorId: session.user.id,
      action: "hourpackage.deactivated",
      entity: "HourPackage",
      entityId: packageId,
      data: { reason: `${pkg._count.purchases} compras` },
    });
  } else {
    await db.hourPackage.delete({ where: { id: packageId } });
    await audit({
      actorId: session.user.id,
      action: "hourpackage.deleted",
      entity: "HourPackage",
      entityId: packageId,
      data: { name: pkg.name },
    });
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function deleteAddOn(addOnId: string) {
  const session = await requireAdmin();
  const addon = await db.addOn.findUnique({
    where: { id: addOnId },
    include: { _count: { select: { practitioners: true } } },
  });
  if (!addon) return { error: "Add-on no encontrado" };

  if (addon._count.practitioners > 0) {
    if (!addon.active) return { error: "El add-on ya está inactivo" };
    await db.addOn.update({ where: { id: addOnId }, data: { active: false } });
    await audit({
      actorId: session.user.id,
      action: "addon.deactivated",
      entity: "AddOn",
      entityId: addOnId,
      data: { reason: `${addon._count.practitioners} practitioners lo tienen` },
    });
  } else {
    await db.addOn.delete({ where: { id: addOnId } });
    await audit({
      actorId: session.user.id,
      action: "addon.deleted",
      entity: "AddOn",
      entityId: addOnId,
      data: { name: addon.name },
    });
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  return { ok: true };
}

/**
 * Alta y edición de paquetes de horas. El código es inmutable tras crear
 * (referencia de compras y cobros). Precio en MXN → centavos.
 */
export async function upsertHourPackage(formData: FormData) {
  const session = await requireAdmin();
  const parsed = hourPackageSchema.safeParse({
    packageId: formData.get("packageId") || undefined,
    code: formData.get("code") || undefined,
    name: formData.get("name"),
    hours: formData.get("hours"),
    price: formData.get("price"),
    validityDays: formData.get("validityDays"),
    sort: formData.get("sort"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { packageId, code, price, ...data } = parsed.data;
  const active = formData.get("active") === "on";
  const common = {
    name: data.name,
    hours: data.hours,
    validityDays: data.validityDays,
    sort: data.sort,
    priceCents: Math.round(price * 100),
    active,
  };

  let id = packageId;
  if (packageId) {
    await db.hourPackage.update({ where: { id: packageId }, data: common });
  } else {
    if (!code) return { error: "El código es obligatorio (ej. \"pack-10\")" };
    if (await db.hourPackage.findUnique({ where: { code } }))
      return { error: `Ya existe un paquete con el código "${code}"` };
    const created = await db.hourPackage.create({ data: { ...common, code } });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: packageId ? "package.updated" : "package.created",
    entity: "HourPackage",
    entityId: id,
    data: { name: data.name },
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  return { ok: true };
}

const addOnSchema = z.object({
  addOnId: z.string().optional(),
  code: z
    .string()
    .regex(/^[a-z0-9-]{2,24}$/, "minúsculas, números y guiones")
    .optional(),
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  price: z.coerce.number().min(0).max(1000000),
  billing: z.enum(["ONE_TIME", "MONTHLY"]),
  sort: z.coerce.number().int().min(0).max(999),
});

/**
 * Alta y edición de add-ons (lockers, equipo, visibilidad). El código es
 * inmutable tras crear. Precio en MXN → centavos.
 */
export async function upsertAddOn(formData: FormData) {
  const session = await requireAdmin();
  const parsed = addOnSchema.safeParse({
    addOnId: formData.get("addOnId") || undefined,
    code: formData.get("code") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    billing: formData.get("billing"),
    sort: formData.get("sort"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { addOnId, code, price, ...data } = parsed.data;
  const active = formData.get("active") === "on";
  const common = {
    name: data.name,
    description: data.description ?? null,
    billing: data.billing,
    sort: data.sort,
    priceCents: Math.round(price * 100),
    active,
  };

  let id = addOnId;
  if (addOnId) {
    await db.addOn.update({ where: { id: addOnId }, data: common });
  } else {
    if (!code) return { error: "El código es obligatorio (ej. \"locker\")" };
    if (await db.addOn.findUnique({ where: { code } }))
      return { error: `Ya existe un add-on con el código "${code}"` };
    const created = await db.addOn.create({ data: { ...common, code } });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: addOnId ? "addon.updated" : "addon.created",
    entity: "AddOn",
    entityId: id,
    data: { name: data.name },
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  return { ok: true };
}

// ------------------------------------------------------------
// Red física: establecimientos, tipos de sala y salas
// ------------------------------------------------------------

/** "a, b, c" → ["a","b","c"] — para amenities, features e idealFor. */
function parseList(raw: FormDataEntryValue | null) {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const locationSchema = z.object({
  locationId: z.string().optional(),
  name: z.string().min(3).max(80),
  shortName: z.string().min(2).max(40),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  address: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(["OPEN", "PRESALE", "COMING_SOON", "CLOSED"]),
  openingHour: z.coerce.number().int().min(0).max(23),
  closingHour: z.coerce.number().int().min(1).max(24),
  sort: z.coerce.number().int().min(0).max(999),
});

/**
 * Alta y edición de establecimientos. El slug se deriva del nombre corto al
 * crear y es inmutable después: es URL pública y referencia de campañas.
 */
export async function upsertLocation(formData: FormData) {
  const session = await requireAdmin();
  const parsed = locationSchema.safeParse({
    locationId: formData.get("locationId") || undefined,
    name: formData.get("name"),
    shortName: formData.get("shortName"),
    city: formData.get("city"),
    state: formData.get("state"),
    address: formData.get("address") || undefined,
    description: formData.get("description") || undefined,
    status: formData.get("status"),
    openingHour: formData.get("openingHour"),
    closingHour: formData.get("closingHour"),
    sort: formData.get("sort"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data.closingHour <= parsed.data.openingHour)
    return { error: "El cierre debe ser posterior a la apertura" };

  const { locationId, ...data } = parsed.data;
  const amenities = parseList(formData.get("amenities"));
  const common = {
    ...data,
    address: data.address ?? null,
    description: data.description ?? null,
    amenities,
  };

  let id = locationId;
  if (locationId) {
    await db.location.update({ where: { id: locationId }, data: common });
  } else {
    const slug = slugify(data.shortName);
    if (await db.location.findUnique({ where: { slug } }))
      return { error: `Ya existe una ubicación con el slug "${slug}"` };
    const created = await db.location.create({ data: { ...common, slug } });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: locationId ? "location.updated" : "location.created",
    entity: "Location",
    entityId: id,
    data: { name: data.name, status: data.status },
  });
  revalidatePath("/admin/locations");
  revalidatePath("/locations");
  revalidatePath("/the-practice");
  revalidatePath("/l", "layout");
  return { ok: true };
}

const roomTypeSchema = z.object({
  roomTypeId: z.string().optional(),
  locationId: z.string().optional(),
  code: z
    .string()
    .regex(/^[a-z0-9-]{2,24}$/, "minúsculas, números y guiones")
    .optional(),
  name: z.string().min(3).max(60),
  description: z.string().max(500).optional(),
  capacity: z.coerce.number().int().min(1).max(30),
  sort: z.coerce.number().int().min(0).max(999),
  basePrice: z.coerce.number().min(0).max(100000).optional(),
  memberPrice: z.coerce.number().min(0).max(100000).optional(),
  creditsPerHour: z.coerce.number().min(0.5).max(10).optional(),
});

/**
 * Alta y edición de tipos de sala. Los tipos viven dentro de cada
 * establecimiento: el código es único por ubicación e inmutable tras crear
 * (los planos SVG lo usan como llave semántica), igual que la ubicación.
 * Los precios de tipos existentes se editan en su formulario dedicado.
 */
export async function upsertRoomType(formData: FormData) {
  const session = await requireAdmin();
  const parsed = roomTypeSchema.safeParse({
    roomTypeId: formData.get("roomTypeId") || undefined,
    locationId: formData.get("locationId") || undefined,
    code: formData.get("code") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    capacity: formData.get("capacity"),
    sort: formData.get("sort"),
    basePrice: formData.get("basePrice") || undefined,
    memberPrice: formData.get("memberPrice") || undefined,
    creditsPerHour: formData.get("creditsPerHour") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { roomTypeId, locationId, code, basePrice, memberPrice, creditsPerHour, ...data } =
    parsed.data;
  const idealFor = parseList(formData.get("idealFor"));
  const features = parseList(formData.get("features"));
  const active = formData.get("active") === "on";
  const common = { ...data, description: data.description ?? null, idealFor, features, active };

  let id = roomTypeId;
  if (roomTypeId) {
    await db.roomType.update({ where: { id: roomTypeId }, data: common });
  } else {
    if (!locationId) return { error: "Falta la ubicación" };
    if (!code) return { error: "El código es obligatorio (ej. \"focus\")" };
    if (basePrice == null || creditsPerHour == null)
      return { error: "Precio base y créditos/hora son obligatorios al crear" };
    const location = await db.location.findUnique({ where: { id: locationId } });
    if (!location) return { error: "Ubicación inválida" };
    if (await db.roomType.findUnique({ where: { locationId_code: { locationId, code } } }))
      return { error: `Ya existe un tipo "${code}" en ${location.shortName}` };
    const created = await db.roomType.create({
      data: {
        ...common,
        locationId,
        code,
        baseHourlyPriceCents: Math.round(basePrice * 100),
        memberHourlyPriceCents: memberPrice != null ? Math.round(memberPrice * 100) : null,
        creditsPerHour,
      },
    });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: roomTypeId ? "roomtype.updated" : "roomtype.created",
    entity: "RoomType",
    entityId: id,
    data: { name: data.name },
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/locations");
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/memberships");
  revalidatePath("/l", "layout");
  revalidatePath("/the-practice");
  return { ok: true };
}

const roomSchema = z.object({
  roomId: z.string().optional(),
  locationId: z.string().min(1),
  roomTypeId: z.string().min(1),
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  priceOverride: z.coerce.number().min(0).max(100000).optional(),
  widthMeters: z.coerce.number().min(0.5).max(50).optional(),
  lengthMeters: z.coerce.number().min(0.5).max(50).optional(),
});

/**
 * Alta y edición de salas asignadas a un establecimiento. El slug se deriva
 * del nombre al crear; la ubicación no se cambia al editar (una sala física
 * no cambia de edificio — se desactiva y se crea en la nueva ubicación).
 */
export async function upsertRoom(formData: FormData) {
  const session = await requireAdmin();
  const parsed = roomSchema.safeParse({
    roomId: formData.get("roomId") || undefined,
    locationId: formData.get("locationId"),
    roomTypeId: formData.get("roomTypeId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    priceOverride: formData.get("priceOverride") || undefined,
    widthMeters: formData.get("widthMeters") || undefined,
    lengthMeters: formData.get("lengthMeters") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { roomId, priceOverride, widthMeters, lengthMeters, ...data } = parsed.data;
  const amenities = parseList(formData.get("amenities"));
  const hourlyPriceCentsOverride = priceOverride != null ? Math.round(priceOverride * 100) : null;
  const size = { widthMeters: widthMeters ?? null, lengthMeters: lengthMeters ?? null };

  const roomType = await db.roomType.findUnique({ where: { id: data.roomTypeId } });
  if (!roomType) return { error: "Tipo de sala inválido" };

  let id = roomId;
  let locationShortName: string;
  if (roomId) {
    // Al editar, la ubicación es la REAL de la sala (nunca la del form: una
    // sala física no cambia de edificio). El tipo debe pertenecer a ella.
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: { location: true },
    });
    if (!room) return { error: "Sala no encontrada" };
    if (roomType.locationId !== room.locationId)
      return { error: `El tipo "${roomType.name}" pertenece a otra ubicación` };
    locationShortName = room.location.shortName;
    await db.room.update({
      where: { id: roomId },
      data: {
        roomTypeId: data.roomTypeId,
        name: data.name,
        description: data.description ?? null,
        amenities,
        hourlyPriceCentsOverride,
        ...size,
      },
    });
  } else {
    const location = await db.location.findUnique({ where: { id: data.locationId } });
    if (!location) return { error: "Ubicación inválida" };
    if (roomType.locationId !== location.id)
      return { error: `El tipo "${roomType.name}" pertenece a otra ubicación` };
    locationShortName = location.shortName;
    const slug = slugify(data.name);
    const dup = await db.room.findUnique({
      where: { locationId_slug: { locationId: data.locationId, slug } },
    });
    if (dup) return { error: `Ya existe una sala "${slug}" en ${location.shortName}` };
    const created = await db.room.create({
      data: {
        ...data,
        ...size,
        description: data.description ?? null,
        slug,
        amenities,
        hourlyPriceCentsOverride,
      },
    });
    id = created.id;
  }
  await audit({
    actorId: session.user.id,
    action: roomId ? "room.updated" : "room.created",
    entity: "Room",
    entityId: id,
    data: { name: data.name, location: locationShortName, type: roomType.code },
  });
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/l", "layout");
  return { ok: true };
}

// ------------------------------------------------------------
// Cuentas: practitioners y clientes
// ------------------------------------------------------------

const practitionerProfileSchema = z.object({
  practitionerId: z.string().min(1),
  name: z.string().min(2).max(80),
  headline: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  specialties: z.string().max(300).optional(),
});

/**
 * Edición administrativa del perfil de un practitioner: nombre y teléfono
 * viven en User; headline y especialidades en PractitionerProfile.
 */
export async function updatePractitionerProfile(formData: FormData) {
  const session = await requireAdmin();
  const parsed = practitionerProfileSchema.safeParse({
    practitionerId: formData.get("practitionerId"),
    name: formData.get("name"),
    headline: formData.get("headline") || undefined,
    phone: formData.get("phone") || undefined,
    specialties: formData.get("specialties") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const profile = await db.practitionerProfile.findUnique({
    where: { id: parsed.data.practitionerId },
  });
  if (!profile) return { error: "Practitioner no encontrado" };

  await db.$transaction([
    db.user.update({
      where: { id: profile.userId },
      data: { name: parsed.data.name, phone: parsed.data.phone ?? null },
    }),
    db.practitionerProfile.update({
      where: { id: parsed.data.practitionerId },
      data: {
        headline: parsed.data.headline ?? null,
        specialties: parseList(parsed.data.specialties ?? null),
      },
    }),
  ]);
  await audit({
    actorId: session.user.id,
    action: "practitioner.profile_updated",
    entity: "PractitionerProfile",
    entityId: parsed.data.practitionerId,
    data: { name: parsed.data.name },
  });
  revalidatePath("/admin/practitioners");
  revalidatePath("/directory");
  return { ok: true };
}

/**
 * Activa/desactiva una cuenta de usuario. Una cuenta inactiva no puede
 * iniciar sesión (auth.ts exige User.active), así que esto corta el acceso.
 */
export async function toggleUserActive(userId: string) {
  const session = await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Usuario no encontrado" };
  if (user.id === session.user.id) return { error: "No puedes desactivar tu propia cuenta" };

  await db.user.update({ where: { id: userId }, data: { active: !user.active } });
  await audit({
    actorId: session.user.id,
    action: user.active ? "user.deactivated" : "user.reactivated",
    entity: "User",
    entityId: userId,
    data: { email: user.email },
  });
  revalidatePath("/admin/practitioners");
  revalidatePath("/admin/clients");
  revalidatePath("/directory");
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
  return { ok: true, message: `${result.processed} procesados` };
}

// ============================================================
// Costos, equipo y flexibilidad de precios
// Sin captura, los modelos nuevos no sirven de nada: estas acciones son
// lo que permite que el margen y las alertas dejen de estar vacíos.
// ============================================================

const expenseSchema = z.object({
  expenseId: z.string().optional(),
  locationId: z.string().optional(), // vacío = gasto corporativo
  kind: z.enum(["FIXED", "VARIABLE"]),
  category: z.enum([
    "RENT",
    "UTILITIES",
    "PAYROLL",
    "MAINTENANCE",
    "CLEANING",
    "SUPPLIES",
    "MARKETING",
    "SOFTWARE",
    "INSURANCE",
    "TAXES",
    "OTHER",
  ]),
  recurrence: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]),
  concept: z.string().min(2, "Describe el gasto").max(160),
  amount: z.coerce.number().min(0).max(10_000_000),
  vendor: z.string().max(160).optional(),
  incurredAt: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export async function upsertExpense(formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const parsed = expenseSchema.safeParse({
    expenseId: formData.get("expenseId") || undefined,
    locationId: formData.get("locationId") || undefined,
    kind: formData.get("kind"),
    category: formData.get("category"),
    recurrence: formData.get("recurrence"),
    concept: formData.get("concept"),
    amount: formData.get("amount"),
    vendor: formData.get("vendor") || undefined,
    incurredAt: formData.get("incurredAt") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const data = {
    locationId: d.locationId ?? null,
    category: d.category,
    recurrence: d.recurrence,
    kind: d.kind,
    concept: d.concept,
    amountCents: Math.round(d.amount * 100),
    vendor: d.vendor ?? null,
    // Los gastos únicos necesitan fecha para caer en el periodo correcto.
    incurredAt:
      d.recurrence === "ONE_TIME" ? (d.incurredAt ? new Date(d.incurredAt) : new Date()) : null,
    notes: d.notes ?? null,
  };

  const expense = d.expenseId
    ? await db.expense.update({ where: { id: d.expenseId }, data })
    // El autor queda solo al crear: editar no cambia quién lo registró.
    : await db.expense.create({ data: { ...data, createdById: session.user.id } });

  await audit({
    actorId: session.user.id,
    action: d.expenseId ? "expense.updated" : "expense.created",
    entity: "Expense",
    entityId: expense.id,
    data: { concept: d.concept, amountCents: data.amountCents },
  });
  revalidatePath("/admin/overview");
  revalidatePath("/admin/costs");
  if (d.locationId) revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteExpense(expenseId: string) {
  const session = await requirePermission("expenses.delete");
  await db.expense.delete({ where: { id: expenseId } });
  await audit({
    actorId: session.user.id,
    action: "expense.deleted",
    entity: "Expense",
    entityId: expenseId,
  });
  revalidatePath("/admin/costs");
  revalidatePath("/admin/overview");
  return { ok: true };
}

const employeeSchema = z.object({
  employeeId: z.string().optional(),
  locationId: z.string().min(1, "Elige la ubicación"),
  name: z.string().min(2, "Escribe el nombre").max(120),
  position: z.string().min(2, "Escribe el puesto").max(120),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(30).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACTOR"]),
  status: z.enum(["ACTIVE", "ON_LEAVE", "TERMINATED"]),
  monthlySalary: z.coerce.number().min(0).max(10_000_000).optional(),
  startedAt: z.string().min(1, "Indica la fecha de ingreso"),
  notes: z.string().max(1000).optional(),
});

export async function upsertEmployee(formData: FormData) {
  const session = await requireAdmin();
  const parsed = employeeSchema.safeParse({
    employeeId: formData.get("employeeId") || undefined,
    locationId: formData.get("locationId"),
    name: formData.get("name"),
    position: formData.get("position"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    employmentType: formData.get("employmentType"),
    status: formData.get("status"),
    monthlySalary: formData.get("monthlySalary") || undefined,
    startedAt: formData.get("startedAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const data = {
    locationId: d.locationId,
    name: d.name,
    position: d.position,
    email: d.email || null,
    phone: d.phone ?? null,
    employmentType: d.employmentType,
    status: d.status,
    monthlySalaryCents: d.monthlySalary != null ? Math.round(d.monthlySalary * 100) : null,
    startedAt: new Date(d.startedAt),
    endedAt: d.status === "TERMINATED" ? new Date() : null,
    notes: d.notes ?? null,
  };

  const employee = d.employeeId
    ? await db.employee.update({ where: { id: d.employeeId }, data })
    : await db.employee.create({ data });

  await audit({
    actorId: session.user.id,
    action: d.employeeId ? "employee.updated" : "employee.created",
    entity: "Employee",
    entityId: employee.id,
    data: { name: d.name, position: d.position },
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteEmployee(employeeId: string) {
  const session = await requireAdmin();
  await db.employee.delete({ where: { id: employeeId } });
  await audit({
    actorId: session.user.id,
    action: "employee.deleted",
    entity: "Employee",
    entityId: employeeId,
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}

const employeeDocSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum([
    "CONTRACT",
    "ID",
    "TAX_ID",
    "SOCIAL_SECURITY",
    "BANK_DETAILS",
    "MEDICAL_CERT",
    "TRAINING",
    "NDA",
    "OTHER",
  ]),
  name: z.string().min(2, "Nombra el documento").max(160),
  url: z.string().url("La liga debe ser una URL válida"),
  expiresAt: z.string().optional(),
});

export async function upsertEmployeeDocument(formData: FormData) {
  const session = await requireAdmin();
  const parsed = employeeDocSchema.safeParse({
    employeeId: formData.get("employeeId"),
    type: formData.get("type"),
    name: formData.get("name"),
    url: formData.get("url"),
    expiresAt: formData.get("expiresAt") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const doc = await db.employeeDocument.create({
    data: {
      employeeId: d.employeeId,
      type: d.type,
      name: d.name,
      url: d.url,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "employee_document.created",
    entity: "EmployeeDocument",
    entityId: doc.id,
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteEmployeeDocument(documentId: string) {
  const session = await requireAdmin();
  await db.employeeDocument.delete({ where: { id: documentId } });
  await audit({
    actorId: session.user.id,
    action: "employee_document.deleted",
    entity: "EmployeeDocument",
    entityId: documentId,
  });
  revalidatePath("/admin/locations");
  return { ok: true };
}

const rateWindowSchema = z
  .object({
    rateWindowId: z.string().optional(),
    locationId: z.string().min(1, "Elige la ubicación"),
    roomTypeId: z.string().optional(), // vacío = todos los tipos de la sede
    kind: z.enum(["PRIME", "OFF_PEAK"]),
    label: z.string().min(2, "Nombra la franja").max(80),
    weekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1, "Elige al menos un día"),
    startHour: z.coerce.number().int().min(0).max(23),
    endHour: z.coerce.number().int().min(1).max(24),
    adjustPct: z.coerce.number().min(-90).max(300).optional(),
    fixedPrice: z.coerce.number().min(0).max(100000).optional(),
  })
  .refine((d) => d.endHour > d.startHour, {
    message: "La hora de fin debe ser mayor que la de inicio",
    path: ["endHour"],
  })
  .refine((d) => d.adjustPct != null || d.fixedPrice != null, {
    message: "Define un ajuste porcentual o un precio fijo",
    path: ["adjustPct"],
  });

export async function upsertRateWindow(formData: FormData) {
  const session = await requireAdmin();
  const parsed = rateWindowSchema.safeParse({
    rateWindowId: formData.get("rateWindowId") || undefined,
    locationId: formData.get("locationId"),
    roomTypeId: formData.get("roomTypeId") || undefined,
    kind: formData.get("kind"),
    label: formData.get("label"),
    weekdays: formData.getAll("weekdays"),
    startHour: formData.get("startHour"),
    endHour: formData.get("endHour"),
    adjustPct: formData.get("adjustPct") || undefined,
    fixedPrice: formData.get("fixedPrice") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const data = {
    locationId: d.locationId,
    roomTypeId: d.roomTypeId ?? null,
    kind: d.kind,
    label: d.label,
    weekdays: d.weekdays,
    startHour: d.startHour,
    endHour: d.endHour,
    // El ajuste se guarda en basis points: +20% → 12000.
    multiplierBps: d.adjustPct != null ? Math.round((100 + d.adjustPct) * 100) : null,
    fixedPriceCents: d.fixedPrice != null ? Math.round(d.fixedPrice * 100) : null,
  };

  const window = d.rateWindowId
    ? await db.rateWindow.update({ where: { id: d.rateWindowId }, data })
    : await db.rateWindow.create({ data });

  await audit({
    actorId: session.user.id,
    action: d.rateWindowId ? "rate_window.updated" : "rate_window.created",
    entity: "RateWindow",
    entityId: window.id,
    data: { label: d.label, kind: d.kind },
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/locations");
  return { ok: true };
}

export async function deleteRateWindow(rateWindowId: string) {
  const session = await requireAdmin();
  await db.rateWindow.delete({ where: { id: rateWindowId } });
  await audit({
    actorId: session.user.id,
    action: "rate_window.deleted",
    entity: "RateWindow",
    entityId: rateWindowId,
  });
  revalidatePath("/admin/pricing");
  return { ok: true };
}

const planLocationPriceSchema = z.object({
  planId: z.string().min(1),
  locationId: z.string().min(1, "Elige la ubicación"),
  monthlyPrice: z.coerce.number().min(0).max(1_000_000),
  founderPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  includedCredits: z.coerce.number().min(0).max(500).optional(),
});

/** Precio de un plan en una sede concreta, sin duplicar el catálogo. */
export async function upsertPlanLocationPrice(formData: FormData) {
  const session = await requireAdmin();
  const parsed = planLocationPriceSchema.safeParse({
    planId: formData.get("planId"),
    locationId: formData.get("locationId"),
    monthlyPrice: formData.get("monthlyPrice"),
    founderPrice: formData.get("founderPrice") || undefined,
    includedCredits: formData.get("includedCredits") || undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const data = {
    monthlyPriceCents: Math.round(d.monthlyPrice * 100),
    founderPriceCents: d.founderPrice != null ? Math.round(d.founderPrice * 100) : null,
    includedCredits: d.includedCredits ?? null,
  };

  const row = await db.membershipPlanLocationPrice.upsert({
    where: { planId_locationId: { planId: d.planId, locationId: d.locationId } },
    update: data,
    create: { planId: d.planId, locationId: d.locationId, ...data },
  });

  await audit({
    actorId: session.user.id,
    action: "plan_location_price.upserted",
    entity: "MembershipPlanLocationPrice",
    entityId: row.id,
    data,
  });
  revalidatePath("/admin/pricing");
  revalidatePath("/memberships");
  return { ok: true };
}

export async function deletePlanLocationPrice(id: string) {
  const session = await requireAdmin();
  await db.membershipPlanLocationPrice.delete({ where: { id } });
  await audit({
    actorId: session.user.id,
    action: "plan_location_price.deleted",
    entity: "MembershipPlanLocationPrice",
    entityId: id,
  });
  revalidatePath("/admin/pricing");
  return { ok: true };
}

// ============================================================
// Roles y facultades
// Solo quien tiene "roles.manage" puede tocar esto (el super admin siempre).
// ============================================================

const roleSchema = z.object({
  roleId: z.string().optional(),
  name: z.string().min(2, "Nombra el rol").max(80),
  description: z.string().max(300).optional(),
  active: z.coerce.boolean().optional(),
});

export async function upsertRole(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const parsed = roleSchema.safeParse({
    roleId: formData.get("roleId") || undefined,
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  // Las facultades llegan como checkboxes; se valida cada clave contra el
  // catálogo para no guardar permisos inventados.
  const permissions = formData
    .getAll("permissions")
    .map(String)
    .filter((p) => isValidPermission(p));

  const role = d.roleId
    ? await db.role.update({
        where: { id: d.roleId },
        data: { name: d.name, description: d.description ?? null, active: d.active ?? true },
      })
    : await db.role.create({
        data: {
          slug: slugify(d.name),
          name: d.name,
          description: d.description ?? null,
          active: d.active ?? true,
        },
      });

  // Se reemplaza el set completo: lo que no viene marcado queda revocado.
  await db.$transaction([
    db.rolePermission.deleteMany({ where: { roleId: role.id } }),
    db.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permission })),
      skipDuplicates: true,
    }),
  ]);

  await audit({
    actorId: session.user.id,
    action: d.roleId ? "role.updated" : "role.created",
    entity: "Role",
    entityId: role.id,
    data: { name: d.name, permissions },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function deleteRole(roleId: string) {
  const session = await requirePermission("roles.manage");
  const role = await db.role.findUnique({ where: { id: roleId }, select: { isSystem: true, name: true } });
  if (!role) return { error: "El rol no existe" };
  if (role.isSystem) return { error: "Los roles de sistema no se pueden eliminar" };

  // Los usuarios que lo tenían vuelven a la línea base de su enum.
  await db.user.updateMany({ where: { roleId }, data: { roleId: null } });
  await db.role.delete({ where: { id: roleId } });

  await audit({
    actorId: session.user.id,
    action: "role.deleted",
    entity: "Role",
    entityId: roleId,
    data: { name: role.name },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

export async function assignRole(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const userId = String(formData.get("userId"));
  const roleId = String(formData.get("roleId") || "");

  await db.user.update({
    where: { id: userId },
    data: { roleId: roleId === "" ? null : roleId },
  });
  await audit({
    actorId: session.user.id,
    action: "user.role_assigned",
    entity: "User",
    entityId: userId,
    data: { roleId: roleId || null },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Excepción puntual para una persona, por encima de su rol. */
export async function setUserPermissionOverride(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const userId = String(formData.get("userId"));
  const permission = String(formData.get("permission"));
  const value = String(formData.get("value")); // "allow" | "deny" | "clear"

  if (!isValidPermission(permission)) return { error: "Facultad desconocida" };

  if (value === "clear") {
    await db.userPermissionOverride.deleteMany({ where: { userId, permission } });
  } else {
    const allowed = value === "allow";
    await db.userPermissionOverride.upsert({
      where: { userId_permission: { userId, permission } },
      update: { allowed },
      create: { userId, permission, allowed },
    });
  }

  await audit({
    actorId: session.user.id,
    action: "user.permission_override",
    entity: "User",
    entityId: userId,
    data: { permission, value },
  });
  revalidatePath("/admin/roles");
  return { ok: true };
}

/** Comprobante de un gasto. El archivo ya está en el proveedor de storage. */
export async function addExpenseReceipt(formData: FormData) {
  const session = await requirePermission("expenses.manage");
  const expenseId = String(formData.get("expenseId"));
  const url = String(formData.get("url") || "").trim();
  const filename = String(formData.get("filename") || "").trim() || "Comprobante";

  if (!/^https?:\/\//.test(url)) {
    return { error: "La liga del comprobante debe ser una URL válida" };
  }

  const receipt = await db.expenseReceipt.create({
    data: {
      expenseId,
      url,
      filename,
      contentType: String(formData.get("contentType") || "") || null,
      sizeBytes: formData.get("sizeBytes") ? Number(formData.get("sizeBytes")) : null,
      uploadedById: session.user.id,
    },
  });
  await audit({
    actorId: session.user.id,
    action: "expense_receipt.added",
    entity: "ExpenseReceipt",
    entityId: receipt.id,
    data: { expenseId, filename },
  });
  revalidatePath("/admin/costs");
  return { ok: true };
}

export async function deleteExpenseReceipt(receiptId: string) {
  const session = await requirePermission("expenses.manage");
  await db.expenseReceipt.delete({ where: { id: receiptId } });
  await audit({
    actorId: session.user.id,
    action: "expense_receipt.deleted",
    entity: "ExpenseReceipt",
    entityId: receiptId,
  });
  revalidatePath("/admin/costs");
  return { ok: true };
}
