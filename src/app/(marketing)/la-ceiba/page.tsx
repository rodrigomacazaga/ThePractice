import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  Crown,
  Globe,
  MapPin,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { FaqList } from "@/components/marketing/faq";
import { ApplyForm } from "@/components/marketing/apply-form";
import { WhatsAppCta } from "@/components/marketing/whatsapp-cta";
import { CampaignCapture, TrackClick, TrackView } from "@/components/analytics/track";
import { WHATSAPP_QUESTIONS_MESSAGE } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const TITLE = "Consultorios y espacios privados por hora en Querétaro | The Practice La Ceiba";
const DESCRIPTION =
  "Espacios privados y equipados para psicólogos, terapeutas, nutriólogos, coaches y profesionales independientes en Plaza La Ceiba, Querétaro. Conoce las membresías Founder.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/room-talk.jpg"],
    type: "website",
    locale: "es_MX",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/room-talk.jpg"],
  },
};

const PROFESSIONS = [
  "Psicología",
  "Terapia",
  "Nutrición",
  "Coaching",
  "Wellness",
  "Fisioterapia",
  "Consultoría profesional",
];

const PROBLEMS = [
  "Pagas renta fija aunque solo atiendas unos días a la semana.",
  "Inviertes en mobiliario, recepción, internet y mantenimiento por tu cuenta.",
  "Atiendes en lugares improvisados que no reflejan tu nivel profesional.",
  "No tienes presencia digital ni un sistema de reservaciones propio.",
  "Es difícil encontrar espacios por hora con imagen profesional y disponibilidad real.",
];

const SOLUTIONS = [
  { title: "Espacios privados", text: "Salas equipadas y en silencio, listas para atender." },
  { title: "Pago flexible", text: "Por hora o con membresía. Sin renta fija." },
  { title: "Recepción", text: "Tus clientes llegan a un lugar atendido y profesional." },
  { title: "Reservaciones digitales", text: "Agenda tu sala desde la plataforma." },
  { title: "Micrositio profesional", text: "Tu página con bio, servicios y reservas." },
  { title: "Directorio", text: "Clientes te encuentran por especialidad." },
  { title: "Members Lounge", text: "Terraza para trabajar y convivir entre citas." },
  { title: "Comunidad profesional", text: "Colegas para referir y crecer juntos." },
];

const FOUNDER_BENEFITS = [
  {
    icon: Crown,
    title: "Tarifa Founder preferencial",
    text: "Conserva tu tarifa Founder mientras mantengas activa tu membresía, conforme a los términos del programa.",
  },
  {
    icon: CalendarClock,
    title: "Prioridad de horarios",
    text: "Eliges tus horarios recurrentes antes que nadie, por orden de confirmación.",
  },
  {
    icon: Zap,
    title: "Acceso anticipado a la plataforma",
    text: "Usa la plataforma de reservas y tu panel antes de la apertura al público.",
  },
  {
    icon: Globe,
    title: "Micrositio listo antes de abrir",
    text: "Tu página profesional publicada desde antes del lanzamiento.",
  },
  {
    icon: Star,
    title: "Perfil destacado en el directorio",
    text: "Visibilidad prioritaria durante todo el lanzamiento.",
  },
  {
    icon: Users,
    title: "Eventos y comunidad",
    text: "Acceso prioritario a los eventos y a la comunidad profesional de La Ceiba.",
  },
  {
    icon: BadgeCheck,
    title: "Depósito 100% a tu favor",
    text: "Tu depósito Founder se acredita completo contra futuras reservas o membresías.",
  },
];

const TRADITIONAL = [
  "Renta fija mensual, la uses o no",
  "Depósito y contrato forzoso",
  "Mobiliario por tu cuenta",
  "Recepción y servicios que tú administras",
  "Mantenimiento e internet aparte",
  "Horas pagadas sin utilizar",
];

const THE_PRACTICE = [
  "Pagas según uso o con membresía",
  "Sin contrato de renta tradicional",
  "Espacios equipados y listos",
  "Recepción y reservaciones incluidas",
  "Presencia digital y comunidad",
  "Aumenta o reduce horas cuando lo necesites",
];

