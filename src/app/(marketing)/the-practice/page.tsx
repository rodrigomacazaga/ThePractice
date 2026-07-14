import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  CalendarCheck,
  Coffee,
  CreditCard,
  DoorOpen,
  Globe,
  KeyRound,
  Laptop,
  Moon,
  Presentation,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { site } from "@/config/site";
import { formatMXN, formatCredits } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogoMark } from "@/components/brand/logo";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FloorPlanArt } from "@/components/marketing/floor-plan-art";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { LocationCard } from "@/components/marketing/location-card";

export const dynamic = "force-dynamic";

// Página institucional de la marca. Vivía en "/" y se movió aquí para que la
// raíz pueda redirigir a la landing comercial de La Ceiba sin mezclar ambas
// experiencias. Cuando "/" vuelva a ser institucional, basta con quitar la
// redirección del middleware y restaurar este archivo como (marketing)/page.tsx.
export const metadata: Metadata = {
  title: "La plataforma para tu práctica privada",
  description: site.description,
  openGraph: {
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ["/images/common-area.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: ["/images/common-area.jpg"],
  },
};

const AUDIENCES = [
  "Psicólogos",
  "Terapeutas",
  "Coaches ejecutivos",
  "Nutriólogos",
  "Terapeutas de pareja",
  "Fisioterapeutas",
  "Mindfulness",
  "Wellness",
];

// "Un día en The Practice" — el concepto explicado como experiencia, no como features.
const DAY = [
  { time: "08:30", icon: Coffee, text: "Llegas, entras con tu código y te preparas un café." },
  { time: "09:00", icon: DoorOpen, text: "Primera sesión en una sala privada, lista y en silencio." },
  { time: "11:00", icon: Laptop, text: "Trabajas entre sesiones desde el área común, sin salir del edificio." },
  { time: "13:00", icon: Users, text: "Comes con un colega que acaba de referirte un paciente." },
  { time: "15:00", icon: CreditCard, text: "Tu siguiente cliente reservó y pagó desde tu micrositio." },
  { time: "18:00", icon: Presentation, text: "Impartes un taller en el studio, para tu propio grupo." },
  { time: "20:00", icon: Moon, text: "Cierras el día. Sin renta que pagar, sin recepción que administrar." },
];

const COMMUNITY_FORMATS = [
  { title: "Talleres", text: "Comparte tu método con colegas y clientes." },
  { title: "Charlas", text: "Invita a un experto; nosotros difundimos." },
  { title: "Desayunos", text: "Conversaciones antes de la primera sesión." },
  { title: "Networking", text: "Refiere y recibe referencias de confianza." },
  { title: "Grupos de estudio", text: "Casos, supervisión y aprendizaje continuo." },
  { title: "Sesiones abiertas", text: "Abre tu práctica a nuevos clientes." },
];

export default async function ThePracticePage() {
  const [plans, roomTypes, locations] = await Promise.all([
    safeQuery(
      () =>
        db.membershipPlan.findMany({
          where: { active: true },
          orderBy: { sort: "asc" },
        }),
      []
    ),
    safeQuery(
      () => db.roomType.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
      []
    ),
    safeQuery(
      () =>
        db.location.findMany({
          where: { status: { not: "CLOSED" } },
          orderBy: { sort: "asc" },
          include: { _count: { select: { rooms: true } } },
        }),
      []
    ),
  ]);

  // Solo Pro y Premium son públicos (los demás están inactivos en el catálogo).
  const pro = plans.find((p) => p.code === "pro");
  const premium = plans.find((p) => p.code === "premium");
  const minHourly =
    roomTypes.length > 0 ? Math.min(...roomTypes.map((rt) => rt.baseHourlyPriceCents)) : 32000;

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="container-page grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div className="animate-fade-up">
          <p className="eyebrow">Private Practice Spaces · Querétaro</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Tu práctica privada,
            <br />
            con todo resuelto.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-deep">
            The Practice es la infraestructura física y digital para
            profesionales independientes: espacios privados premium, agenda,
            cobros, micrositio, directorio y comunidad. Tú te concentras en tus
            pacientes; nosotros, en todo lo demás.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {/* TODO: conectar "Ver disponibilidad" al flujo real de disponibilidad/
                reserva cuando exista. Hoy lleva al bloque Pay as you go de /memberships. */}
            <ButtonLink href="/memberships#pay-as-you-go" size="xl">
              Ver disponibilidad
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/memberships" variant="outline" size="xl">
              Ver precios
            </ButtonLink>
          </div>
          <p className="mt-3 text-sm text-stone">Reserva por hora. Sin membresía.</p>
          <div className="mt-10 flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <Badge key={a} variant="outline" size="md">
                {a}
              </Badge>
            ))}
          </div>
        </div>

        <div className="relative animate-fade-in">
          <FloorPlanArt className="mx-auto max-w-md lg:max-w-none" />
          <p className="mt-4 text-center font-display text-[10px] font-semibold tracking-[0.25em] text-stone uppercase">
            The Practice La Ceiba · Planta arquitectónica
          </p>
        </div>
      </section>

      {/* ============ ¿QUÉ ES THE PRACTICE? (concepto en 15 segundos) ============ */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="¿Qué es The Practice?"
            title="Toda la infraestructura de tu práctica, en un solo lugar."
            description="No es renta de consultorios ni coworking. Es dónde lanzas, operas y haces crecer tu práctica privada — con los espacios, la tecnología y la comunidad ya resueltos."
            align="center"
          />

          <div className="mx-auto mt-14 flex max-w-5xl flex-col items-stretch gap-4 lg:flex-row lg:items-center">
            {/* Antes */}
            <div className="flex-1 rounded-2xl border border-line bg-paper p-7">
              <p className="eyebrow">Consultorio tradicional</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Renta fija, la uses o no",
                  "Mobiliario, recepción y servicios",
                  "Una sola ubicación",
                  "Todo lo administras tú",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-stone-deep">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-clay lg:rotate-0" />

            {/* El puente: The Practice */}
            <div className="flex-1 rounded-2xl border border-ink bg-ink p-7 text-center text-paper shadow-(--shadow-lift)">
              <LogoMark tone="paper" className="mx-auto h-9 w-9" />
              <p className="mt-4 font-display text-xl font-bold tracking-tight">The Practice</p>
              <span className="mx-auto mt-4 block h-px w-10 bg-clay" />
              <p className="mt-4 text-sm leading-relaxed text-paper/65">
                La infraestructura de tu práctica, resuelta.
              </p>
            </div>

            <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 text-clay lg:rotate-0" />

            {/* Después */}
            <div className="flex-1 rounded-2xl border border-line-strong bg-surface p-7 shadow-(--shadow-card)">
              <p className="eyebrow text-clay-deep">Tu práctica, moderna</p>
              <ul className="mt-5 space-y-3">
                {[
                  "Pagas solo por lo que usas",
                  "Espacios premium, listos para atender",
                  "Micrositio, directorio y cobros online",
                  "Comunidad y una red que crece contigo",
                ].map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-ink-mute">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ CÓMO FUNCIONA (cómo empiezas) ============ */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Cómo empezar"
          title="De aplicación a primera sesión en días, no meses."
          align="center"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              step: "01",
              title: "Aplica y verifica tu perfil",
              text: "Cuéntanos de tu práctica. Verificamos credenciales para mantener una comunidad profesional y curada.",
            },
            {
              icon: CalendarCheck,
              step: "02",
              title: "Reserva tu primera sala",
              text: "Sin membresía ni compromiso: reserva por hora y paga solo por lo que uses. Subes de plan cuando tenga sentido.",
            },
            {
              icon: KeyRound,
              step: "03",
              title: "Atiende y crece",
              text: "Llega, ingresa con tu código y atiende. Tu micrositio y el directorio te traen nuevos clientes.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-paper">
                  <item.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="font-display text-3xl font-bold text-line-strong">
                  {item.step}
                </span>
              </div>
              <h3 className="mt-5 font-display text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-deep">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ UN DÍA EN THE PRACTICE (la experiencia) ============ */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="Un día en The Practice"
            title="Así se siente tener tu práctica aquí."
            description="Sin manuales ni configuraciones. Solo tu práctica, funcionando."
            align="center"
          />
          <div className="mx-auto mt-14 max-w-2xl">
            {DAY.map((moment, i) => (
              <div key={moment.time} className="flex gap-5">
                {/* Columna tiempo + línea */}
                <div className="flex flex-col items-center">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink text-paper">
                    <moment.icon className="h-4.5 w-4.5" strokeWidth={1.75} />
                  </div>
                  {i < DAY.length - 1 && <span className="my-1 w-px flex-1 bg-line-strong" />}
                </div>
                {/* Contenido */}
                <div className={i < DAY.length - 1 ? "pb-8" : ""}>
                  <p className="font-display text-sm font-bold tracking-tight text-clay-deep">
                    {moment.time}
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-mute">{moment.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ ESPACIOS (consecuencia del concepto, no el concepto) ============ */}
      {roomTypes.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Los espacios"
              title="Un espacio para cada forma de ejercer."
              description="Las salas son solo una parte de The Practice — pero están pensadas al detalle. Seis tipos de espacio para terapia, consulta, sesiones premium, masaje, movimiento y talleres."
            />
            <ButtonLink href="/rooms" variant="outline">
              Ver todos los espacios
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {roomTypes.map((rt) => (
              <RoomTypeCard key={rt.id} roomType={rt} />
            ))}
          </div>
        </section>
      )}

      {/* ============ PLATAFORMA DIGITAL (qué incluye) ============ */}
      <section className="bg-ink py-20 text-paper lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="La plataforma"
            title="No es solo un espacio. Es tu infraestructura completa."
            description="Cada membresía incluye las herramientas digitales que una práctica moderna necesita."
            tone="paper"
          />
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-paper/10 bg-paper/10 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Globe, title: "Micrositio propio", text: "thepractice.mx/p/tu-nombre — tu página profesional con bio, servicios, precios y reservas." },
              { icon: Search, title: "Directorio curado", text: "Aparece donde los clientes buscan: por especialidad, ubicación, modalidad y precio." },
              { icon: CalendarCheck, title: "Agenda y reservas", text: "Tus clientes reservan online. Confirmaciones y recordatorios automáticos." },
              { icon: CreditCard, title: "Cobros online", text: "Cobra sesiones con tarjeta. Menos no-shows, cero transferencias por WhatsApp." },
              { icon: DoorOpen, title: "Acceso inteligente", text: "Código de acceso por reserva y check-in digital. Sin llaves, sin recepción." },
              { icon: Sparkles, title: "Comunidad profesional", text: "Una red curada de colegas para referir clientes y crecer juntos." },
            ].map((f) => (
              <div key={f.title} className="bg-ink p-8">
                <f.icon className="h-5 w-5 text-clay" strokeWidth={1.75} />
                <h3 className="mt-4 font-display text-base font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-paper/60">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ COMUNIDAD (autoorganizada) ============ */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-start gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div className="lg:sticky lg:top-24">
            <SectionHeading
              eyebrow="La comunidad"
              title="La comunidad la construyen sus miembros."
              description="Ejercer por tu cuenta no significa hacerlo en soledad. The Practice no organiza los eventos: pone el espacio, la difusión y las herramientas para que los profesionales creen los suyos."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge variant="default" size="md">The Practice pone el espacio</Badge>
              <Badge variant="default" size="md">la difusión</Badge>
              <Badge variant="default" size="md">la infraestructura</Badge>
              <Badge variant="clay" size="md">Los miembros ponen el contenido</Badge>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {COMMUNITY_FORMATS.map((f) => (
              <div key={f.title} className="rounded-2xl border border-line bg-paper p-6">
                <h3 className="font-display text-sm font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRECIOS RESUMIDOS (tres caminos) ============ */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Precios"
          title="Empieza según tu ritmo."
          description="No tienes que decidir hoy. Empieza pagando por hora y sube a un plan solo cuando The Practice ya sea parte de tu semana."
          align="center"
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-3">
          {/* Reserva por hora */}
          <div className="flex flex-col rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)">
            <p className="eyebrow">Reserva por hora</p>
            <p className="mt-4 font-display text-3xl font-bold tracking-tight">
              desde {formatMXN(minHourly)}
              <span className="text-base font-semibold text-stone"> /hora</span>
            </p>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-deep">
              Sin membresía, sin permanencia. Ideal para conocer The Practice,
              probar un espacio o uso ocasional.
            </p>
            <ButtonLink
              href="/memberships#pay-as-you-go"
              variant="outline"
              size="lg"
              className="mt-6 w-full"
            >
              Ver disponibilidad
            </ButtonLink>
          </div>

          {/* Pro — el plan estrella */}
          {pro && (
            <div className="relative flex flex-col rounded-2xl border border-ink bg-ink p-7 text-paper shadow-(--shadow-lift)">
              <Badge variant="clay" className="absolute -top-3 left-7">
                Más elegido
              </Badge>
              <p className="eyebrow-light">Pro</p>
              <p className="mt-4 font-display text-3xl font-bold tracking-tight">
                {formatMXN(pro.monthlyPriceCents)}
                <span className="text-base font-semibold text-paper/60"> /mes</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-paper/65">
                Para quien atiende cada semana. {formatCredits(pro.includedCredits)}{" "}
                créditos, micrositio con reservas, cobros online y mejor tarifa.
              </p>
              <ButtonLink href="/memberships" variant="light" size="lg" className="mt-6 w-full">
                Ver precios
              </ButtonLink>
            </div>
          )}

          {/* Premium */}
          {premium && (
            <div className="flex flex-col rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)">
              <p className="eyebrow">Premium</p>
              <p className="mt-4 font-display text-3xl font-bold tracking-tight">
                {formatMXN(premium.monthlyPriceCents)}
                <span className="text-base font-semibold text-stone"> /mes</span>
              </p>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-stone-deep">
                Para mayor volumen y prioridad. {formatCredits(premium.includedCredits)}{" "}
                créditos, perfil destacado y horarios prime.
              </p>
              <ButtonLink href="/memberships" variant="outline" size="lg" className="mt-6 w-full">
                Ver precios
              </ButtonLink>
            </div>
          )}
        </div>
      </section>

      {/* ============ THE PRACTICE NETWORK ============ */}
      {locations.length > 0 && (
        <section className="border-y border-line bg-surface py-20 lg:py-28">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="The Practice Network"
                title="No abrimos sucursales. Construimos una red."
                description="The Practice nació para ser una red de espacios para profesionales independientes. Empieza en Querétaro y crece ciudad por ciudad — una sola membresía, en toda la red."
              />
              <ButtonLink href="/locations" variant="outline">
                Conocer la red
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {locations.map((location) => (
                <LocationCard
                  key={location.id}
                  location={location}
                  roomCount={location._count.rooms}
                  founding={location.slug === "la-ceiba"}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ PARA CLIENTES ============ */}
      <section className="container-page py-20 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Para clientes"
              title="Encuentra a tu profesional. Verificado, cerca y disponible."
              description="Terapeutas, nutriólogos y coaches verificados, en espacios privados y cómodos. Reserva online, paga seguro y recibe confirmación al instante."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/directory" size="lg">
                Explorar el directorio
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/for-clients" variant="outline" size="lg">
                Cómo funciona
              </ButtonLink>
            </div>
          </div>
          <div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <Image
                src="/images/common-area.jpg"
                alt="Área común de The Practice: recepción, lounge y coffee station"
                fill
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                { title: "Profesionales verificados", text: "Credenciales revisadas antes de publicar un perfil." },
                { title: "Espacios privados", text: "Salas diseñadas para conversaciones que importan." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-line bg-paper p-6">
                  <h3 className="font-display text-sm font-bold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ CTA FINAL ============ */}
      <section className="bg-ink">
        <div className="container-page py-20 text-center lg:py-28">
          <p className="eyebrow-light">Founding Location · The Practice La Ceiba</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-paper text-balance sm:text-4xl lg:text-5xl">
            Sé parte de la primera sede de la red.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-paper/60">
            Cupo limitado de practitioners fundadores en La Ceiba, con precio
            preferente de por vida.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/la-ceiba" variant="light" size="xl">
              Conocer La Ceiba
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/apply" variant="outline-light" size="xl">
              Aplicar ahora
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
