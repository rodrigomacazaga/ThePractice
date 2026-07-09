import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN, formatCredits } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { FaqList } from "@/components/marketing/faq";
import { CreditCalculator } from "@/components/marketing/credit-calculator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Precios",
  description:
    "Empieza sin compromiso: reserva por hora y paga solo por el tiempo que uses. Cuando conozcas tu ritmo, una membresía te dará más horas, mejor tarifa y presencia digital.",
};

const PRICING_FAQ = [
  {
    q: "¿Necesito una membresía para empezar?",
    a: "No. Empieza en modo pay as you go: reserva un espacio por hora y paga solo por el tiempo que uses, sin mensualidad ni permanencia. La membresía tiene sentido más adelante, cuando ya conoces tu ritmo y quieres más horas, mejor tarifa y presencia digital.",
  },
  {
    q: "¿Cuándo me conviene una membresía?",
    a: "Cuando ya usas The Practice varias veces al mes. A partir de cierto volumen, las horas incluidas y la tarifa de miembro cuestan menos que pagar por hora — y además sumas micrositio, directorio, comunidad y visibilidad. No hay que decidirlo el primer día.",
  },
  {
    q: "¿Cómo funcionan los créditos?",
    a: "Los créditos son la mecánica interna de las membresías: cada plan te da una bolsa mensual que puedes usar en cualquier espacio. Una hora de sala estándar consume 1 crédito; las salas premium 1.5 y el Studio o Movement 2. Así usas cualquier tipo de sala sin cambiar de plan.",
  },
  {
    q: "¿Las horas expiran?",
    a: "Las horas de membresía se renuevan cada mes con un límite de rollover según tu plan. Los paquetes de horas prepagadas tienen una vigencia de 90 días.",
  },
  {
    q: "¿Qué pasa si cancelo una reserva?",
    a: "Cancelando con más de 24 horas de anticipación recuperas tus horas completas. Cancelaciones tardías y no-shows consumen las horas de la reserva, según la política vigente.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí. Puedes subir de plan en cualquier momento (aplica de inmediato) o bajar al final de tu periodo actual. Empiezas donde quieras y te mueves conforme crece tu práctica.",
  },
  {
    q: "¿Hay permanencia mínima?",
    a: "No. Las membresías son mensuales y puedes cancelar al final de cualquier periodo. Los precios founder se conservan mientras mantengas tu membresía activa.",
  },
  {
    q: "¿Las membresías incluyen locker?",
    a: "Sí. Toda membresía activa incluye un locker personal sin costo adicional para guardar tu material entre sesiones. Se asigna en tu ubicación principal y está sujeto a disponibilidad.",
  },
];

