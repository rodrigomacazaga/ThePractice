import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN, formatCredits } from "@/lib/utils";
import { PUBLIC_LOCATION_STATUSES } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section-heading";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cómo funciona",
  description:
    "De la aplicación a tu primera sesión: cómo funciona The Practice para practitioners y para clientes.",
};

export default async function HowItWorksPage() {
  const roomTypes = await safeQuery(
    () =>
      db.roomType.findMany({
        where: { active: true, location: { status: { in: [...PUBLIC_LOCATION_STATUSES] } } },
        orderBy: { sort: "asc" },
      }),
    []
  );

  return (
    <>
      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Cómo funciona"
          title="Simple por diseño."
          description="Dos caminos, una misma infraestructura: profesionales que atienden y clientes que encuentran."
        />
      </section>

      {/* PRACTITIONERS */}
      <section className="border-y border-line bg-surface py-16 lg:py-20">
        <div className="container-page">
          <p className="eyebrow">Si eres profesional</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-4">
            {[
              { step: "01", title: "Aplica", text: "Llena el formulario con tu especialidad y experiencia para asegurar tu lugar founder. Te contactamos para validar tu perfil." },
              { step: "02", title: "Verifica", text: "Sube tu cédula o certificación. La verificación protege a toda la comunidad." },
              { step: "03", title: "Elige tu plan", text: "Por hora, paquete de horas o membresía mensual con micrositio y directorio." },
              { step: "04", title: "Atiende", text: "Reserva salas desde tu panel, entra con tu código y atiende. Nosotros operamos el resto." },
            ].map((s) => (
              <div key={s.step} className="relative rounded-2xl border border-line bg-paper p-7">
                <span className="font-display text-4xl font-bold text-line-strong">{s.step}</span>
                <h3 className="mt-3 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-deep">{s.text}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/apply" size="lg" className="mt-10">
            Aplicar como practitioner
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      {/* CLIENTES */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <p className="eyebrow">Si buscas un profesional</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-4">
            {[
              { step: "01", title: "Busca", text: "Filtra el directorio por especialidad, ubicación, modalidad y precio." },
              { step: "02", title: "Compara", text: "Revisa perfiles verificados: bio, credenciales, servicios y reseñas." },
              { step: "03", title: "Reserva", text: "Elige horario disponible y paga online si el profesional lo tiene activo." },
              { step: "04", title: "Asiste", text: "Llega a tu sesión en un espacio privado y cómodo. Recibe recordatorios automáticos." },
            ].map((s) => (
              <div key={s.step} className="relative rounded-2xl border border-line bg-surface p-7 shadow-(--shadow-card)">
                <span className="font-display text-4xl font-bold text-line-strong">{s.step}</span>
                <h3 className="mt-3 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-deep">{s.text}</p>
              </div>
            ))}
          </div>
          <ButtonLink href="/la-ceiba#aplicar" variant="outline" size="lg" className="mt-10">
            Estamos en preventa: déjanos tus datos
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
        </div>
      </section>

      {/* CRÉDITOS EXPLICADOS */}
      <section className="border-t border-line bg-ink py-16 text-paper lg:py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="El sistema de horas"
            title="Un crédito = una hora de sala estándar."
            description="Las salas premium y de taller consumen más créditos por hora. Así tu membresía es flexible: usa tus horas donde más valor te den."
            tone="paper"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roomTypes.map((rt) => (
              <div key={rt.id} className="rounded-2xl border border-paper/10 bg-paper/5 p-6">
                <p className="text-sm text-paper/60">{rt.name}</p>
                <p className="mt-2 font-display text-xl font-bold text-clay">
                  {formatCredits(rt.creditsPerHour)}{" "}
                  {rt.creditsPerHour === 1 ? "crédito" : "créditos"}/hora
                </p>
                <p className="mt-1 text-xs text-paper/50">
                  {formatMXN(rt.baseHourlyPriceCents)} /hora
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-paper/40">
            Las tasas de consumo son configurables y pueden variar por ubicación. Consulta tu panel.
          </p>
        </div>
      </section>
    </>
  );
}
