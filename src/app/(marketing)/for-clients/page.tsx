import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CalendarCheck, DoorClosed, HeartHandshake } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PractitionerCard } from "@/components/marketing/practitioner-card";
import { FaqList } from "@/components/marketing/faq";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Para clientes",
  description:
    "Encuentra terapeutas, nutriólogos y coaches verificados. Reserva sesiones presenciales en espacios privados premium.",
};

const FAQ = [
  {
    q: "¿Los profesionales están verificados?",
    a: "Sí. Cada practitioner pasa por revisión de credenciales (cédula o certificación según su disciplina) antes de aparecer en el directorio.",
  },
  {
    q: "¿Cómo reservo una sesión?",
    a: "Entra al perfil del profesional, elige servicio y horario disponible, y confirma. Si el profesional tiene pagos online activos, pagas al reservar y recibes confirmación inmediata.",
  },
  {
    q: "¿Puedo cancelar o reagendar?",
    a: "Sí, según la política del profesional, visible en su perfil antes de reservar. La mayoría permite cambios con 24 horas de anticipación.",
  },
  {
    q: "¿Dónde son las sesiones?",
    a: "En las ubicaciones de The Practice: espacios privados, silenciosos y cómodos dentro de plazas premium con estacionamiento.",
  },
  {
    q: "¿The Practice da servicios de salud?",
    a: "No. The Practice provee espacios e infraestructura. Los servicios profesionales son responsabilidad directa de cada practitioner.",
  },
];

export default async function ForClientsPage() {
  const featured = await safeQuery(
    () =>
      db.practitionerProfile.findMany({
        where: { verificationStatus: "APPROVED", microsite: { published: true } },
        orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
        take: 3,
        include: {
          user: { select: { name: true, image: true } },
          locations: { include: { location: true } },
        },
      }),
    []
  );

  return (
    <>
      <section className="container-page py-20 lg:py-28">
        <div className="max-w-3xl">
          <p className="eyebrow">Para clientes</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            El profesional correcto, en un espacio que se siente bien.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-deep">
            Terapia, nutrición, coaching y bienestar con profesionales
            verificados. Sesiones privadas en espacios diseñados para
            conversaciones que importan.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/directory" size="xl">
              Explorar el directorio
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20">
        <div className="container-page grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: BadgeCheck, title: "Verificados", text: "Credenciales revisadas antes de publicar cada perfil." },
            { icon: CalendarCheck, title: "Reserva online", text: "Elige horario, paga seguro y recibe confirmación al instante." },
            { icon: DoorClosed, title: "Privacidad real", text: "Salas privadas con aislamiento acústico. Nada de cubículos." },
            { icon: HeartHandshake, title: "Sin presión", text: "Precios y políticas visibles. Tú eliges con calma." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-line bg-paper p-6">
              <f.icon className="h-5 w-5 text-clay" strokeWidth={1.75} />
              <h3 className="mt-3 font-display text-sm font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionHeading eyebrow="Directorio" title="Algunos de nuestros profesionales." />
            <ButtonLink href="/directory" variant="outline">
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <PractitionerCard key={p.id} practitioner={p} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-20 lg:pb-28">
        <SectionHeading eyebrow="Preguntas frecuentes" title="Antes de tu primera sesión." />
        <div className="mt-10 max-w-3xl">
          <FaqList items={FAQ} />
        </div>
      </section>
    </>
  );
}
