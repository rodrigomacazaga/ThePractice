import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  DoorOpen,
  Globe,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FloorPlanArt } from "@/components/marketing/floor-plan-art";
import { PlanCard } from "@/components/marketing/plan-card";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { LocationCard } from "@/components/marketing/location-card";

export const dynamic = "force-dynamic";

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

export default async function HomePage() {
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

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="container-page grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div className="animate-fade-up">
          <p className="eyebrow">Private Practice Spaces · Querétaro</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Tu práctica privada,
            <br />
            sin consultorio fijo.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-deep">
            The Practice te da salas privadas premium, agenda, reservas, pagos y
            presencia digital — toda la infraestructura para operar tu práctica
            presencial, sin renta fija, sin mobiliario, sin recepcionista.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/apply" size="xl">
              Aplicar como practitioner
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/directory" variant="outline" size="xl">
              Encontrar un profesional
            </ButtonLink>
          </div>
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

      {/* ============ PROBLEMA / SOLUCIÓN ============ */}
      <section className="border-y border-line bg-surface">
        <div className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">El problema</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Un consultorio propio es caro, rígido y lento.
            </h2>
            <ul className="mt-6 space-y-4 text-stone-deep">
              {[
                "Renta fija de $8,000–$25,000/mes, la uses o no.",
                "Aval, depósito, contrato anual, mobiliario, internet, limpieza.",
                "Un solo punto: si tu cliente vive lejos, lo pierdes.",
                "Cero herramientas: agenda, cobros y recordatorios por WhatsApp.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rust" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">The Practice</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Paga por lo que usas. Todo lo demás ya está resuelto.
            </h2>
            <ul className="mt-6 space-y-4 text-stone-deep">
              {[
                "Salas privadas premium por hora, paquete o membresía.",
                "Diseño, mobiliario, limpieza, WiFi y operación incluidos.",
                "Micrositio, directorio, reservas y cobros online.",
                "Una red de ubicaciones: atiende donde están tus clientes.",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sage" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ============ CÓMO FUNCIONA ============ */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Cómo funciona"
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
              title: "Elige plan y reserva salas",
              text: "Por hora, paquete de horas o membresía mensual con horas incluidas. Reserva desde tu panel en segundos.",
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

      {/* ============ SALAS ============ */}
      {roomTypes.length > 0 && (
        <section className="border-y border-line bg-surface py-20 lg:py-28">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Los espacios"
                title="Seis tipos de sala. Un mismo estándar."
                description="Terapia, consulta, sesiones premium, masaje, movimiento y talleres. Privacidad acústica, luz cálida y mobiliario de calidad en todas."
              />
              <ButtonLink href="/rooms" variant="outline">
                Ver todas las salas
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {roomTypes.map((rt) => (
                <RoomTypeCard key={rt.id} roomType={rt} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ PLATAFORMA DIGITAL ============ */}
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

      {/* ============ MEMBRESÍAS ============ */}
      {plans.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <SectionHeading
            eyebrow="Membresías"
            title="Un plan para cada etapa de tu práctica."
            description="Empieza pagando por hora y escala a horas incluidas, micrositio y horarios fijos garantizados."
            align="center"
          />
          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-stone-deep">
            ¿Abriendo en La Ceiba?{" "}
            <Link href="/la-ceiba" className="font-semibold text-clay hover:underline">
              Conoce los precios founder →
            </Link>
          </p>
        </section>
      )}

      {/* ============ PARA CLIENTES ============ */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
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

      {/* ============ UBICACIONES ============ */}
      {locations.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading
              eyebrow="Ubicaciones"
              title="Una red que crece contigo."
              description="Empezamos en Querétaro. Cada nueva ubicación amplía tu alcance sin duplicar tus costos."
            />
            <ButtonLink href="/locations" variant="outline">
              Ver ubicaciones
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                roomCount={location._count.rooms}
              />
            ))}
          </div>
        </section>
      )}

      {/* ============ CTA FINAL ============ */}
      <section className="bg-ink">
        <div className="container-page py-20 text-center lg:py-28">
          <p className="eyebrow-light">Membresías founder · The Practice La Ceiba</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-bold tracking-tight text-paper text-balance sm:text-4xl lg:text-5xl">
            Abre tu práctica en La Ceiba sin firmar un contrato de renta.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-paper/60">
            Cupo limitado de practitioners fundadores con precio preferente de
            por vida.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/la-ceiba" variant="light" size="xl">
              Conocer membresías founder
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
