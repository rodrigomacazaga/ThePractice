import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { sendEmailSafe, emailTemplates } from "@/lib/email";
import { applySchema, contactSchema, micrositeLeadSchema } from "@/lib/validation/lead";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

/** ¿Ya llegó un lead de este email+tipo en las últimas 24 h? Evita duplicados
 *  y la amplificación de correos ante reenvíos o bots. */
async function isDuplicateLead(email: string, type: string): Promise<boolean> {
  const since = new Date(Date.now() - 24 * 3600_000);
  const existing = await db.lead.findFirst({
    where: {
      email: { equals: email.toLowerCase(), mode: "insensitive" },
      type: type as never,
      createdAt: { gt: since },
    },
    select: { id: true },
  });
  return existing != null;
}

/**
 * Endpoint público de captación:
 *  - type=apply     → aplicación de practitioner (landing / apply)
 *  - type=contact   → formulario de contacto
 *  - type=microsite → lead desde el micrositio de un practitioner
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimitDistributed(`leads:${ip}`, { limit: 8, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta en un minuto." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  // Honeypot: campo oculto que un humano nunca llena. Si viene con contenido,
  // fingimos éxito (no damos pistas al bot) pero no creamos nada.
  const hp = (body as { _hp?: string })._hp;
  if (typeof hp === "string" && hp.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  // Anti-submit instantáneo: el form envía cuándo se montó; <2s = bot.
  const startedAt = (body as { _t?: number })._t;
  if (typeof startedAt === "number" && Date.now() - startedAt < 2000) {
    return NextResponse.json({ ok: true });
  }

  const type = (body as { type?: string }).type ?? "apply";

  try {
    if (type === "contact") {
      const data = contactSchema.parse(body);
      if (await isDuplicateLead(data.email, "CONTACT")) {
        return NextResponse.json({ ok: true });
      }
      await db.lead.create({
        data: {
          type: "CONTACT",
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          message: data.message,
          source: data.source ?? "contact",
        },
      });
      await sendEmailSafe({
        to: site.email,
        ...emailTemplates.leadReceivedAdmin(data.name, "Contacto general", data.source ?? "contact"),
      });
      return NextResponse.json({ ok: true });
    }

    if (type === "microsite") {
      const data = micrositeLeadSchema.parse(body);
      const practitioner = await db.practitionerProfile.findUnique({
        where: { slug: data.practitionerSlug },
        include: { user: true },
      });
      if (!practitioner) {
        return NextResponse.json({ error: "Practitioner no encontrado" }, { status: 404 });
      }
      if (await isDuplicateLead(data.email, "CLIENT_INQUIRY")) {
        return NextResponse.json({ ok: true });
      }
      await db.lead.create({
        data: {
          type: "CLIENT_INQUIRY",
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone,
          message: data.message,
          source: `microsite:${data.practitionerSlug}`,
          practitionerId: practitioner.id,
        },
      });
      await sendEmailSafe({
        to: practitioner.user.email,
        ...emailTemplates.leadReceivedAdmin(data.name, "Cliente potencial", "Tu micrositio"),
      });
      return NextResponse.json({ ok: true });
    }

    // apply (default)
    const data = applySchema.parse(body);
    if (await isDuplicateLead(data.email, "PRACTITIONER_APPLICATION")) {
      return NextResponse.json({ ok: true });
    }
    const location = data.locationSlug
      ? await db.location.findUnique({ where: { slug: data.locationSlug } })
      : null;

    await db.lead.create({
      data: {
        type: "PRACTITIONER_APPLICATION",
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        specialty: data.specialty,
        yearsExperience: data.yearsExperience,
        city: data.city,
        preferredDays: data.preferredDays,
        preferredHours: data.preferredHours,
        weeklySessions: data.weeklySessions,
        hasClients: data.hasClients !== "no",
        roomPreference: data.roomPreference,
        interestedPlan: data.interestedPlan === "unsure" ? null : data.interestedPlan,
        wantsLocker: data.wantsLocker,
        startTimeframe: data.startTimeframe,
        message: data.message,
        source: data.source ?? "apply",
        locationId: location?.id,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,
        utmContent: data.utmContent,
        utmTerm: data.utmTerm,
        fbclid: data.fbclid,
        gclid: data.gclid,
      },
    });

    await sendEmailSafe({
      to: data.email,
      ...emailTemplates.practitionerApplicationReceived(data.name.split(" ")[0] ?? data.name),
    });
    await sendEmailSafe({
      to: site.email,
      ...emailTemplates.leadReceivedAdmin(data.name, data.specialty, data.source ?? "apply"),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        { error: "Datos inválidos", issues: (err as { issues: unknown }).issues },
        { status: 422 }
      );
    }
    console.error("[leads] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
