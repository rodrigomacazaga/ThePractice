import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  Clock,
  GraduationCap,
  MapPin,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN, hourLabel } from "@/lib/utils";
import { site } from "@/config/site";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MicrositeContact } from "./contact";
import { ShareButton } from "./share-button";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const modalityLabel = { IN_PERSON: "Presencial", ONLINE: "Online", HYBRID: "Presencial y online" } as const;

async function getProfile(slug: string) {
  return safeQuery(
    () =>
      db.practitionerProfile.findFirst({
        where: { slug, verificationStatus: "APPROVED", microsite: { published: true } },
        include: {
          user: { select: { name: true, image: true } },
          microsite: true,
          services: { where: { active: true }, orderBy: { sort: "asc" } },
          availability: { orderBy: [{ weekday: "asc" }, { startHour: "asc" }] },
          locations: { include: { location: true } },
          reviews: {
            where: { status: "PUBLISHED" },
            orderBy: { createdAt: "desc" },
            take: 6,
          },
        },
      }),
    null
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return { title: "Perfil no encontrado" };

  const title =
    profile.microsite?.seoTitle ??
    `${profile.user.name} — ${profile.headline ?? profile.specialties[0] ?? "Practitioner"}`;
  const description =
    profile.microsite?.seoDescription ??
    profile.bio?.slice(0, 155) ??
    `${profile.user.name} atiende en The Practice. Reserva tu sesión.`;

  return {
    title,
    description,
    alternates: { canonical: `${site.url}/p/${slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `${site.url}/p/${slug}`,
      images: profile.microsite?.ogImageUrl
        ? [{ url: profile.microsite.ogImageUrl }]
        : undefined,
    },
  };
}

/**
 * JSON-LD sin dangerouslySetInnerHTML: escapamos &, <, > como secuencias
 * unicode (JSON válido) para que React no tenga nada que escapar y el
 * contenido no pueda romper el contexto <script>.
 */
function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data)
    .replace(/&/g, "\\u0026")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");
  return <script type="application/ld+json" suppressHydrationWarning>{json}</script>;
}

export default async function MicrositePage({ params }: Props) {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) notFound();

  const avgRating =
    profile.reviews.length > 0
      ? profile.reviews.reduce((sum, r) => sum + r.rating, 0) / profile.reviews.length
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: profile.user.name,
    description: profile.bio ?? undefined,
    url: `${site.url}/p/${slug}`,
    address: profile.locations[0]
      ? {
          "@type": "PostalAddress",
          addressLocality: profile.locations[0].location.city,
          addressRegion: profile.locations[0].location.state,
          addressCountry: "MX",
        }
      : undefined,
    aggregateRating:
      avgRating != null
        ? {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: profile.reviews.length,
          }
        : undefined,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      {/* HEADER DEL PERFIL */}
      <section className="border-b border-line bg-surface">
        <div className="container-page py-14 lg:py-18">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Avatar
                name={profile.user.name}
                src={profile.photoUrl ?? profile.user.image}
                size={96}
                className="shadow-(--shadow-card)"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-3xl font-bold tracking-tight">
                    {profile.user.name}
                  </h1>
                  <Badge variant="sage" size="md">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verificado
                  </Badge>
                  {profile.featured && (
                    <Badge variant="clay" size="md">
                      Destacado
                    </Badge>
                  )}
                </div>
                {profile.headline && (
                  <p className="mt-2 text-lg text-stone-deep">{profile.headline}</p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-stone-deep">
                  {profile.locations.map((pl) => (
                    <span key={pl.locationId} className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      The Practice {pl.location.shortName}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    {modalityLabel[profile.modality]}
                  </span>
                  {profile.yearsExperience != null && (
                    <span className="flex items-center gap-1.5">
                      <GraduationCap className="h-4 w-4" />
                      {profile.yearsExperience} años de experiencia
                    </span>
                  )}
                  {avgRating != null && (
                    <span className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 fill-amber-warm text-amber-warm" />
                      {avgRating.toFixed(1)} ({profile.reviews.length})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <ShareButton name={profile.user.name} slug={slug} />
              <a
                href="#contacto"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-ink px-7 font-display text-sm font-semibold text-paper transition-colors hover:bg-ink-soft"
              >
                {profile.microsite?.allowBooking ? "Reservar sesión" : "Contactar"}
              </a>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {profile.specialties.map((s) => (
              <Badge key={s} size="md">
                {s}
              </Badge>
            ))}
            {profile.acceptingClients ? (
              <Badge variant="sage" size="md">
                Acepta nuevos clientes
              </Badge>
            ) : (
              <Badge variant="amber" size="md">
                Lista de espera
              </Badge>
            )}
          </div>
        </div>
      </section>

      {/* CUERPO */}
      <section className="container-page grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr] lg:py-18">
        <div className="space-y-12">
          {/* BIO */}
          {profile.bio && (
            <div>
              <h2 className="eyebrow">Sobre mí</h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed whitespace-pre-line text-ink-mute">
                {profile.bio}
              </p>
            </div>
          )}

          {/* SERVICIOS */}
          {profile.services.length > 0 && (
            <div>
              <h2 className="eyebrow">Servicios y precios</h2>
              <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-surface">
                {profile.services.map((service) => (
                  <div
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-5"
                  >
                    <div>
                      <p className="font-display text-sm font-bold">{service.name}</p>
                      <p className="mt-0.5 text-xs text-stone-deep">
                        {service.durationMin} min ·{" "}
                        {modalityLabel[service.modality]}
                        {service.description ? ` · ${service.description}` : ""}
                      </p>
                    </div>
                    {(profile.microsite?.showPrices ?? true) && (
                      <p className="font-display text-base font-bold">
                        {formatMXN(service.priceCents)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CREDENCIALES */}
          {profile.credentialsText && (
            <div>
              <h2 className="eyebrow">Formación y credenciales</h2>
              <div className="mt-4 flex gap-3 rounded-2xl border border-line bg-surface p-6">
                <ShieldCheck className="h-5 w-5 shrink-0 text-sage" strokeWidth={1.75} />
                <p className="text-sm leading-relaxed whitespace-pre-line text-ink-mute">
                  {profile.credentialsText}
                </p>
              </div>
            </div>
          )}

          {/* RESEÑAS */}
          {(profile.microsite?.showReviews ?? true) && profile.reviews.length > 0 && (
            <div>
              <h2 className="eyebrow">Reseñas</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {profile.reviews.map((review) => (
                  <div key={review.id} className="rounded-2xl border border-line bg-surface p-6">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={
                            i < review.rating
                              ? "h-3.5 w-3.5 fill-amber-warm text-amber-warm"
                              : "h-3.5 w-3.5 text-line-strong"
                          }
                        />
                      ))}
                    </div>
                    {review.comment && (
                      <p className="mt-3 text-sm leading-relaxed text-ink-mute">
                        “{review.comment}”
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* POLÍTICAS */}
          {profile.policiesText && (
            <div>
              <h2 className="eyebrow">Políticas</h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed whitespace-pre-line text-stone-deep">
                {profile.policiesText}
              </p>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {/* DISPONIBILIDAD */}
          {profile.availability.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                <Clock className="h-4 w-4 text-clay" />
                Horarios disponibles
              </h3>
              <div className="mt-4 space-y-2.5">
                {profile.availability.map((slot) => (
                  <div key={slot.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink-mute">{WEEKDAYS[slot.weekday]}</span>
                    <span className="font-medium">
                      {hourLabel(slot.startHour)}–{hourLabel(slot.endHour)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-stone">Los horarios se confirman al reservar.</p>
            </div>
          )}

          {/* CONTACTO / RESERVA */}
          <div id="contacto" className="scroll-mt-24">
            <MicrositeContact
              practitionerSlug={slug}
              practitionerName={profile.user.name}
              allowBooking={profile.microsite?.allowBooking ?? false}
            />
          </div>

          <p className="px-2 text-[11px] leading-relaxed text-stone">
            {profile.user.name} es un practitioner independiente. The Practice
            provee el espacio y la plataforma; los servicios profesionales son
            responsabilidad del practitioner.
          </p>
        </aside>
      </section>
    </>
  );
}
