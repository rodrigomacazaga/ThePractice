import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
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
  title: "Membresías y precios",
  description:
    "Planes Flex, Pro, Premium y Resident. Paquetes de horas y precios por hora de sala. Sin renta fija, sin plazos forzosos.",
};

const PRICING_FAQ = [
  {
    q: "¿Cómo funcionan los créditos?",
    a: "Un crédito equivale a una hora de sala estándar (Talk o Consult). Las salas Premium y con TV consumen 1.5 créditos por hora; el Studio consume 2. Tu membresía carga créditos cada mes y puedes comprar paquetes adicionales.",
  },
  {
    q: "¿Las horas expiran?",
    a: "Las horas de membresía se renuevan cada mes con un límite de rollover según tu plan. Los paquetes de horas tienen una vigencia de 90 días por defecto.",
  },
  {
    q: "¿Qué pasa si cancelo una reserva?",
    a: "Cancelando con más de 24 horas de anticipación recuperas tus créditos completos. Cancelaciones tardías y no-shows consumen los créditos de la reserva, según la política vigente.",
  },
  {
    q: "¿Puedo cambiar de plan?",
    a: "Sí, puedes hacer upgrade en cualquier momento (aplica de inmediato) o downgrade al final de tu periodo actual.",
  },
  {
    q: "¿Hay permanencia mínima?",
    a: "No. Las membresías son mensuales y puedes cancelar al final de cualquier periodo. Los precios founder requieren mantener la membresía activa para conservarse.",
  },
  {
    q: "¿Las membresías incluyen locker?",
    a: "Sí. Toda membresía activa incluye un locker personal sin costo adicional para guardar tu material entre sesiones. Se asigna en tu ubicación principal y está sujeto a disponibilidad; el plan Resident incluye locker grande garantizado.",
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

  return (
    <>
      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Membresías y precios"
          title="Paga por lo que usas. Escala cuando quieras."
          description="Cuatro membresías, paquetes de horas y tarifas por hora. Todos los precios en MXN, configurados por ubicación."
          align="center"
        />
      </section>

      {/* PLANES */}
      {plans.length > 0 && (
        <section className="container-page pb-20">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
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
        </section>
      )}

      {/* CALCULADORA DE CRÉDITOS */}
      {plans.length > 0 && roomTypes.length > 0 && (
        <section id="calculadora" className="scroll-mt-20 border-t border-line bg-paper-deep/40 py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="La calculadora"
              title="Tus créditos, traducidos a horas."
              description="Cada membresía carga créditos a tu cuenta. Una hora de sala estándar consume 1 crédito; los espacios más grandes consumen más. Calcula cuánto te rinde cada plan."
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

      {/* PRECIO POR HORA */}
      {roomTypes.length > 0 && (
        <section className="border-y border-line bg-surface py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Sin membresía"
              title="Tarifas por hora de sala."
              description="¿Prefieres empezar sin plan? Reserva por hora con el plan Flex o compra un paquete."
            />
            <div className="mt-10 overflow-hidden rounded-2xl border border-line">
              <table className="w-full bg-paper text-sm">
                <thead className="border-b border-line bg-paper-deep/60">
                  <tr>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Tipo de sala</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Capacidad</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Precio/hora</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Con membresía</th>
                    <th className="px-6 py-4 text-left font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">Créditos/hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {roomTypes.map((rt) => (
                    <tr key={rt.id}>
                      <td className="px-6 py-4 font-display font-semibold">{rt.name}</td>
                      <td className="px-6 py-4 text-stone-deep">{rt.capacity} personas</td>
                      <td className="px-6 py-4">{formatMXN(rt.baseHourlyPriceCents)}</td>
                      <td className="px-6 py-4 text-sage">
                        {rt.memberHourlyPriceCents != null ? formatMXN(rt.memberHourlyPriceCents) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="clay">{formatCredits(rt.creditsPerHour)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* PAQUETES */}
      {packages.length > 0 && (
        <section className="container-page py-20">
          <SectionHeading
            eyebrow="Paquetes de horas"
            title="Compra horas por adelantado, ahorra por volumen."
            description="Los paquetes cargan créditos a tu cuenta con 90 días de vigencia."
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

      {/* ADD-ONS */}
      {addOns.length > 0 && (
        <section className="border-y border-line bg-surface py-20">
          <div className="container-page">
            <SectionHeading
              eyebrow="Add-ons"
              title="Extras para tu práctica."
              description="Agrega lockers, equipo y visibilidad a cualquier plan."
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

      {/* FAQ */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Reglas claras" title="Preguntas sobre precios." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={PRICING_FAQ} />
        </div>
        <div className="mt-16 flex flex-col items-center gap-4 rounded-2xl bg-ink p-10 text-center sm:p-14">
          <h2 className="font-display text-2xl font-bold tracking-tight text-paper sm:text-3xl">
            ¿No sabes qué plan elegir?
          </h2>
          <p className="max-w-md text-paper/60">
            Aplica y en la llamada de bienvenida te ayudamos a elegir según tus
            sesiones semanales.
          </p>
          <ButtonLink href="/apply" variant="light" size="xl" className="mt-4">
            Aplicar como practitioner
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
