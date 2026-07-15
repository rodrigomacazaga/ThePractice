"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { slugify } from "@/lib/utils";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { setSetting, clearSetting, type SettingKey } from "@/lib/settings";
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

const BOOKING_SETTING_KEYS: SettingKey[] = [
  "booking.cancellation_window_hours",
  "booking.late_cancel_penalty_pct",
  "booking.no_show_penalty_pct",
  "booking.min_advance_minutes",
  "booking.max_days_ahead",
  "booking.pending_payment_hold_minutes",
  "founder.deposit_cents",
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
  studioHoursIncluded: z.coerce.number().min(0).max(100),
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
    studioHoursIncluded: formData.get("studioHoursIncluded"),
    micrositeTier: formData.get("micrositeTier"),
    sort: formData.get("sort"),
  });
  if (!parsed.success) return { error: "Datos inválidos" };

  const { planId, code, monthlyPrice, founderPrice, includedCredits, ...data } = parsed.data;
  const features = parseList(formData.get("features"));
  const flags = {
    highlighted: formData.get("highlighted") === "on",
    primeAccess: formData.get("primeAccess") === "on",
    premiumRoomAccess: formData.get("premiumRoomAccess") === "on",
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
  revalidatePath("/admin/catalog");
  revalidatePath("/memberships");
  revalidatePath("/la-ceiba");
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
  revalidatePath("/admin/catalog");
  revalidatePath("/memberships");
  revalidatePath("/la-ceiba");
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
  if (!parsed.success) return { error: "Datos inválidos" };

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
  revalidatePath("/admin/catalog");
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
  if (!parsed.success) return { error: "Datos inválidos" };

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
  revalidatePath("/admin/catalog");
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
  status: z.enum(["OPEN", "COMING_SOON", "CLOSED"]),
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
  if (!parsed.success) return { error: "Datos inválidos" };
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
  revalidatePath("/la-ceiba");
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
  if (!parsed.success) return { error: "Datos inválidos" };

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
  revalidatePath("/admin/catalog");
  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath("/memberships");
  revalidatePath("/la-ceiba");
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
  if (!parsed.success) return { error: "Datos inválidos" };

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
  revalidatePath("/la-ceiba");
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
  if (!parsed.success) return { error: "Datos inválidos" };

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
  return { ok: true };
}
