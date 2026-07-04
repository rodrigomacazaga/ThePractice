"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";

/**
 * Server actions del panel practitioner. Cada action re-verifica la
 * sesión (defensa en profundidad) y revalida las rutas afectadas.
 */

const profileSchema = z.object({
  headline: z.string().max(120).optional(),
  bio: z.string().max(3000).optional(),
  specialties: z.string().max(400).optional(), // separadas por coma
  languages: z.string().max(200).optional(),
  modality: z.enum(["IN_PERSON", "ONLINE", "HYBRID"]),
  yearsExperience: z.coerce.number().int().min(0).max(60).optional(),
  sessionPriceFrom: z.coerce.number().min(0).max(100000).optional(),
  sessionPriceTo: z.coerce.number().min(0).max(100000).optional(),
  acceptingClients: z.coerce.boolean(),
  credentialsText: z.string().max(2000).optional(),
  policiesText: z.string().max(2000).optional(),
});

export async function updateProfile(formData: FormData) {
  const { profile } = await requirePractitioner();

  const parsed = profileSchema.safeParse({
    headline: formData.get("headline") || undefined,
    bio: formData.get("bio") || undefined,
    specialties: formData.get("specialties") || undefined,
    languages: formData.get("languages") || undefined,
    modality: formData.get("modality"),
    yearsExperience: formData.get("yearsExperience") || undefined,
    sessionPriceFrom: formData.get("sessionPriceFrom") || undefined,
    sessionPriceTo: formData.get("sessionPriceTo") || undefined,
    acceptingClients: formData.get("acceptingClients") === "on",
    credentialsText: formData.get("credentialsText") || undefined,
    policiesText: formData.get("policiesText") || undefined,
  });
  if (!parsed.success) {
    return { error: "Revisa los campos del formulario." };
  }
  const d = parsed.data;

  await db.practitionerProfile.update({
    where: { id: profile.id },
    data: {
      headline: d.headline,
      bio: d.bio,
      specialties: d.specialties
        ? d.specialties.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      languages: d.languages
        ? d.languages.split(",").map((s) => s.trim()).filter(Boolean)
        : ["Español"],
      modality: d.modality,
      yearsExperience: d.yearsExperience,
      sessionPriceFromCents: d.sessionPriceFrom ? Math.round(d.sessionPriceFrom * 100) : null,
      sessionPriceToCents: d.sessionPriceTo ? Math.round(d.sessionPriceTo * 100) : null,
      acceptingClients: d.acceptingClients,
      credentialsText: d.credentialsText,
      policiesText: d.policiesText,
    },
  });

  revalidatePath("/practitioner/microsite");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

const micrositeSchema = z.object({
  published: z.coerce.boolean(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  showPrices: z.coerce.boolean(),
  showReviews: z.coerce.boolean(),
  allowBooking: z.coerce.boolean(),
});

export async function updateMicrosite(formData: FormData) {
  const { profile } = await requirePractitioner();

  // Publicar requiere perfil aprobado
  const wantsPublish = formData.get("published") === "on";
  if (wantsPublish && profile.verificationStatus !== "APPROVED") {
    return { error: "Tu perfil debe estar aprobado para publicar el micrositio." };
  }

  const parsed = micrositeSchema.safeParse({
    published: wantsPublish,
    seoTitle: formData.get("seoTitle") || undefined,
    seoDescription: formData.get("seoDescription") || undefined,
    showPrices: formData.get("showPrices") === "on",
    showReviews: formData.get("showReviews") === "on",
    allowBooking: formData.get("allowBooking") === "on",
  });
  if (!parsed.success) return { error: "Revisa los campos." };

  await db.microsite.upsert({
    where: { practitionerId: profile.id },
    create: { practitionerId: profile.id, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/practitioner/microsite");
  revalidatePath(`/p/${profile.slug}`);
  revalidatePath("/directory");
  return { ok: true };
}

const serviceSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(300).optional(),
  durationMin: z.coerce.number().int().min(15).max(480),
  price: z.coerce.number().min(0).max(100000),
  modality: z.enum(["IN_PERSON", "ONLINE", "HYBRID"]),
});

export async function createService(formData: FormData) {
  const { profile } = await requirePractitioner();

  const parsed = serviceSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    durationMin: formData.get("durationMin"),
    price: formData.get("price"),
    modality: formData.get("modality"),
  });
  if (!parsed.success) return { error: "Revisa los campos del servicio." };

  const count = await db.practitionerService.count({
    where: { practitionerId: profile.id },
  });

  await db.practitionerService.create({
    data: {
      practitionerId: profile.id,
      name: parsed.data.name,
      description: parsed.data.description,
      durationMin: parsed.data.durationMin,
      priceCents: Math.round(parsed.data.price * 100),
      modality: parsed.data.modality,
      sort: count,
    },
  });

  revalidatePath("/practitioner/services");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

export async function toggleService(serviceId: string) {
  const { profile } = await requirePractitioner();
  const service = await db.practitionerService.findFirst({
    where: { id: serviceId, practitionerId: profile.id },
  });
  if (!service) return { error: "Servicio no encontrado" };

  await db.practitionerService.update({
    where: { id: service.id },
    data: { active: !service.active },
  });
  revalidatePath("/practitioner/services");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

export async function deleteService(serviceId: string) {
  const { profile } = await requirePractitioner();
  await db.practitionerService.deleteMany({
    where: { id: serviceId, practitionerId: profile.id },
  });
  revalidatePath("/practitioner/services");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

const availabilitySchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  startHour: z.coerce.number().int().min(6).max(22),
  endHour: z.coerce.number().int().min(7).max(23),
});

export async function addAvailability(formData: FormData) {
  const { profile } = await requirePractitioner();
  const parsed = availabilitySchema.safeParse({
    weekday: formData.get("weekday"),
    startHour: formData.get("startHour"),
    endHour: formData.get("endHour"),
  });
  if (!parsed.success || parsed.data.endHour <= parsed.data.startHour) {
    return { error: "Rango de horas inválido." };
  }

  await db.availability.create({
    data: { practitionerId: profile.id, ...parsed.data },
  });
  revalidatePath("/practitioner/microsite");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

export async function removeAvailability(id: string) {
  const { profile } = await requirePractitioner();
  await db.availability.deleteMany({ where: { id, practitionerId: profile.id } });
  revalidatePath("/practitioner/microsite");
  revalidatePath(`/p/${profile.slug}`);
  return { ok: true };
}

const documentSchema = z.object({
  type: z.enum(["ID", "PROFESSIONAL_LICENSE", "CERTIFICATION", "TAX_CERTIFICATE", "PROFILE_PHOTO", "OTHER"]),
  name: z.string().min(2).max(160),
  url: z.string().url().max(500),
});

export async function registerDocument(formData: FormData) {
  const { session, profile } = await requirePractitioner();
  const parsed = documentSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: "Revisa los datos del documento (la URL debe ser válida)." };

  await db.document.create({
    data: { practitionerId: profile.id, ...parsed.data },
  });
  await audit({
    actorId: session.user.id,
    action: "document.submitted",
    entity: "Document",
    entityId: profile.id,
    data: { type: parsed.data.type },
  });
  revalidatePath("/practitioner/documents");
  return { ok: true };
}

const accountSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(20).optional(),
});

export async function updateAccount(formData: FormData) {
  const { session } = await requirePractitioner();
  const parsed = accountSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
  });
  if (!parsed.success) return { error: "Revisa los campos." };

  await db.user.update({
    where: { id: session.user.id },
    data: { name: parsed.data.name, phone: parsed.data.phone },
  });
  revalidatePath("/practitioner/settings");
  return { ok: true };
}
