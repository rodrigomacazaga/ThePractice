import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, MapPin } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { formatMXN } from "@/lib/utils";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { PlanCard } from "@/components/marketing/plan-card";
import { RoomTypeCard } from "@/components/marketing/room-type-card";
import { FaqList } from "@/components/marketing/faq";
import { ApplyForm } from "@/components/marketing/apply-form";
import { WhatsAppCta } from "@/components/marketing/whatsapp-cta";
import { CampaignCapture, TrackClick, TrackView } from "@/components/analytics/track";
import { WHATSAPP_QUESTIONS_MESSAGE } from "@/lib/whatsapp";
import { parseLandingSections, type LandingSection } from "@/lib/landing";

export const dynamic = "force-dynamic";

/** Landing comercial de CUALQUIER ubicación: el contenido viene de la base. */
async function getLanding(slug: string) {
  return db.location.findUnique({
    where: { slug },
    include: {
      landing: true,
      roomTypes: { where: { active: true }, orderBy: { sort: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const location = await safeQuery(() => getLanding(slug), null);
  if (!location?.landing?.published) return { title: "No disponible", robots: { index: false } };

  const l = location.landing;
  const title = l.metaTitle ?? `${location.name} — ${site.tagline}`;
  const description =
    l.metaDescription ??
    location.description ??
    `Espacios privados y equipados en ${location.city}, ${location.state}.`;
  const images = l.ogImageUrl ? [l.ogImageUrl] : location.photos.slice(0, 1);

  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, images, type: "website", locale: "es_MX" },
    twitter: { card: "summary_large_image", title, description, images },
  };
}

function SectionBlock({ section }: { section: LandingSection }) {
  const items = section.items ?? [];

  if (section.type === "faq") {
    return (
      <section className="container-page py-20">
        <SectionHeading eyebrow="Preguntas frecuentes" title={section.title ?? "Antes de aplicar."} />
        <div className="mt-10 max-w-3xl">
          <FaqList
            items={items.map((i) => ({ q: i.title ?? "", a: i.text ?? "" })).filter((i) => i.q)}
          />
        </div>
      </section>
    );
  }

  if (section.type === "comparison") {
    const [a, b] = section.columns ?? [];
    if (!a || !b) return null;
    return (
      <section className="border-y border-line bg-surface py-20">
        <div className="container-page">
          <SectionHeading eyebrow="La comparación" title={section.title ?? ""} description={section.description} align="center" />
          <div className="mx-auto mt-14 flex max-w-4xl flex-col gap-4 lg:flex-row">
            {[a, b].map((col, idx) => (
              <div
                key={col.title}
                className={
                  idx === 1
                    ? "flex-1 rounded-2xl border border-ink bg-ink p-7 text-paper shadow-(--shadow-lift)"
                    : "flex-1 rounded-2xl border border-line bg-paper p-7"
                }
              >
                <p className={idx === 1 ? "eyebrow-light" : "eyebrow"}>{col.title}</p>
                <ul className="mt-5 space-y-3">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className={`flex gap-2.5 text-sm leading-relaxed ${idx === 1 ? "text-paper/80" : "text-stone-deep"}`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${idx === 1 ? "bg-sage" : "bg-line-strong"}`}
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (section.type === "highlight") {
    return (
      <section className="border-y border-line bg-surface py-20 lg:py-28">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className={section.imageUrl ? "order-2 lg:order-1" : ""}>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-5 max-w-lg text-base leading-relaxed text-stone-deep">
                {section.description}
              </p>
            )}
            <div className="mt-7 flex flex-wrap gap-2">
              {items.map((i) => (
                <Badge key={i.title ?? i.text} variant="outline" size="md">
                  {i.title ?? i.text}
                </Badge>
              ))}
            </div>
          </div>
          {section.imageUrl && (
            <div className="order-1 lg:order-2">
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
                <Image src={section.imageUrl} alt={section.title ?? ""} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (section.type === "process") {
    return (
      <section className="container-page py-20 lg:py-28">
        <SectionHeading eyebrow="Cómo funciona" title={section.title ?? ""} description={section.description} align="center" />
        <div className="mx-auto mt-14 max-w-2xl">
          {items.map((item, i) => (
            <div key={`${item.title}-${i}`} className="flex gap-5">
              <div className="flex flex-col items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-sm font-bold text-paper">
                  {i + 1}
                </div>
                {i < items.length - 1 && <span className="my-1 w-px flex-1 bg-line-strong" />}
              </div>
              <div className={i < items.length - 1 ? "pb-8" : ""}>
                <h3 className="font-display text-base font-bold tracking-tight">{item.title}</h3>
                {item.text && <p className="mt-1 text-sm leading-relaxed text-stone-deep">{item.text}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // problem | solution | benefits: rejilla de puntos
  const dark = section.type === "problem";
  return (
    <section className={dark ? "border-b border-line bg-surface py-20" : "container-page py-20"}>
      <div className={dark ? "container-page" : ""}>
        <SectionHeading
          eyebrow={dark ? "El problema" : section.type === "benefits" ? "Beneficios" : "La solución"}
          title={section.title ?? ""}
          description={section.description}
          align="center"
        />
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i, idx) => (
            <div key={`${i.title}-${idx}`} className="rounded-2xl border border-line bg-paper p-5">
              {i.title && (
                <h3 className="flex items-start gap-2 font-display text-sm font-bold">
                  {!dark && <Check className="mt-0.5 h-4 w-4 shrink-0 text-sage" strokeWidth={2.5} />}
                  {i.title}
                </h3>
              )}
              {i.text && <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{i.text}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default async function LocationLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const location = await safeQuery(() => getLanding(slug), null);
  if (!location?.landing?.published) notFound();

  const l = location.landing;
  const plans = await safeQuery(
    () =>
      db.membershipPlan.findMany({
        where: { active: true },
        orderBy: { sort: "asc" },
        include: { locationPrices: { where: { locationId: location.id, active: true } } },
      }),
    []
  );

  const sections = parseLandingSections(l.sections);
  const minHourly =
    location.roomTypes.length > 0
      ? Math.min(...location.roomTypes.map((rt) => rt.baseHourlyPriceCents))
      : null;

  return (
    <>
      <CampaignCapture />

      {/* HERO */}
      <section className="bg-ink text-paper">
        <div className="container-page grid items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <p className="eyebrow-light">{location.name}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {l.eyebrow && (
                <Badge variant="clay" size="md">
                  {l.eyebrow}
                </Badge>
              )}
              <Badge variant="outline" size="md" className="border-paper/25 text-paper/70">
                <MapPin className="h-3 w-3" />
                {[l.zone, location.city].filter(Boolean).join(" · ")}
              </Badge>
            </div>
            {l.headline && (
              <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {l.headline}
              </h1>
            )}
            {l.subheadline && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-paper/65">{l.subheadline}</p>
            )}
            <div className="mt-9 flex flex-wrap gap-3">
              <TrackClick event="cta_click" params={{ placement: "hero", location: location.slug }}>
                <ButtonLink href="#aplicar" variant="light" size="xl">
                  {l.primaryCtaLabel ?? "Aplicar ahora"}
                  <ArrowRight className="h-4 w-4" />
                </ButtonLink>
              </TrackClick>
              {location.roomTypes.length > 0 && (
                <ButtonLink href="#espacios" variant="outline-light" size="xl">
                  {l.secondaryCtaLabel ?? "Conocer los espacios"}
                </ButtonLink>
              )}
            </div>
            {l.supportText && <p className="mt-6 text-sm text-paper/40">{l.supportText}</p>}
          </div>
          {(l.heroImageUrl ?? location.photos[0]) && (
            <div>
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl shadow-(--shadow-lift)">
                <Image
                  src={l.heroImageUrl ?? location.photos[0]}
                  alt={location.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* BLOQUES CONFIGURABLES */}
      {sections
        .filter((s) => s.type !== "faq")
        .map((section, i) => (
          <SectionBlock key={`${section.type}-${i}`} section={section} />
        ))}

      {/* ESPACIOS: desde la base */}
      {location.roomTypes.length > 0 && (
        <section id="espacios" className="container-page scroll-mt-20 py-20">
          <SectionHeading
            eyebrow="Los espacios"
            title="Un espacio para cada tipo de sesión."
            description={`${location.roomTypes.length} tipos de sala disponibles en esta sede.`}
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {location.roomTypes.map((rt) => (
              <RoomTypeCard key={rt.id} roomType={rt} />
            ))}
          </div>
        </section>
      )}

      {/* MEMBRESÍAS: precio de la sede si existe override */}
      {plans.length > 0 && (
        <section id="membresias" className="scroll-mt-20 border-y border-line bg-surface py-20">
          <div className="container-page">
            <TrackView event="view_memberships" params={{ location: location.slug }} />
            <SectionHeading eyebrow="Membresías" title="Elige cómo empezar." align="center" />
            <div className="mx-auto mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
              {plans.map((plan) => {
                const override = plan.locationPrices[0];
                return (
                  <TrackClick key={plan.id} event="founder_reserve_click" params={{ plan: plan.code }}>
                    <PlanCard
                      plan={
                        override
                          ? {
                              ...plan,
                              monthlyPriceCents: override.monthlyPriceCents,
                              founderPriceCents: override.founderPriceCents,
                              includedCredits: override.includedCredits ?? plan.includedCredits,
                            }
                          : plan
                      }
                      showFounderPrice
                      ctaHref="#aplicar"
                    />
                  </TrackClick>
                );
              })}
            </div>
            {minHourly != null && (
              <p className="mt-8 text-center text-xs text-stone">
                También puedes reservar por hora desde {formatMXN(minHourly)} ·{" "}
                <Link href="/memberships" className="underline">
                  ver membresías regulares
                </Link>
              </p>
            )}
          </div>
        </section>
      )}

      {/* FAQ configurable */}
      {sections
        .filter((s) => s.type === "faq")
        .map((section, i) => (
          <SectionBlock key={`faq-${i}`} section={section} />
        ))}

      {sections.some((s) => s.type === "faq") && (
        <div className="container-page pb-10">
          <div className="flex max-w-3xl flex-wrap items-center gap-4">
            <p className="text-sm text-stone-deep">¿Tienes otra duda?</p>
            <WhatsAppCta
              message={WHATSAPP_QUESTIONS_MESSAGE}
              placement="faq"
              variant="outline"
              size="md"
              phone={l.whatsappPhone ?? undefined}
            >
              Resolver dudas por WhatsApp
            </WhatsAppCta>
          </div>
        </div>
      )}

      {/* FORMULARIO */}
      <section id="aplicar" className="scroll-mt-20 bg-ink py-20 lg:py-28">
        <div className="container-page grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="eyebrow-light">Aplicación</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Aplica en {location.shortName}.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-paper/60">
              Cuéntanos de tu práctica. Revisamos compatibilidad y disponibilidad, te contactamos
              por WhatsApp y, si todo encaja, aseguras tu lugar. Aplicar no te compromete a
              contratar.
            </p>
          </div>
          <ApplyForm
            source={`landing-${location.slug}`}
            locationSlug={location.slug}
            membershipsHref="#membresias"
          />
        </div>
      </section>
    </>
  );
}