const HOW_IT_WORKS = [
  { title: "Aplica como Founder", text: "Llena el formulario en un par de minutos. Es gratuito y sin compromiso." },
  { title: "Cuéntanos tu práctica", text: "Especialidad, horarios preferidos y sesiones presenciales por semana." },
  { title: "Revisamos compatibilidad", text: "El equipo valida que tu especialidad y horarios tengan disponibilidad." },
  { title: "Te contactamos", text: "Recibes una llamada o mensaje por WhatsApp para resolver dudas y ver opciones." },
  { title: "Confirma tu lugar Founder", text: "Aseguras tu lugar con el depósito Founder, que se acredita a tu favor." },
  { title: "Elige tus horarios", text: "Seleccionas tus horarios recurrentes antes de la apertura al público." },
  { title: "Atiende desde el lanzamiento", text: "Empiezas a recibir a tus clientes desde el primer día." },
];

const FAQ = [
  {
    q: "¿Qué es una membresía Founder?",
    a: "Es la membresía de preventa de The Practice La Ceiba. Los Founders obtienen tarifa preferencial mientras su membresía siga activa (conforme a los términos del programa), prioridad para elegir horarios recurrentes, micrositio listo antes de la apertura y perfil destacado en el directorio durante el lanzamiento.",
  },
  {
    q: "¿Cuándo abre The Practice La Ceiba?",
    a: "Estamos en preventa. La fecha de apertura se comunicará directamente a quienes hayan aplicado; los Founders confirmados eligen sus horarios antes de la apertura al público.",
  },
  {
    q: "¿Puedo reservar solamente por hora?",
    a: "Sí. Desde la apertura podrás reservar salas por hora sin membresía y pagar solo por lo que uses. Las membresías convienen cuando atiendes varias sesiones por semana.",
  },
  {
    q: "¿Necesito tener clientes actualmente?",
    a: "No es requisito. Si estás empezando, el modelo de pago por uso te permite crecer sin renta fija, y el micrositio y el directorio te ayudan a conseguir clientes.",
  },
  {
    q: "¿Qué profesiones pueden aplicar?",
    a: "Psicología, terapia, nutrición, coaching, wellness, fisioterapia y disciplinas compatibles, además de consultoría profesional que requiera privacidad. El cupo es limitado por especialidad para mantener un directorio balanceado.",
  },
  {
    q: "¿Cómo funciona la selección de horarios?",
    a: "Los Founders eligen horarios recurrentes por orden de confirmación, antes de la apertura al público. Después podrás ajustar o complementar con reservas por hora según disponibilidad.",
  },
  {
    q: "¿El depósito Founder es reembolsable?",
    a: "El depósito se acredita al 100% a tu favor contra futuras reservas o membresías. Las condiciones específicas de reembolso se detallan en los términos del programa Founder que recibirás antes de confirmar tu lugar.",
  },
  {
    q: "¿Qué sucede si la apertura se retrasa?",
    a: "Te mantendremos informado durante todo el proceso y tu depósito permanece acreditado a tu favor. Las condiciones aplicables están en los términos del programa Founder.",
  },
  {
    q: "¿Puedo cancelar mi membresía?",
    a: "Sí. No firmas un contrato de renta tradicional. Las condiciones de cancelación se describen en la política de cancelación de The Practice.",
  },
  {
    q: "¿Incluye recepción, internet y uso del Members Lounge?",
    a: "Sí. La recepción, el WiFi y el acceso al Members Lounge forman parte de la experiencia para los miembros de La Ceiba.",
  },
  {
    q: "¿The Practice guarda expedientes clínicos?",
    a: "No. The Practice provee la infraestructura física y digital; la relación profesional y los expedientes de tus clientes son tuyos y bajo tu responsabilidad. No intervenimos en la relación clínica.",
  },
];

