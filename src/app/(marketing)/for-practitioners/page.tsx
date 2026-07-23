import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CalendarClock, Globe2, Landmark, Lock, Wallet } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { FaqList } from "@/components/marketing/faq";
import { site, PUBLIC_LOCATION_STATUSES } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Para profesionales",
  description:
    "Atiende en una ubicación premium sin renta fija. Salas por hora o membresía, micrositio, directorio, reservas y cobros online.",
};

const FAQ = [
  {
    q: "¿Necesito firmar un contrato de renta?",
    a: "No. Pagas por hora, por paquete de horas o una membresía mensual que puedes cambiar o cancelar según las políticas del plan. Sin aval, sin depósito de renta, sin plazos forzosos.",
  },
  {
    q: "¿Qué incluye una sala?",
    a: "Mobiliario de calidad, privacidad acústica, luz cálida, WiFi, limpieza entre sesiones y acceso con código por reserva. Tú solo llegas a atender.",
  },
  {
    q: "¿Cómo consigo nuevos clientes?",
    a: "Con tu micrositio (thepractice.mx/p/tu-nombre) y el directorio público, donde los clientes buscan por especialidad, ubicación y disponibilidad. Los planes superiores incluyen perfil destacado.",
  },
  {
    q: "¿Puedo cobrar online a mis clientes?",
    a: "Sí. Desde el plan Pro, tus clientes pueden reservar y pagar online. El dinero de tus sesiones es tuyo; The Practice no cobra comisión sobre tus honorarios en el MVP.",
  },
  {
    q: "¿Qué pasa si no uso mis horas del mes?",
    a: "Cada plan define un límite de rollover: una parte de tus horas no usadas pasa al siguiente mes. Los detalles están en cada membresía.",
  },
  {
    q: "¿Puedo atender en varias ubicaciones?",
    a: "Sí. Tu membresía es de la red, no de una sola sede. Conforme abran nuevas ubicaciones podrás reservar en cualquiera.",
  },
];

