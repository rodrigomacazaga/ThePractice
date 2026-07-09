import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarClock, Crown, Globe, MapPin, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { FaqList } from "@/components/marketing/faq";
import { ApplyForm } from "@/components/marketing/apply-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Membresías founder — The Practice La Ceiba",
  description:
    "Abre tu práctica privada en Plaza La Ceiba, Querétaro, sin firmar un contrato de renta. Cupo limitado de practitioners fundadores con precio preferente de por vida.",
};

const FOUNDER_FAQ = [
  {
    q: "¿Qué significa ser founder?",
    a: "Los primeros practitioners de La Ceiba obtienen precio preferente de por vida en su membresía, prioridad para elegir horarios recurrentes y presencia destacada en el directorio desde el día uno.",
  },
  {
    q: "¿Cuándo abre The Practice La Ceiba?",
    a: "Estamos en preventa. Los practitioners founders confirmados serán los primeros en reservar horarios antes de la apertura al público.",
  },
  {
    q: "¿Qué necesito para aplicar?",
    a: "Llenar el formulario. Si tu perfil encaja, agendamos una llamada de 15 minutos. La cédula o certificación se sube después, durante la verificación.",
  },
  {
    q: "¿Hay que pagar algo hoy?",
    a: "No. La aplicación es gratuita y sin compromiso. El lugar founder se asegura con un depósito reembolsable una vez que confirmemos tu lugar en la llamada.",
  },
  {
    q: "¿Cuántos lugares founder hay?",
    a: "El cupo es limitado por especialidad para que el directorio esté balanceado y todos los founders tengan demanda. Aplican criterios de curaduría.",
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

  return (
    <>
      {/* HERO */}
      <section className="bg-ink text-paper">
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="eyebrow-light">The Practice Network · Founding Location</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge variant="clay" size="md">
                Preventa founder
              </Badge>
              <Badge variant="outline" size="md" className="border-paper/25 text-paper/70">
                <MapPin className="h-3 w-3" />
                Plaza La Ceiba · Querétaro
              </Badge>
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Abre tu práctica en La Ceiba sin firmar una renta.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/65">
              Salas privadas premium, micrositio, directorio y reservas — listas
              desde el día uno. Sé de los primeros practitioners y asegura
              precio founder de por vida.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="#aplicar" variant="light" size="xl">
                Aplicar como founder
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="#membresias" variant="outline-light" size="xl">
                Ver membresías founder
              </ButtonLink>
            </div>
            <p className="mt-6 text-sm text-paper/40">
              Aplicación gratuita · Sin compromiso · Cupo limitado por especialidad
            </p>
          </div>
          <div>
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <Image
                src="/images/hero-space.jpg"
                alt="Corredor de salas privadas en The Practice La Ceiba"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
            <p className="mt-4 text-center font-display text-[10px] font-semibold tracking-[0.25em] text-paper/40 uppercase">
              The Practice La Ceiba · Salas privadas
            </p>
          </div>
        </div>
      </section>

      {/* BENEFICIOS FOUNDER */}
      <section className="border-b border-line bg-surface py-16">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Crown, title: "Precio de por vida", text: "Tu tarifa founder no sube mientras mantengas tu membresía activa." },
            { icon: CalendarClock, title: "Primero en elegir", text: "Horarios recurrentes prime asignados por orden de confirmación." },
            { icon: Globe, title: "Micrositio desde el día uno", text: "Tu página profesional lista antes de la apertura." },
            { icon: Sparkles, title: "Perfil destacado", text: "Visibilidad prioritaria en el directorio durante el lanzamiento." },
          ].map((b) => (
            <div key={b.title} className="rounded-2xl border border-line bg-paper p-6">
              <b.icon className="h-5 w-5 text-clay" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-sm font-bold">{b.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SALAS */}
      {roomTypes.length > 0 && (
        <section className="container-page py-20">
          <SectionHeading
            eyebrow="Los espacios"
            title="Las salas de La Ceiba."
            description="Seis tipos de sala: terapia individual, consulta, sesiones premium, masaje, movimiento y talleres grupales."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {roomTypes.map((rt) => (
              <RoomTypeCard key={rt.id} roomType={rt} />
            ))}
          </div>
        </section>
      )}

      {/* MEMBERS LOUNGE — exclusivo de La Ceiba */}
      <section className="border-b border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 lg:order-1">
            <p className="eyebrow">Exclusivo de La Ceiba</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              The Members Lounge.
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-deep">
              Una terraza de 150 m² pensada para que sigas conectado a tu
              práctica entre sesiones. No es coworking ni una sala de espera: es
              donde trabajas, piensas, aprendes y coincides con otros
              profesionales.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {[
                "Café de especialidad",
                "WiFi",
                "Espacio para trabajar",
                "Networking",
                "Vegetación",
                "Música",
              ].map((chip) => (
                <Badge key={chip} variant="outline" size="md">
                  {chip}
                </Badge>
              ))}
            </div>
            <p className="mt-7 max-w-lg text-xs leading-relaxed text-stone">
              Una característica única de nuestra Founding Location. Cada sede de
              la red tendrá su propio carácter.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
              <Image
                src="/images/lounge-la-ceiba.jpg"
                alt="The Members Lounge: terraza de 150 m² en The Practice La Ceiba"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* MEMBRESÍAS FOUNDER */}
      {plans.length > 0 && (
        <section id="membresias" className="scroll-mt-20 border-y border-line bg-surface py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Membresías founder"
              title="Precios de preventa. De por vida."
              description="Estos precios solo existen antes de la apertura y se conservan mientras tu membresía siga activa."
              align="center"
            />
            <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} showFounderPrice ctaHref="#aplicar" />
              ))}
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

      {/* PLATAFORMA */}
      <section className="container-page py-20">
        <SectionHeading
          eyebrow="Incluido en tu membresía"
          title="La infraestructura digital ya está construida."
          description="Micrositio, directorio, reservas de salas, créditos y cobros online. Nada que instalar, nada que configurar."
          align="center"
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { title: "Micrositio", text: "thepractice.mx/p/tu-nombre" },
            { title: "Directorio", text: "Clientes te encuentran por especialidad" },
            { title: "Reservas + pagos", text: "Agenda online con recordatorios" },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-6 text-center shadow-(--shadow-card)">
              <p className="font-display text-sm font-bold">{f.title}</p>
              <p className="mt-1 text-xs text-stone-deep">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Preguntas frecuentes" title="Sobre la preventa." />
          <div className="mt-10 max-w-3xl">
            <FaqList items={FOUNDER_FAQ} />
          </div>
        </div>
      </section>

      {/* FORMULARIO */}
      <section id="aplicar" className="scroll-mt-20 bg-ink py-20 lg:py-28">
        <div className="container-page grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow-light">Aplicación founder</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Asegura tu lugar en La Ceiba.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-paper/60">
              Llena el formulario y agenda una llamada de 15 minutos. Sin
              compromiso: conoces el espacio, los números y decides.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-paper/70">
              <li>1 · Aplicas (2 minutos)</li>
              <li>2 · Llamada de bienvenida (15 minutos)</li>
              <li>3 · Confirmas tu lugar founder</li>
              <li>4 · Atiendes desde la apertura</li>
            </ul>
          </div>
          <ApplyForm source="landing-la-ceiba" locationSlug="la-ceiba" />
        </div>
      </section>
    </>
  );
}