export default async function LaCeibaLandingPage() {
  const [plans, roomTypes] = await Promise.all([
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
  ]);

  const minHourly =
    roomTypes.length > 0 ? Math.min(...roomTypes.map((rt) => rt.baseHourlyPriceCents)) : null;

  return (
    <>
      {/* Persiste utm_*, fbclid y gclid para que lleguen con el lead. */}
      <CampaignCapture />

      {/* 1 · HERO */}
      <section className="bg-ink text-paper">
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="eyebrow-light">The Practice La Ceiba</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="clay" size="md">
                Preventa Founder
              </Badge>
              <Badge variant="outline" size="md" className="border-paper/25 text-paper/70">
                <MapPin className="h-3 w-3" />
                Plaza La Ceiba · Querétaro
              </Badge>
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Atiende en un espacio a tu altura, sin pagar renta fija.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/65">
              Espacios privados, equipados y listos para atender en Plaza La
              Ceiba. Pagas por hora o con membresía — con recepción,
              reservaciones digitales, micrositio y comunidad incluidos.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <TrackClick event="cta_click" params={{ placement: "hero", cta: "aplicar-founder" }}>
                <ButtonLink href="#aplicar" variant="light" size="xl">
                  Aplicar como Founder
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </TrackClick>
              <TrackClick event="cta_click" params={{ placement: "hero", cta: "conocer-espacios" }}>
                <ButtonLink href="#espacios" variant="outline-light" size="xl">
                  Conocer los espacios
                </ButtonLink>
              </TrackClick>
            </div>
            <p className="mt-6 text-sm text-paper/40">
              Aplicación gratuita · Cupo limitado por especialidad · Beneficios
              exclusivos de lanzamiento
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {PROFESSIONS.map((p) => (
                <Badge key={p} variant="outline" size="md" className="border-paper/20 text-paper/60">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <Image
                src="/images/room-talk.jpg"
                alt="Talk Room: sala privada para atender en The Practice La Ceiba"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <p className="mt-4 text-center font-display text-[10px] font-semibold tracking-[0.25em] text-paper/40 uppercase">
              The Practice La Ceiba · Talk Room
            </p>
          </div>
        </div>
      </section>

      {/* 2 · PROBLEMA → SOLUCIÓN */}
      <section className="border-b border-line bg-surface py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="El problema"
            title="Ejercer por tu cuenta no debería costarte un espacio vacío."
            description="Ni coworking genérico ni renta tradicional de oficinas: The Practice es infraestructura física y digital para profesionales independientes."
            align="center"
          />
          <div className="mx-auto mt-14 grid max-w-5xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-line bg-paper p-7">
              <p className="eyebrow">Hoy, como independiente</p>
              <ul className="mt-5 space-y-3">
                {PROBLEMS.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-stone-deep">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow text-clay-deep">En The Practice La Ceiba</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {SOLUTIONS.map((s) => (
                  <div key={s.title} className="rounded-2xl border border-line bg-paper p-5">
                    <h3 className="font-display text-sm font-bold">{s.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{s.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 · ESPACIOS (desde base de datos) */}
      {roomTypes.length > 0 && (
        <section id="espacios" className="container-page scroll-mt-20 py-20">
          <SectionHeading
            eyebrow="Los espacios"
            title="Un espacio para cada tipo de sesión."
            description="Salas para terapia individual, parejas, familias, consulta profesional, nutrición, masaje o wellness, y talleres o sesiones grupales."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {roomTypes.map((rt) => (
              <RoomTypeCard key={rt.id} roomType={rt} />
            ))}
          </div>
        </section>
      )}

      {/* 4 · THE MEMBERS LOUNGE — exclusivo de La Ceiba */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Exclusivo de La Ceiba</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The Members Lounge.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-deep">
              Una terraza de aproximadamente 150 m² pensada para tu día de
              trabajo, no una sala de espera: trabaja entre citas, toma un
              café, coincide con otros profesionales y participa en talleres y
              eventos de la comunidad.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Espacio de trabajo entre citas",
                "Café",
                "WiFi",
                "Networking",
                "Talleres y eventos",
                "Comunidad profesional",
              ].map((chip) => (
                <Badge key={chip} variant="outline" size="md">
                  {chip}
                </Badge>
              ))}
            </div>
            <p className="mt-7 max-w-lg text-xs leading-relaxed text-stone">
              Una característica única de nuestra Founding Location. Cada sede
              de la red tendrá su propio carácter.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <Image
                src="/images/lounge-la-ceiba.jpg"
                alt="The Members Lounge: terraza de aproximadamente 150 m² en The Practice La Ceiba"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5 · BENEFICIOS FOUNDER */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Beneficios Founder"
          title="Lo que aseguras al entrar en preventa."
          description="Beneficios exclusivos para los primeros profesionales de La Ceiba, conforme a los términos del programa Founder."
          align="center"
        />
        <div className="mx-auto mt-14 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FOUNDER_BENEFITS.map((b) => (
            <div key={b.title} className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)">
              <b.icon className="h-5 w-5 text-clay" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-sm font-bold">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · COMPARACIÓN ECONÓMICA */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page">
          <SectionHeading
            eyebrow="La comparación"
            title="Rentar tu propio espacio vs. The Practice."
            description="Sin cifras infladas: compara lo que asumes en cada modelo."
            align="center"
          />
          <div className="mx-auto mt-14 flex max-w-4xl flex-col items-stretch gap-4 lg:flex-row">
            <div className="flex-1 rounded-2xl border border-line bg-paper p-7">
              <p className="eyebrow">Consultorio u oficina en renta</p>
              <ul className="mt-5 space-y-3">
                {TRADITIONAL.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-stone-deep">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <ArrowRight className="mx-auto h-5 w-5 shrink-0 rotate-90 self-center text-clay lg:rotate-0" />
            <div className="flex-1 rounded-2xl border border-ink bg-ink p-7 text-paper shadow-(--shadow-lift)">
              <p className="eyebrow-light">The Practice</p>
              <ul className="mt-5 space-y-3">
                {THE_PRACTICE.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-paper/80">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sage" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7 · CÓMO FUNCIONA */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="De aplicación a Founder confirmado."
          description="La aplicación es el primer paso. WhatsApp es el canal de seguimiento — la validación y la reserva se hacen contigo, persona a persona."
          align="center"
        />
        <div className="mx-auto mt-14 max-w-2xl">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-sm font-bold text-paper">
                  {i + 1}
                </div>
                {i < HOW_IT_WORKS.length - 1 && <span className="my-1 w-px flex-1 bg-line-strong" />}
              </div>
              <div className={i < HOW_IT_WORKS.length - 1 ? "pb-8" : ""}>
                <h3 className="font-display text-base font-bold tracking-tight">{step.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-deep">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 8 · MEMBRESÍAS (desde base de datos) */}
      {plans.length > 0 && (
        <section id="membresias" className="scroll-mt-20 border-y border-line bg-surface py-20">
          <div className="container-page">
            <TrackView event="view_memberships" params={{ page: "la-ceiba" }} />
            <SectionHeading
              eyebrow="Membresías Founder"
              title="Precios de preventa."
              description="La tarifa Founder se conserva mientras tu membresía siga activa, conforme a los términos del programa. Y si prefieres no comprometerte, desde la apertura también podrás reservar por hora."
              align="center"
            />
            <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
              {plans.map((plan) => (
                <TrackClick
                  key={plan.id}
                  event="founder_reserve_click"
                  params={{ plan: plan.code }}
                >
                  <PlanCard plan={plan} showFounderPrice ctaHref="#aplicar" />
                </TrackClick>
              ))}
            </div>

            {/* Reserva por hora, sin membresía */}
            <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-line bg-paper p-7 sm:flex sm:items-center sm:justify-between sm:gap-6">
              <div>
                <h3 className="font-display text-base font-bold tracking-tight">
                  Reserva por hora, sin membresía
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-deep">
                  {minHourly != null
                    ? `Desde ${formatMXN(minHourly)} por hora desde la apertura. Sin permanencia: pagas solo lo que usas.`
                    : "Disponible desde la apertura. Sin permanencia: pagas solo lo que usas."}
                </p>
              </div>
              <TrackClick event="cta_click" params={{ placement: "membresias", cta: "por-hora" }}>
                <ButtonLink href="#aplicar" variant="outline" size="lg" className="mt-4 shrink-0 sm:mt-0">
                  Me interesa
                </ButtonLink>
              </TrackClick>
            </div>

            <p className="mt-8 text-center text-xs text-stone">
              Precios en MXN. Ver{" "}
              <Link href="/memberships" className="underline">
                membresías regulares
              </Link>{" "}
              para comparar ·{" "}
              <Link href="/memberships#calculadora" className="font-semibold text-clay underline">
                Calcula cuántas horas te da cada plan →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* 9 · FAQ */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Antes de aplicar." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={FAQ} />
        </div>
        <div className="mt-8 flex max-w-3xl flex-wrap items-center gap-4">
          <p className="text-sm text-stone-deep">¿Tienes otra duda?</p>
          <WhatsAppCta
            message={WHATSAPP_QUESTIONS_MESSAGE}
            placement="faq"
            variant="outline"
            size="md"
          >
            Resolver dudas por WhatsApp
          </WhatsAppCta>
        </div>
      </section>

      {/* 10 · FORMULARIO DE APLICACIÓN */}
      <section id="aplicar" className="scroll-mt-20 bg-ink py-20 lg:py-28">
        <div className="container-page grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow-light">Aplicación Founder</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Aplica como Founder de La Ceiba.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-paper/60">
              Cuéntanos de tu práctica. Revisamos compatibilidad y
              disponibilidad, te contactamos por WhatsApp y, si todo encaja,
              aseguras tu lugar Founder. Aplicar no te compromete a contratar.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-paper/70">
              <li>1 · Aplicas (2 minutos, gratis)</li>
              <li>2 · Revisamos tu especialidad y horarios</li>
              <li>3 · Te contactamos por WhatsApp</li>
              <li>4 · Confirmas tu lugar Founder</li>
            </ul>
          </div>
          <ApplyForm
            source="landing-la-ceiba"
            locationSlug="la-ceiba"
            membershipsHref="#membresias"
          />
        </div>
      </section>
    </>
  );
}
