import type { Metadata } from "next";
import { BadgeCheck, CalendarClock, Users } from "lucide-react";
import { ApplyForm } from "@/components/marketing/apply-form";

export const metadata: Metadata = {
  title: "Aplicar como practitioner",
  description:
    "Aplica para atender en The Practice: salas privadas premium, micrositio, directorio y herramientas para tu práctica.",
};

export default function ApplyPage() {
  return (
    <section className="container-page grid gap-14 py-16 lg:grid-cols-[0.85fr_1.15fr] lg:py-24">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <p className="eyebrow">Aplicación</p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Únete a la comunidad de The Practice.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-stone-deep">
          Cuéntanos de tu práctica. Revisamos cada aplicación para mantener una
          comunidad profesional, curada y de confianza.
        </p>

        <div className="mt-10 space-y-6">
          {[
            {
              icon: Users,
              title: "Comunidad curada",
              text: "Psicólogos, terapeutas, nutriólogos, coaches y especialistas en bienestar verificados.",
            },
            {
              icon: BadgeCheck,
              title: "Verificación en 48 horas",
              text: "Revisamos tu aplicación y te contactamos para una llamada breve de bienvenida.",
            },
            {
              icon: CalendarClock,
              title: "Empieza cuando quieras",
              text: "Sin plazos forzosos: por hora, paquete de horas o membresía mensual.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface shadow-(--shadow-card)">
                <item.icon className="h-4.5 w-4.5 text-clay" strokeWidth={1.75} />
              </div>
              <div>
                <h3 className="font-display text-sm font-bold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-stone-deep">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ApplyForm source="apply" />
    </section>
  );
}