export default async function MembershipsPage() {
  const [plans, packages, addOns, roomTypes] = await Promise.all([
    safeQuery(
      () => db.membershipPlan.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
      []
    ),
    safeQuery(
      () => db.hourPackage.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
      []
    ),
    safeQuery(() => db.addOn.findMany({ where: { active: true }, orderBy: { sort: "asc" } }), []),
    safeQuery(
      () => db.roomType.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
      []
    ),
  ]);

  const minHourly =
    roomTypes.length > 0 ? Math.min(...roomTypes.map((rt) => rt.baseHourlyPriceCents)) : 32000;

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Precios"
          title="Empieza sin compromiso. Elige el ritmo que hace sentido."
          description="No necesitas una membresía para empezar. Reserva por hora, conoce el espacio y descubre cuánto usas The Practice. Cuando tenga sentido, dar el siguiente paso será natural."
          align="center"
        />
      </section>

      {/* ============ PAY AS YOU GO (la puerta de entrada) ============ */}
      <section id="pay-as-you-go" className="container-page scroll-mt-24 pb-16">
        <div className="overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-(--shadow-lift)">
          <div className="grid lg:grid-cols-[1.3fr_1fr]">
            <div className="p-8 sm:p-10">
              <Badge variant="clay" size="md">
                Pay as you go · Sin membresía
              </Badge>
              <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Reserva por hora. Sin mensualidad.
              </h2>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-stone-deep">
                La forma más simple de empezar: reservas un espacio, lo usas y
                pagas solo por ese tiempo. Sin plan, sin permanencia, con la
                misma calidad de siempre.
              </p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  "Sin mensualidad ni permanencia",
                  "Pagas solo el tiempo que usas",
                  "Reserva cuando quieras",
                  "La misma calidad de espacios",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-ink-mute">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={2.5} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col justify-between gap-8 border-t border-line bg-paper p-8 sm:p-10 lg:border-t-0 lg:border-l">
              <div>
                <p className="eyebrow">Ideal para</p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-mute">
                  <li>Conocer The Practice</li>
                  <li>Empezar tu práctica profesional</li>
                  <li>Uso ocasional</li>
                  <li>Cuando aún defines tu ritmo</li>
                </ul>
              </div>
              <div>
                <p className="text-xs text-stone">Reserva</p>
                <p className="font-display text-3xl font-bold tracking-tight">
                  desde {formatMXN(minHourly)}
                  <span className="text-base font-semibold text-stone"> /hora</span>
                </p>
                <ButtonLink href="/apply" size="lg" className="mt-4 w-full">
                  Aplica y reserva tu primera sala
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ TARIFAS POR HORA (horas primero, sin créditos) ============ */}
      {roomTypes.length > 0 && (
        <section className="border-y border-line bg-surface py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Tarifas por hora"
              title="Lo que cuesta una hora, por tipo de espacio."
              description="Sin membresía pagas la tarifa por hora. Los espacios más amplios o equipados cuestan un poco más — y con membresía, todos bajan."
            />
            <div className="mt-10 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[560px] bg-paper text-sm">
                <thead className="border-b border-line bg-paper-deep/60">
                  <tr>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Tipo de espacio</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Capacidad</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Precio por hora</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Con membresía</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {roomTypes.map((rt) => (
                    <tr key={rt.id}>
                      <td className="px-6 py-4 font-display font-semibold">{rt.name}</td>
                      <td className="px-6 py-4 text-stone-deep">{rt.capacity} personas</td>
                      <td className="px-6 py-4 font-display font-bold">{formatMXN(rt.baseHourlyPriceCents)}</td>
                      <td className="px-6 py-4 text-sage">
                        {rt.memberHourlyPriceCents != null ? formatMXN(rt.memberHourlyPriceCents) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ============ PAQUETES (aún sin membresía — horas prepagadas) ============ */}
      {packages.length > 0 && (
        <section className="container-page py-20">
          <SectionHeading
            eyebrow="Sin membresía · Paquetes"
            title="¿Vas a venir seguido? Compra horas por adelantado."
            description="Prepaga horas y baja el costo por hora — sin mensualidad ni permanencia. Válidas 90 días. Es el paso intermedio natural antes de una membresía."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => {
              const perHour = Math.round(pkg.priceCents / pkg.hours);
              return (
                <div
                  key={pkg.id}
                  className="rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)"
                >
                  <p className="font-display text-3xl font-bold tracking-tight">
                    {formatCredits(pkg.hours)}
                    <span className="ml-1 text-base font-semibold text-stone">horas</span>
                  </p>
                  <p className="mt-4 font-display text-xl font-bold">{formatMXN(pkg.priceCents)}</p>
                  <p className="mt-1 text-xs text-stone-deep">
                    {formatMXN(perHour)} por hora · vigencia {pkg.validityDays} días
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ============ MEMBRESÍAS (el siguiente paso, como evolución) ============ */}
      {plans.length > 0 && (
        <section className="border-y border-line bg-surface py-20 lg:py-28">
          <div className="container-page">
            <SectionHeading
              eyebrow="Membresías"
              title="El siguiente paso, cuando ya conoces tu ritmo."
              description="Una membresía no es renta de horas: es acceso a la infraestructura, la tecnología, la comunidad y la red — con horas incluidas y la mejor tarifa. Pro para quien atiende cada semana; Premium para mayor volumen y prioridad."
              align="center"
            />

            <div className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>

            {/* LOCKER INCLUIDO */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-ink px-8 py-6 text-paper">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-clay">
                <Lock className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="max-w-xl text-center sm:text-left">
                <p className="font-display text-base font-bold">
                  Locker incluido en toda membresía
                </p>
                <p className="mt-0.5 text-sm text-paper/60">
                  Guarda tu material entre sesiones sin costo adicional. Se asigna
                  en tu ubicación principal, sujeto a disponibilidad.
                </p>
              </div>
            </div>

            <p className="mt-8 text-center text-sm text-stone-deep">
              Practitioners fundadores de La Ceiba:{" "}
              <Link href="/la-ceiba" className="font-semibold text-clay hover:underline">
                precios founder de por vida →
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ============ CRÉDITOS (la mecánica flexible, revelada al final) ============ */}
      {plans.length > 0 && roomTypes.length > 0 && (
        <section id="calculadora" className="scroll-mt-20 py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Cómo funcionan los créditos"
              title="Una bolsa de horas que rinde en cualquier espacio."
              description="Aquí entran los créditos, la mecánica interna de las membresías: tu plan te da una bolsa mensual que usas donde quieras. Una hora estándar cuesta 1 crédito; premium 1.5; studio o movement 2. Usas cualquier sala sin cambiar de plan."
              align="center"
            />
            <div className="mx-auto mt-10 max-w-4xl">
              <CreditCalculator
                plans={plans.map((p) => ({
                  code: p.code,
                  name: p.name,
                  credits: p.includedCredits,
                  highlighted: p.highlighted,
                }))}
                roomTypes={roomTypes.map((rt) => ({
                  code: rt.code,
                  name: rt.name,
                  creditsPerHour: rt.creditsPerHour,
                }))}
              />
            </div>
          </div>
        </section>
      )}

      {/* ============ ADD-ONS ============ */}
      {addOns.length > 0 && (
        <section className="border-y border-line bg-surface py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Add-ons"
              title="Extras para tu práctica."
              description="Agrega equipo y visibilidad a cualquier plan cuando lo necesites."
            />
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {addOns.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper p-5"
                >
                  <div>
                    <p className="font-display text-sm font-bold">{addon.name}</p>
                    {addon.description && (
                      <p className="mt-0.5 text-xs text-stone-deep">{addon.description}</p>
                    )}
                  </div>
                  <p className="shrink-0 font-display text-sm font-bold">
                    {formatMXN(addon.priceCents)}
                    <span className="block text-right font-sans text-[10px] font-normal text-stone">
                      {addon.billing === "MONTHLY" ? "/mes" : "único"}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ FAQ ============ */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Reglas claras" title="Preguntas sobre precios." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={PRICING_FAQ} />
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl bg-ink p-10 text-center sm:p-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            No tienes que decidir hoy.
          </h2>
          <p className="max-w-md text-paper/60">
            Aplica, reserva tu primera sala y descubre tu ritmo. El plan
            correcto será evidente después — y estaremos para ayudarte a elegir.
          </p>
          <ButtonLink href="/apply" variant="light" size="xl" className="mt-4">
            Aplica y reserva
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