export default async function ForPractitionersPage() {
  const [plans, roomTypes] = await Promise.all([
    safeQuery(
      () => db.membershipPlan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
      []
    ),
    safeQuery(
      () =>
        db.roomType.findMany({
          where: { active: true, location: { status: { in: [...PUBLIC_LOCATION_STATUSES] } } },
          orderBy: { sort: "asc" },
        }),
      []
    ),
  ]);

  const minHourly =
    roomTypes.length > 0 ? Math.min(...roomTypes.map((rt) => rt.baseHourlyPriceCents)) : 32000;

  return (
    <>
      {/* HERO */}
      <section className="bg-ink text-paper">
        <div className="container-page py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="eyebrow-light">Para profesionales</p>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Todo lo que necesita tu práctica.
              <span className="text-clay"> Menos la renta.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/65">
              Salas privadas premium, micrositio profesional, directorio,
              reservas y cobros online. Lanza, opera y escala tu práctica
              presencial pagando solo por lo que usas.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/apply" variant="light" size="xl">
                Aplicar como practitioner
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/memberships" variant="outline-light" size="xl">
                Ver precios
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      {/* NÚMEROS DEL PROBLEMA */}
      <section className="border-b border-line bg-surface">
        <div className="container-page grid gap-8 py-14 sm:grid-cols-3">
          {[
            { n: "$15,000+", d: "cuesta al mes un consultorio propio en zona premium, con servicios y mobiliario." },
            { n: "30–40%", d: "de las horas de un consultorio fijo se quedan vacías — pero la renta no baja." },
            { n: `desde ${formatMXN(minHourly)}`, d: "por hora de sala en The Practice, sin renta fija y con todo incluido." },
          ].map((item) => (
            <div key={item.n}>
              <p className="font-display text-4xl font-bold tracking-tight text-ink">{item.n}</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-deep">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* QUÉ OBTIENES */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading
          eyebrow="Qué obtienes"
          title="Infraestructura completa, no solo un espacio."
          align="center"
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Building2, title: "Ubicación premium", text: "Espacios diseñados en plazas de primer nivel. Tu consulta se ve como tu trabajo lo merece." },
            { icon: CalendarClock, title: "Reserva flexible", text: "Por hora, en bloques o con horarios recurrentes garantizados según tu plan." },
            { icon: Globe2, title: "Presencia digital", text: "Micrositio propio con SEO, perfil en el directorio y herramientas para compartir tu agenda." },
            { icon: Wallet, title: "Cobros online", text: "Tus clientes pagan al reservar. Confirmaciones y recordatorios automáticos reducen no-shows." },
            { icon: Lock, title: "Locker incluido", text: "Toda membresía incluye un locker para tu material, sin costo adicional. TV, proyector y kit de taller como add-ons cuando los necesites." },
            { icon: Landmark, title: "Facturación", text: "Recibos y facturas de tus pagos a The Practice, listos para tu contabilidad." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-paper-deep text-ink">
                <f.icon className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <h3 className="mt-4 font-display text-base font-bold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-deep">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SALAS */}
      {roomTypes.length > 0 && (
        <section className="border-y border-line bg-surface py-20 lg:py-28">
          <div className="container-page">
            <SectionHeading
              eyebrow="Tipos de sala"
              title="Elige la sala según la sesión."
              description="Cada tipo de sala consume créditos distintos. Tu membresía incluye horas que usas donde las necesites."
            />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {roomTypes.map((rt) => (
                <RoomTypeCard key={rt.id} roomType={rt} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PLANES */}
      {plans.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <SectionHeading
            eyebrow="Precios"
            title="Empieza por hora. Sube de plan cuando tenga sentido."
            description="Reserva por hora sin membresía. Si atiendes cada semana, Pro. Si tienes mayor volumen, Premium."
            align="center"
          />
          <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-stone-deep">
            <Link href="/memberships" className="font-semibold text-clay hover:underline">
              Ver todos los precios y la calculadora →
            </Link>
          </p>
        </section>
      )}

      {/* MICROSITIO PREVIEW */}
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Micrositio incluido"
              title="Tu página profesional, sin contratar a nadie."
              description="Desde el plan Pro obtienes un micrositio en thepractice.mx/p/tu-nombre: bio, servicios, precios, disponibilidad, reseñas y botón de reserva. Optimizado para búsqueda y para compartir."
            />
            <ButtonLink href="/p/ana-garcia" variant="outline" size="lg" className="mt-8">
              Ver micrositio de ejemplo
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          {/* Mock del micrositio */}
          <div className="rounded-2xl border border-line bg-paper p-3 shadow-(--shadow-lift)">
            <div className="rounded-xl bg-surface p-6">
              <div className="flex items-center gap-2 border-b border-line pb-3">
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
                <span className="ml-3 flex-1 rounded-md bg-paper px-3 py-1 font-mono text-[10px] text-stone-deep">
                  thepractice.mx/p/ana-garcia
                </span>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink font-display text-lg font-bold text-paper">
                  AG
                </span>
                <div>
                  <p className="font-display text-base font-bold">Ana García</p>
                  <p className="text-xs text-stone-deep">Psicóloga clínica · Ansiedad y burnout</p>
                </div>
                <span className="ml-auto rounded-full bg-sage-soft px-2.5 py-1 text-[10px] font-semibold text-sage">
                  Verificada
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {["Sesión individual", "Terapia de pareja", "Online"].map((s) => (
                  <div key={s} className="rounded-lg bg-paper px-2 py-3 text-center text-[10px] font-medium text-ink-mute">
                    {s}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-ink px-4 py-3 text-center font-display text-xs font-semibold text-paper">
                Reservar sesión →
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ + CTA */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Lo que todos preguntan." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={FAQ} />
        </div>
        <div className="mt-16 rounded-2xl bg-ink p-10 text-center sm:p-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            Aplica hoy. Atiende esta misma semana.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-paper/60">
            La verificación toma 48 horas. {site.founderClaim}
          </p>
          <ButtonLink href="/apply" variant="light" size="xl" className="mt-8">
            Aplicar como practitioner
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
