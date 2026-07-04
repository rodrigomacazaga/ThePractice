/**
 * Seed de The Practice.
 * Crea: ubicaciones, tipos de sala, salas, planes, paquetes, add-ons,
 * usuarios demo (admin, practitioners, cliente), micrositios, servicios,
 * disponibilidad, membresías, wallets, reservas de ejemplo, leads de
 * preventa, lockers, reviews y settings.
 *
 * Idempotente: usa upserts por claves únicas (email, code, slug).
 *
 * Credenciales demo (contraseña: ThePractice2026!):
 *   superadmin@thepractice.mx  → SUPER_ADMIN
 *   admin@thepractice.mx       → ADMIN
 *   ana@thepractice.mx         → PRACTITIONER (Pro, aprobada)
 *   roberto@thepractice.mx     → PRACTITIONER (Premium, aprobado)
 *   sofia@thepractice.mx       → PRACTITIONER (Flex, aprobada)
 *   diego@thepractice.mx       → PRACTITIONER (pendiente de verificación)
 *   cliente@ejemplo.mx         → CLIENT
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();
const PASSWORD = "ThePractice2026!";

async function main() {
  console.log("🌱 Seeding The Practice…");
  const passwordHash = await hash(PASSWORD, 12);

  // ------------------------------------------------------------
  // Ubicaciones
  // ------------------------------------------------------------
  const laCeiba = await db.location.upsert({
    where: { slug: "la-ceiba" },
    update: {},
    create: {
      slug: "la-ceiba",
      name: "The Practice La Ceiba",
      shortName: "La Ceiba",
      city: "Querétaro",
      state: "Querétaro",
      address: "Plaza La Ceiba, Av. Principal 100, Local 12",
      description:
        "Nuestra primera ubicación: siete salas privadas dentro de Plaza La Ceiba, con estacionamiento, seguridad y un área común serena para recibir a tus clientes.",
      status: "OPEN",
      timezone: "America/Mexico_City",
      amenities: [
        "Estacionamiento",
        "WiFi de alta velocidad",
        "Coffee station",
        "Área de espera",
        "Acceso con código",
        "Limpieza entre sesiones",
        "Aire acondicionado",
        "Seguridad de plaza",
      ],
      openingHour: 7,
      closingHour: 22,
      sort: 0,
    },
  });

  const juriquilla = await db.location.upsert({
    where: { slug: "juriquilla" },
    update: {},
    create: {
      slug: "juriquilla",
      name: "The Practice Juriquilla",
      shortName: "Juriquilla",
      city: "Querétaro",
      state: "Querétaro",
      description: "Próxima ubicación en la zona norte de Querétaro.",
      status: "COMING_SOON",
      sort: 1,
    },
  });

  await db.location.upsert({
    where: { slug: "zibata" },
    update: {},
    create: {
      slug: "zibata",
      name: "The Practice Zibatá",
      shortName: "Zibatá",
      city: "El Marqués",
      state: "Querétaro",
      description: "En evaluación: Zibatá y su corredor de bienestar.",
      status: "COMING_SOON",
      sort: 2,
    },
  });

  // ------------------------------------------------------------
  // Tipos de sala
  // ------------------------------------------------------------
  const talkType = await db.roomType.upsert({
    where: { code: "talk" },
    update: {},
    create: {
      code: "talk",
      name: "Talk Room",
      description:
        "Para psicología, coaching y terapia individual. Dos sillones, mesa lateral, alta privacidad acústica y luz cálida.",
      creditsPerHour: 1,
      baseHourlyPriceCents: 32000,
      memberHourlyPriceCents: 28000,
      capacity: 2,
      idealFor: ["Psicología", "Coaching", "Terapia individual"],
      features: ["2 sillones", "Mesa lateral", "Alta privacidad", "Luz cálida"],
      sort: 0,
    },
  });

  const consultType = await db.roomType.upsert({
    where: { code: "consult" },
    update: {},
    create: {
      code: "consult",
      name: "Consult Room",
      description:
        "Para nutrición, consulta general y evaluación. Escritorio profesional, sillas cómodas y báscula opcional.",
      creditsPerHour: 1,
      baseHourlyPriceCents: 32000,
      memberHourlyPriceCents: 28000,
      capacity: 3,
      idealFor: ["Nutrición", "Consulta general", "Evaluación"],
      features: ["Escritorio", "Sillas", "Báscula opcional", "Layout profesional"],
      sort: 1,
    },
  });

  const premiumType = await db.roomType.upsert({
    where: { code: "premium" },
    update: {},
    create: {
      code: "premium",
      name: "Premium Room",
      description:
        "Para terapia de pareja, coaching ejecutivo y sesiones de mayor ticket. Más amplia, mejor mobiliario, TV opcional.",
      creditsPerHour: 1.5,
      baseHourlyPriceCents: 45000,
      memberHourlyPriceCents: 39000,
      capacity: 4,
      idealFor: ["Terapia de pareja", "Coaching ejecutivo", "Sesiones premium"],
      features: ["Más amplia", "Mobiliario premium", "TV opcional", "Mejor acústica"],
      sort: 2,
    },
  });

  const studioType = await db.roomType.upsert({
    where: { code: "studio" },
    update: {},
    create: {
      code: "studio",
      name: "Studio",
      description:
        "Para talleres, grupos, mindfulness y corporate wellness. Capacidad 6–10 personas, TV/proyector y mesa modular.",
      creditsPerHour: 2,
      baseHourlyPriceCents: 85000,
      memberHourlyPriceCents: 75000,
      capacity: 10,
      idealFor: ["Talleres", "Grupos", "Mindfulness", "Corporate wellness"],
      features: ["6–10 personas", "TV/proyector", "Pizarrón", "Mesa modular"],
      sort: 3,
    },
  });

  // ------------------------------------------------------------
  // Salas de La Ceiba
  // ------------------------------------------------------------
  const roomsData = [
    { slug: "talk-01", name: "Talk 01", typeId: talkType.id, description: "Sillones frente a frente, ventana con luz natural indirecta." },
    { slug: "talk-02", name: "Talk 02", typeId: talkType.id, description: "La más silenciosa: al fondo del pasillo, doble panel acústico." },
    { slug: "talk-03", name: "Talk 03", typeId: talkType.id, description: "Tonos cálidos y textiles suaves. Favorita para primeras sesiones." },
    { slug: "consult-01", name: "Consult 01", typeId: consultType.id, description: "Escritorio amplio y báscula de precisión disponible." },
    { slug: "consult-02", name: "Consult 02", typeId: consultType.id, description: "Con pantalla para revisar planes y resultados con tu cliente." },
    { slug: "premium-01", name: "Premium 01", typeId: premiumType.id, description: "Sala amplia con sala de estar, TV y acústica reforzada.", amenities: ["TV 55”", "Sofá de 3 plazas"] },
    { slug: "studio-01", name: "Studio", typeId: studioType.id, description: "El espacio para talleres y grupos: proyector, pizarrón y mesa modular para 10.", amenities: ["Proyector", "Pizarrón", "Mesa modular"] },
  ];

  const rooms: Record<string, { id: string }> = {};
  for (const r of roomsData) {
    rooms[r.slug] = await db.room.upsert({
      where: { locationId_slug: { locationId: laCeiba.id, slug: r.slug } },
      update: {},
      create: {
        locationId: laCeiba.id,
        roomTypeId: r.typeId,
        name: r.name,
        slug: r.slug,
        description: r.description,
        amenities: r.amenities ?? [],
      },
    });
  }

  // ------------------------------------------------------------
  // Planes de membresía
  // ------------------------------------------------------------
  const plansData = [
    {
      code: "flex",
      name: "Flex",
      tagline: "Para empezar sin compromiso.",
      monthlyPriceCents: 169000,
      founderPriceCents: 129000,
      includedCredits: 2,
      rolloverLimit: 2,
      micrositeTier: "BASIC" as const,
      features: [
        "2 horas de sala incluidas",
        "Perfil básico en directorio",
        "Precio preferente por hora",
        "Reserva desde tu panel",
        "Facturación de tus pagos",
        "Acceso a la comunidad",
      ],
      sort: 0,
    },
    {
      code: "pro",
      name: "Pro",
      tagline: "El plan de la práctica en crecimiento.",
      monthlyPriceCents: 590000,
      founderPriceCents: 470000,
      includedCredits: 22,
      rolloverLimit: 6,
      micrositeTier: "PRO" as const,
      highlighted: true,
      features: [
        "22 horas de sala al mes",
        "Micrositio completo con reservas",
        "Cobros online de clientes",
        "Recordatorios automáticos",
        "Precio preferente en horas extra",
        "Soporte prioritario",
      ],
      sort: 1,
    },
    {
      code: "premium",
      name: "Premium",
      tagline: "Para profesionales establecidos.",
      monthlyPriceCents: 1090000,
      founderPriceCents: 890000,
      includedCredits: 45,
      rolloverLimit: 10,
      micrositeTier: "PREMIUM" as const,
      primeAccess: true,
      premiumRoomAccess: true,
      features: [
        "45 horas de sala al mes",
        "Perfil destacado en directorio",
        "Prioridad en horarios prime",
        "Acceso a Premium Room",
        "Reporte mensual de leads",
        "Horarios recurrentes",
        "Descuento en horas adicionales",
      ],
      sort: 2,
    },
    {
      code: "resident",
      name: "Resident",
      tagline: "Tu consultorio, sin serlo.",
      monthlyPriceCents: 1990000,
      founderPriceCents: 1590000,
      includedCredits: 90,
      rolloverLimit: 15,
      micrositeTier: "FEATURED" as const,
      primeAccess: true,
      premiumRoomAccess: true,
      includesLocker: true,
      studioHoursIncluded: 4,
      features: [
        "90 horas de sala al mes",
        "Horarios fijos garantizados",
        "Locker privado incluido",
        "4 horas de Studio al mes",
        "Micrositio destacado",
        "Leads prioritarios",
        "Soporte concierge",
      ],
      sort: 3,
    },
  ];

  const plans: Record<string, { id: string }> = {};
  for (const p of plansData) {
    plans[p.code] = await db.membershipPlan.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    });
  }

  // ------------------------------------------------------------
  // Paquetes de horas
  // ------------------------------------------------------------
  const packagesData = [
    { code: "pack-10", name: "10 horas", hours: 10, priceCents: 290000, sort: 0 },
    { code: "pack-20", name: "20 horas", hours: 20, priceCents: 540000, sort: 1 },
    { code: "pack-40", name: "40 horas", hours: 40, priceCents: 990000, sort: 2 },
    { code: "pack-80", name: "80 horas", hours: 80, priceCents: 1790000, sort: 3 },
  ];
  for (const pkg of packagesData) {
    await db.hourPackage.upsert({
      where: { code: pkg.code },
      update: {},
      create: { ...pkg, validityDays: 90 },
    });
  }

  // ------------------------------------------------------------
  // Add-ons
  // ------------------------------------------------------------
  const addOnsData = [
    { code: "locker-small", name: "Locker chico", description: "Guarda tu material entre sesiones.", priceCents: 39000, billing: "MONTHLY" as const, sort: 0 },
    { code: "locker-large", name: "Locker grande", description: "Para equipo voluminoso.", priceCents: 59000, billing: "MONTHLY" as const, sort: 1 },
    { code: "tv-use", name: "Uso de TV", description: "Por sesión, en salas compatibles.", priceCents: 8000, billing: "ONE_TIME" as const, sort: 2 },
    { code: "projector", name: "Proyector", description: "Por sesión, en Studio.", priceCents: 12000, billing: "ONE_TIME" as const, sort: 3 },
    { code: "workshop-kit", name: "Kit de taller", description: "Rotafolio, plumones y material.", priceCents: 15000, billing: "ONE_TIME" as const, sort: 4 },
    { code: "coffee-station", name: "Coffee station privada", description: "Servicio de café para tu taller.", priceCents: 25000, billing: "ONE_TIME" as const, sort: 5 },
    { code: "featured-profile", name: "Perfil destacado", description: "Prioridad en el directorio.", priceCents: 49000, billing: "MONTHLY" as const, sort: 6 },
    { code: "after-hours", name: "Reserva fuera de horario", description: "Sujeto a disponibilidad operativa.", priceCents: 20000, billing: "ONE_TIME" as const, sort: 7 },
  ];
  for (const addon of addOnsData) {
    await db.addOn.upsert({ where: { code: addon.code }, update: {}, create: addon });
  }

  // ------------------------------------------------------------
  // Usuarios: admins
  // ------------------------------------------------------------
  await db.user.upsert({
    where: { email: "superadmin@thepractice.mx" },
    update: {},
    create: {
      email: "superadmin@thepractice.mx",
      name: "Dirección The Practice",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const admin = await db.user.upsert({
    where: { email: "admin@thepractice.mx" },
    update: {},
    create: {
      email: "admin@thepractice.mx",
      name: "Operación La Ceiba",
      passwordHash,
      role: "ADMIN",
    },
  });

  // ------------------------------------------------------------
  // Practitioners demo
  // ------------------------------------------------------------
  interface PractitionerSeed {
    email: string;
    name: string;
    slug: string;
    headline: string;
    bio: string;
    specialties: string[];
    modality: "IN_PERSON" | "ONLINE" | "HYBRID";
    years: number;
    priceFrom: number;
    priceTo: number;
    featured?: boolean;
    approved: boolean;
    planCode?: string;
    credentials: string;
    services: { name: string; duration: number; price: number; modality: "IN_PERSON" | "ONLINE" | "HYBRID"; description?: string }[];
    availability: { weekday: number; start: number; end: number }[];
  }

  const practitionersData: PractitionerSeed[] = [
    {
      email: "ana@thepractice.mx",
      name: "Ana García",
      slug: "ana-garcia",
      headline: "Psicóloga clínica · Ansiedad y burnout",
      bio: "Acompaño a adultos jóvenes y profesionistas que viven con ansiedad, estrés crónico o burnout. Mi enfoque combina terapia cognitivo-conductual con herramientas de regulación emocional, en un espacio donde no tienes que aparentar que todo está bien.\n\nCreo en procesos claros: desde la primera sesión acordamos objetivos y revisamos avances cada mes.",
      specialties: ["Psicología clínica", "Ansiedad", "Burnout"],
      modality: "HYBRID",
      years: 8,
      priceFrom: 950,
      priceTo: 1200,
      featured: true,
      approved: true,
      planCode: "pro",
      credentials: "Lic. en Psicología (UAQ) · Cédula profesional 12345678\nMaestría en Terapia Cognitivo-Conductual (UNAM)\nCertificación en intervención en crisis",
      services: [
        { name: "Sesión individual", duration: 60, price: 950, modality: "IN_PERSON" },
        { name: "Sesión online", duration: 50, price: 850, modality: "ONLINE" },
        { name: "Primera consulta (evaluación)", duration: 75, price: 1200, modality: "IN_PERSON", description: "Historia clínica y plan de trabajo" },
      ],
      availability: [
        { weekday: 1, start: 16, end: 20 },
        { weekday: 3, start: 16, end: 20 },
        { weekday: 6, start: 9, end: 14 },
      ],
    },
    {
      email: "roberto@thepractice.mx",
      name: "Roberto Sánchez",
      slug: "roberto-sanchez",
      headline: "Terapeuta de pareja · Enfoque Gottman",
      bio: "Trabajo con parejas que quieren dejar de tener la misma discusión de siempre. Formado en el método Gottman, mi trabajo es darles herramientas concretas — no sermones — para comunicarse distinto.\n\nAtiendo parejas en todas las etapas: crisis, decisiones grandes, o simple mantenimiento de una buena relación.",
      specialties: ["Terapia de pareja", "Comunicación", "Método Gottman"],
      modality: "IN_PERSON",
      years: 12,
      priceFrom: 1400,
      priceTo: 1800,
      featured: true,
      approved: true,
      planCode: "premium",
      credentials: "Lic. en Psicología (ITESO) · Cédula profesional 87654321\nGottman Method Couples Therapy — Level 2\nMaestría en Terapia Familiar",
      services: [
        { name: "Sesión de pareja", duration: 90, price: 1600, modality: "IN_PERSON" },
        { name: "Sesión individual (proceso de pareja)", duration: 60, price: 1100, modality: "IN_PERSON" },
      ],
      availability: [
        { weekday: 2, start: 17, end: 21 },
        { weekday: 4, start: 17, end: 21 },
        { weekday: 6, start: 10, end: 14 },
      ],
    },
    {
      email: "sofia@thepractice.mx",
      name: "Sofía Herrera",
      slug: "sofia-herrera",
      headline: "Nutrióloga clínica · Salud metabólica",
      bio: "Nutrición basada en evidencia, sin dietas de moda. Trabajo principalmente con salud metabólica, relación con la comida y nutrición deportiva recreativa.\n\nMis planes son realistas: comida que sí vas a cocinar, en porciones que sí vas a comer.",
      specialties: ["Nutrición clínica", "Salud metabólica", "Nutrición deportiva"],
      modality: "HYBRID",
      years: 6,
      priceFrom: 700,
      priceTo: 900,
      approved: true,
      planCode: "flex",
      credentials: "Lic. en Nutrición (UVM) · Cédula profesional 11223344\nDiplomado en Nutrición Deportiva\nEducadora en Diabetes certificada",
      services: [
        { name: "Consulta inicial + plan", duration: 60, price: 900, modality: "IN_PERSON", description: "Incluye mediciones y plan personalizado" },
        { name: "Seguimiento", duration: 40, price: 700, modality: "IN_PERSON" },
        { name: "Seguimiento online", duration: 30, price: 600, modality: "ONLINE" },
      ],
      availability: [
        { weekday: 1, start: 9, end: 13 },
        { weekday: 5, start: 9, end: 14 },
      ],
    },
    {
      email: "diego@thepractice.mx",
      name: "Diego Morales",
      slug: "diego-morales",
      headline: "Coach ejecutivo · Liderazgo y transiciones",
      bio: "Acompaño a líderes y fundadores en transiciones de rol, decisiones difíciles y desarrollo de equipos. 15 años en corporativo antes de dedicarme al coaching de tiempo completo.",
      specialties: ["Coaching ejecutivo", "Liderazgo", "Transiciones de carrera"],
      modality: "HYBRID",
      years: 5,
      priceFrom: 1500,
      priceTo: 2000,
      approved: false, // pendiente de verificación — muestra el flujo admin
      credentials: "Coach certificado ICF — PCC\nMBA (EGADE)",
      services: [
        { name: "Sesión de coaching", duration: 60, price: 1800, modality: "HYBRID" },
      ],
      availability: [{ weekday: 2, start: 8, end: 12 }],
    },
  ];

  const practitioners: Record<string, { id: string; userId: string; walletId?: string }> = {};

  for (const p of practitionersData) {
    const user = await db.user.upsert({
      where: { email: p.email },
      update: {},
      create: {
        email: p.email,
        name: p.name,
        passwordHash,
        role: "PRACTITIONER",
        phone: "+52 442 000 0000",
      },
    });

    const profile = await db.practitionerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        slug: p.slug,
        headline: p.headline,
        bio: p.bio,
        specialties: p.specialties,
        languages: ["Español", "Inglés"],
        modality: p.modality,
        yearsExperience: p.years,
        sessionPriceFromCents: p.priceFrom * 100,
        sessionPriceToCents: p.priceTo * 100,
        acceptingClients: true,
        featured: p.featured ?? false,
        verificationStatus: p.approved ? "APPROVED" : "PENDING_REVIEW",
        approvedAt: p.approved ? new Date() : null,
        credentialsText: p.credentials,
        policiesText:
          "Cancelaciones con 24 h de anticipación sin costo. Cancelaciones tardías se cobran al 50%. No-show se cobra completo.",
      },
    });

    const wallet = await db.creditWallet.upsert({
      where: { practitionerId: profile.id },
      update: {},
      create: { practitionerId: profile.id, balance: 0 },
    });

    practitioners[p.slug] = { id: profile.id, userId: user.id, walletId: wallet.id };

    // Micrositio
    await db.microsite.upsert({
      where: { practitionerId: profile.id },
      update: {},
      create: {
        practitionerId: profile.id,
        tier: p.planCode === "premium" ? "PREMIUM" : p.planCode === "pro" ? "PRO" : "BASIC",
        published: p.approved,
        allowBooking: p.approved && p.planCode !== "flex",
        seoTitle: `${p.name} — ${p.headline}`,
        seoDescription: p.bio.slice(0, 150),
      },
    });

    // Ubicación
    await db.practitionerLocation.upsert({
      where: {
        practitionerId_locationId: { practitionerId: profile.id, locationId: laCeiba.id },
      },
      update: {},
      create: { practitionerId: profile.id, locationId: laCeiba.id, isPrimary: true },
    });

    // Servicios
    const existingServices = await db.practitionerService.count({
      where: { practitionerId: profile.id },
    });
    if (existingServices === 0) {
      for (const [i, s] of p.services.entries()) {
        await db.practitionerService.create({
          data: {
            practitionerId: profile.id,
            name: s.name,
            description: s.description,
            durationMin: s.duration,
            priceCents: s.price * 100,
            modality: s.modality,
            sort: i,
          },
        });
      }
    }

    // Disponibilidad pública
    const existingAvailability = await db.availability.count({
      where: { practitionerId: profile.id },
    });
    if (existingAvailability === 0) {
      for (const a of p.availability) {
        await db.availability.create({
          data: {
            practitionerId: profile.id,
            weekday: a.weekday,
            startHour: a.start,
            endHour: a.end,
          },
        });
      }
    }

    // Membresía + créditos
    if (p.approved && p.planCode) {
      const plan = await db.membershipPlan.findUnique({ where: { code: p.planCode } });
      if (plan) {
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const existing = await db.practitionerMembership.findUnique({
          where: { practitionerId: profile.id },
        });
        if (!existing) {
          const membership = await db.practitionerMembership.create({
            data: {
              practitionerId: profile.id,
              planId: plan.id,
              status: "ACTIVE",
              isFounder: true,
              currentPeriodStart: periodStart,
              currentPeriodEnd: periodEnd,
            },
          });
          const updated = await db.creditWallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: plan.includedCredits } },
          });
          await db.creditTransaction.create({
            data: {
              walletId: wallet.id,
              type: "MEMBERSHIP_GRANT",
              amount: plan.includedCredits,
              balanceAfter: updated.balance,
              membershipId: membership.id,
              note: `Alta de membresía ${plan.name} (founder)`,
              expiresAt: periodEnd,
            },
          });
        }
      }
    }
  }

  // ------------------------------------------------------------
  // Cliente demo + favorito + review
  // ------------------------------------------------------------
  const clientUser = await db.user.upsert({
    where: { email: "cliente@ejemplo.mx" },
    update: {},
    create: {
      email: "cliente@ejemplo.mx",
      name: "María Fernanda López",
      passwordHash,
      role: "CLIENT",
    },
  });
  const clientProfile = await db.clientProfile.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: { userId: clientUser.id },
  });

  const ana = practitioners["ana-garcia"]!;
  await db.favorite.upsert({
    where: {
      clientId_practitionerId: { clientId: clientProfile.id, practitionerId: ana.id },
    },
    update: {},
    create: { clientId: clientProfile.id, practitionerId: ana.id },
  });

  const existingReviews = await db.review.count({ where: { practitionerId: ana.id } });
  if (existingReviews === 0) {
    await db.review.createMany({
      data: [
        {
          practitionerId: ana.id,
          clientId: clientProfile.id,
          rating: 5,
          comment:
            "Ana me ayudó a entender mi ansiedad como nadie antes. El espacio de The Practice además es precioso y muy privado.",
          consent: true,
          status: "PUBLISHED",
        },
        {
          practitionerId: ana.id,
          rating: 5,
          comment: "Profesional, puntual y con un método claro. Totalmente recomendada.",
          consent: true,
          status: "PUBLISHED",
        },
        {
          practitionerId: practitioners["roberto-sanchez"]!.id,
          rating: 5,
          comment:
            "Llegamos a punto de separarnos y Roberto nos dio herramientas reales. Tres meses después somos otro equipo.",
          consent: true,
          status: "PUBLISHED",
        },
      ],
    });
  }

  // ------------------------------------------------------------
  // Reservas de ejemplo (próximos días)
  // ------------------------------------------------------------
  const existingBookings = await db.booking.count();
  if (existingBookings === 0) {
    const mkDate = (daysAhead: number, hour: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysAhead);
      d.setHours(hour, 0, 0, 0);
      return d;
    };

    const bookingsSeed = [
      { room: "talk-01", practitioner: "ana-garcia", day: 1, hour: 16, hours: 2, credits: 2 },
      { room: "talk-01", practitioner: "ana-garcia", day: 3, hour: 17, hours: 2, credits: 2 },
      { room: "premium-01", practitioner: "roberto-sanchez", day: 1, hour: 18, hours: 2, credits: 3 },
      { room: "premium-01", practitioner: "roberto-sanchez", day: 2, hour: 19, hours: 2, credits: 3 },
      { room: "consult-01", practitioner: "sofia-herrera", day: 2, hour: 9, hours: 3, credits: 3 },
    ];

    for (const b of bookingsSeed) {
      const practitioner = practitioners[b.practitioner]!;
      const wallet = await db.creditWallet.findUnique({
        where: { practitionerId: practitioner.id },
      });
      if (!wallet || wallet.balance < b.credits) continue;

      const booking = await db.booking.create({
        data: {
          code: `TP-SEED${Math.floor(1000 + Math.random() * 9000)}`,
          kind: "ROOM_RENTAL",
          status: "CONFIRMED",
          locationId: laCeiba.id,
          roomId: rooms[b.room]!.id,
          practitionerId: practitioner.id,
          createdById: practitioner.userId,
          startsAt: mkDate(b.day, b.hour),
          endsAt: mkDate(b.day, b.hour + b.hours),
          creditsUsed: b.credits,
          accessCode: String(Math.floor(100000 + Math.random() * 900000)),
        },
      });
      const updated = await db.creditWallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: b.credits } },
      });
      await db.creditTransaction.create({
        data: {
          walletId: wallet.id,
          type: "BOOKING_CONSUMPTION",
          amount: -b.credits,
          balanceAfter: updated.balance,
          bookingId: booking.id,
          note: `${b.room} · seed`,
        },
      });
    }

    // Bloqueo administrativo de ejemplo
    await db.booking.create({
      data: {
        code: "TP-BLOCK1",
        kind: "ADMIN_BLOCK",
        status: "ADMIN_BLOCKED",
        locationId: laCeiba.id,
        roomId: rooms["studio-01"]!.id,
        createdById: admin.id,
        startsAt: mkDate(2, 7),
        endsAt: mkDate(2, 10),
        notes: "Mantenimiento de proyector",
      },
    });
  }

  // ------------------------------------------------------------
  // Leads de preventa
  // ------------------------------------------------------------
  const existingLeads = await db.lead.count();
  if (existingLeads === 0) {
    await db.lead.createMany({
      data: [
        {
          type: "PRACTITIONER_APPLICATION",
          status: "NEW",
          name: "Laura Jiménez",
          email: "laura.jimenez@ejemplo.mx",
          phone: "4421112233",
          specialty: "Psicología infantil",
          yearsExperience: 7,
          city: "Querétaro",
          preferredDays: ["Lunes", "Miércoles", "Viernes"],
          preferredHours: "Tardes (16-20h)",
          weeklySessions: 12,
          hasClients: true,
          roomPreference: "standard",
          interestedPlan: "pro",
          wantsLocker: true,
          message: "Atiendo en un consultorio rentado en el centro y quiero moverme a una zona mejor.",
          source: "landing-la-ceiba",
          locationId: laCeiba.id,
        },
        {
          type: "PRACTITIONER_APPLICATION",
          status: "CALL_SCHEDULED",
          name: "Carlos Mendoza",
          email: "carlos.mendoza@ejemplo.mx",
          phone: "4422223344",
          specialty: "Fisioterapia",
          yearsExperience: 10,
          city: "Querétaro",
          preferredDays: ["Martes", "Jueves"],
          preferredHours: "Mañanas (7-12h)",
          weeklySessions: 15,
          hasClients: true,
          roomPreference: "premium",
          interestedPlan: "premium",
          wantsLocker: true,
          source: "landing-la-ceiba",
          locationId: laCeiba.id,
          adminNotes: "Llamada agendada para el viernes 10 am. Muy interesado en horarios fijos.",
        },
        {
          type: "PRACTITIONER_APPLICATION",
          status: "DEPOSIT_PAID",
          name: "Patricia Ruiz",
          email: "patricia.ruiz@ejemplo.mx",
          phone: "4423334455",
          specialty: "Mindfulness y manejo de estrés",
          yearsExperience: 9,
          city: "Querétaro",
          preferredDays: ["Sábado"],
          preferredHours: "Mixto",
          weeklySessions: 6,
          hasClients: true,
          roomPreference: "studio",
          interestedPlan: "pro",
          wantsLocker: false,
          message: "Doy talleres de mindfulness para empresas, me interesa el Studio.",
          source: "landing-la-ceiba",
          locationId: laCeiba.id,
          depositCents: 200000,
          adminNotes: "Depósito founder recibido. Confirmar plan Pro + Studio los sábados.",
        },
        {
          type: "PRACTITIONER_APPLICATION",
          status: "QUALIFIED",
          name: "Fernando Aguilar",
          email: "fernando.aguilar@ejemplo.mx",
          phone: "4424445566",
          specialty: "Coaching de vida",
          yearsExperience: 3,
          city: "Querétaro",
          preferredDays: ["Lunes", "Martes"],
          preferredHours: "Noches (20-22h)",
          weeklySessions: 5,
          hasClients: false,
          roomPreference: "standard",
          interestedPlan: "flex",
          wantsLocker: false,
          source: "apply",
        },
        {
          type: "CONTACT",
          status: "NEW",
          name: "Alejandra Torres",
          email: "ale.torres@ejemplo.mx",
          message: "¿Tienen planes para psicólogas que atienden solo los sábados?",
          source: "contact",
        },
      ],
    });
  }

  // ------------------------------------------------------------
  // Lockers
  // ------------------------------------------------------------
  const existingLockers = await db.locker.count();
  if (existingLockers === 0) {
    for (let i = 1; i <= 8; i++) {
      await db.locker.create({
        data: {
          locationId: laCeiba.id,
          number: `L${String(i).padStart(2, "0")}`,
          size: i <= 6 ? "SMALL" : "LARGE",
          monthlyPriceCents: i <= 6 ? 39000 : 59000,
          status: "AVAILABLE",
        },
      });
    }
  }

  // ------------------------------------------------------------
  // Settings operativos
  // ------------------------------------------------------------
  const settingsData: [string, number][] = [
    ["booking.cancellation_window_hours", 24],
    ["booking.late_cancel_penalty_pct", 100],
    ["booking.no_show_penalty_pct", 100],
    ["booking.min_advance_minutes", 30],
    ["booking.max_days_ahead", 30],
  ];
  for (const [key, value] of settingsData) {
    const existing = await db.setting.findFirst({ where: { key, locationId: null } });
    if (!existing) {
      await db.setting.create({ data: { key, value } });
    }
  }

  console.log("✅ Seed completo.");
  console.log("   Ubicaciones: La Ceiba (abierta), Juriquilla y Zibatá (próximamente)");
  console.log("   Usuarios demo (contraseña: ThePractice2026!):");
  console.log("   - superadmin@thepractice.mx / admin@thepractice.mx");
  console.log("   - ana@thepractice.mx (Pro) / roberto@thepractice.mx (Premium)");
  console.log("   - sofia@thepractice.mx (Flex) / diego@thepractice.mx (pendiente)");
  console.log("   - cliente@ejemplo.mx");
  void juriquilla;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
