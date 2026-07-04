import type { Metadata } from "next";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { SectionHeading } from "@/components/marketing/section-heading";
import { LocationCard } from "@/components/marketing/location-card";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ubicaciones",
  description:
    "The Practice La Ceiba en Querétaro, y próximamente Juriquilla, Zibatá y más. Una red de espacios premium para tu práctica.",
};

export default async function LocationsPage() {
  const locations = await safeQuery(
    () =>
      db.location.findMany({
        where: { status: { not: "CLOSED" } },
        orderBy: { sort: "asc" },
        include: { _count: { select: { rooms: true } } },
      }),
    []
  );

  return (
    <>
      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Ubicaciones"
          title="Una red de espacios, una sola membresía."
          description="Tu membresía funciona en toda la red. Cada nueva ubicación amplía dónde puedes atender — sin costos extra."
        />
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              roomCount={location._count.rooms}
            />
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
          <h3 className="font-display text-lg font-bold">¿Dónde deberíamos abrir después?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-deep">
            Estamos evaluando Juriquilla, Zibatá, Polanco y San Pedro.
            Cuéntanos dónde atiendes y prioricemos tu zona.
          </p>
          <ButtonLink href="/contact" variant="outline" size="lg" className="mt-6">
            Sugerir una zona
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
