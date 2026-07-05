import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PractitionerCard } from "@/components/marketing/practitioner-card";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const location = await safeQuery(
    () => db.location.findUnique({ where: { slug } }),
    null
  );
  if (!location) return { title: "Ubicación" };
  return {
    title: location.name,
    description:
      location.description ??
      `${location.name}: salas privadas premium para terapia, wellness y coaching en ${location.city}.`,
  };
}

export default async function LocationDetailPage({ params }: Props) {
  const { slug } = await params;
  const location = await safeQuery(
    () =>
      db.location.findUnique({
        where: { slug },
        include: {
          rooms: {
            where: { active: true },
            include: { roomType: true },
            orderBy: { name: "asc" },
          },
        },
      }),
    null
  );

  if (!location) notFound();

  const practitioners = await safeQuery(
    () =>
      db.practitionerProfile.findMany({
        where: {
          verificationStatus: "APPROVED",
          microsite: { published: true },
          locations: { some: { locationId: location.id } },
        },
        take: 6,
        orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
        include: {
          user: { select: { name: true, image: true } },
          locations: { include: { location: true } },
        },
      }),
    []
  );

  const isOpen = location.status === "OPEN";

  return (
    <>
      {/* HERO */}
      <section className="bg-ink text-paper">
        <div className="container-page grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-24">
          <div>
            <Badge variant={isOpen ? "sage" : "amber"}>
              {isOpen ? "Abierto" : "Próximamente"}
            </Badge>
            <p className="mt-6 eyebrow-light">The Practice</p>
            <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {location.shortName}
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-paper/65">
              {location.description}
            </p>
            <div className="mt-7 space-y-2 text-sm text-paper/70">
              {location.address && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-clay" />
                  {location.address}, {location.city}, {location.state}
                </p>
              )}
              <p className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-clay" />
                Lunes a sábado · {location.openingHour}:00–{location.closingHour}:00
              </p>
            </div>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={slug === "la-ceiba" ? "/la-ceiba" : "/apply"} variant="light" size="lg">
                {slug === "la-ceiba" ? "Membresías founder" : "Aplicar aquí"}
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
              <ButtonLink href="/directory" variant="outline-light" size="lg">
                Ver profesionales
              </ButtonLink>
            </div>
          </div>
          <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
            <Image
              src="/images/common-area.jpg"
              alt={`Área común de ${location.name}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* AMENIDADES */}
      {location.amenities.length > 0 && (
        <section className="border-b border-line bg-surface">
          <div className="container-page flex flex-wrap gap-2.5 py-8">
            {location.amenities.map((a) => (
              <Badge key={a} variant="outline" size="md">
                {a}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* SALAS */}
      {location.rooms.length > 0 && (
        <section className="container-page py-20">
          <SectionHeading
            eyebrow="Salas en esta ubicación"
            title={`${location.rooms.length} salas privadas.`}
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {location.rooms.map((room) => (
              <div
                key={room.id}
                className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">{room.name}</h3>
                  <Badge>{room.roomType.name}</Badge>
                </div>
                {room.description && (
                  <p className="mt-2 text-sm text-stone-deep">{room.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {room.amenities.slice(0, 4).map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </div>
                <p className="mt-4 font-display text-sm font-bold">
                  {formatMXN(room.hourlyPriceCentsOverride ?? room.roomType.baseHourlyPriceCents)}
                  <span className="font-sans text-xs font-normal text-stone"> /hora</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRACTITIONERS */}
      {practitioners.length > 0 && (
        <section className="border-t border-line bg-surface py-20">
          <div className="container-page">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <SectionHeading
                eyebrow="Comunidad"
                title={`Profesionales en ${location.shortName}.`}
              />
              <ButtonLink href="/directory" variant="outline">
                Ver directorio completo
                <ArrowRight className="h-4 w-4" />
              </ButtonLink>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {practitioners.map((p) => (
                <PractitionerCard key={p.id} practitioner={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
