import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PractitionerCard } from "@/components/marketing/practitioner-card";
import { EmptyState } from "@/components/ui/empty-state";
import { DirectoryFilters } from "./filters";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Directorio de profesionales",
  description:
    "Encuentra psicólogos, terapeutas, nutriólogos y coaches verificados en The Practice. Filtra por especialidad, ubicación, modalidad y precio.",
};

interface Props {
  searchParams: Promise<{
    q?: string;
    specialty?: string;
    location?: string;
    modality?: string;
    accepting?: string;
    maxPrice?: string;
  }>;
}

export default async function DirectoryPage({ searchParams }: Props) {
  const sp = await searchParams;

  const where: Prisma.PractitionerProfileWhereInput = {
    verificationStatus: "APPROVED",
    microsite: { published: true },
  };

  if (sp.q) {
    where.OR = [
      { user: { name: { contains: sp.q, mode: "insensitive" } } },
      { headline: { contains: sp.q, mode: "insensitive" } },
      { specialties: { hasSome: [sp.q] } },
    ];
  }
  if (sp.specialty) where.specialties = { has: sp.specialty };
  if (sp.location) where.locations = { some: { location: { slug: sp.location } } };
  if (sp.modality === "IN_PERSON" || sp.modality === "ONLINE" || sp.modality === "HYBRID") {
    where.modality = sp.modality === "IN_PERSON" ? { in: ["IN_PERSON", "HYBRID"] } : sp.modality === "ONLINE" ? { in: ["ONLINE", "HYBRID"] } : "HYBRID";
  }
  if (sp.accepting === "1") where.acceptingClients = true;
  if (sp.maxPrice) {
    const max = Number(sp.maxPrice) * 100;
    if (!Number.isNaN(max) && max > 0) where.sessionPriceFromCents = { lte: max };
  }

  const [practitioners, locations, allSpecialties] = await Promise.all([
    safeQuery(
      () =>
        db.practitionerProfile.findMany({
          where,
          orderBy: [{ featured: "desc" }, { approvedAt: "asc" }],
          include: {
            user: { select: { name: true, image: true } },
            locations: { include: { location: true } },
          },
        }),
      []
    ),
    safeQuery(
      () => db.location.findMany({ where: { status: "OPEN" }, orderBy: { sort: "asc" } }),
      []
    ),
    safeQuery(async () => {
      const rows = await db.practitionerProfile.findMany({
        where: { verificationStatus: "APPROVED" },
        select: { specialties: true },
      });
      return [...new Set(rows.flatMap((r) => r.specialties))].sort();
    }, []),
  ]);

  return (
    <>
      <section className="container-page py-16 lg:py-20">
        <SectionHeading
          eyebrow="Directorio"
          title="Profesionales verificados."
          description="Cada perfil pasó por verificación de credenciales. Filtra y encuentra a la persona correcta para ti."
        />
      </section>

      <section className="container-page pb-24">
        <DirectoryFilters
          locations={locations.map((l) => ({ slug: l.slug, name: l.shortName }))}
          specialties={allSpecialties}
        />

        <div className="mt-8">
          {practitioners.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title="Sin resultados con esos filtros"
              description="Prueba ampliando la búsqueda o quitando algún filtro. Estamos sumando nuevos profesionales cada semana."
            />
          ) : (
            <>
              <p className="mb-5 text-sm text-stone-deep">
                {practitioners.length}{" "}
                {practitioners.length === 1 ? "profesional" : "profesionales"}
              </p>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {practitioners.map((p) => (
                  <PractitionerCard key={p.id} practitioner={p} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
