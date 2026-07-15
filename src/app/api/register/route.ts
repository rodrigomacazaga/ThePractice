import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { rateLimitDistributed } from "@/lib/rate-limit";
import { registerSchema } from "@/lib/validation/auth";
import { slugify } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const { allowed } = await rateLimitDistributed(`register:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!allowed) {
    return NextResponse.json({ error: "Demasiados intentos. Espera un minuto." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos", issues: parsed.error.issues },
      { status: 422 }
    );
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Ya existe una cuenta con ese email." }, { status: 409 });
  }

  const passwordHash = await hash(data.password, 12);

  if (data.accountType === "practitioner") {
    // slug único basado en el nombre
    const base = slugify(data.name) || "practitioner";
    let slug = base;
    for (let i = 2; await db.practitionerProfile.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }

    await db.user.create({
      data: {
        email,
        name: data.name,
        phone: data.phone,
        passwordHash,
        role: "PRACTITIONER",
        practitionerProfile: {
          create: {
            slug,
            specialties: data.specialty ? [data.specialty] : [],
            verificationStatus: "PENDING_REVIEW",
            wallet: { create: { balance: 0 } },
            microsite: { create: { published: false } },
          },
        },
      },
    });
  } else {
    await db.user.create({
      data: {
        email,
        name: data.name,
        phone: data.phone,
        passwordHash,
        role: "CLIENT",
        clientProfile: { create: {} },
      },
    });
  }

  return NextResponse.json({ ok: true });
}
