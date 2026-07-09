import type { Metadata } from "next";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { SectionHeading } from "@/components/marketing/section-heading";
import { LocationCard } from "@/components/marketing/location-card";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The Practice Network",
  description:
    "The Practice nació para ser una red de espacios para profesionales independientes. La Ceiba es nuestra Founding Location en Querétaro; Juriquilla y Centro Sur vienen en camino.",
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
          eyebrow="The Practice Network"
          title="No abrimos sucursales. Construimos una red."
          description="The Practice nació para convertirse en una red de espacios para profesionales independientes. Una sola membresía funciona en toda la red — cada nueva sede amplía dónde puedes atender, sin costos extra."
        />
      </section>

      <section className="container-page pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              roomCount={location._count.rooms}
              founding={location.slug === "la-ceiba"}
            />
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center">
          <h3 className="font-display text-lg font-bold">¿Dónde debería crecer la red?</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-stone-deep">
            Estamos evaluando las próximas sedes. Cuéntanos dónde atiendes y
            ayúdanos a priorizar tu zona.
          </p>
          <ButtonLink href="/contact" variant="outline" size="lg" className="mt-6">
            Sugerir una zona
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
