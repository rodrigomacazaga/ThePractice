import type { Metadata } from "next";
import { Instagram, Mail, MapPin } from "lucide-react";
import { site } from "@/config/site";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Escríbenos: dudas sobre membresías, la preventa de La Ceiba, prensa o alianzas.",
};

export default function ContactPage() {
  return (
    <section className="container-page grid gap-14 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
      <div>
        <p className="eyebrow">Contacto</p>
        <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Hablemos.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-stone-deep">
          Dudas sobre membresías, la preventa de La Ceiba, prensa o alianzas.
          Respondemos en menos de 24 horas hábiles.
        </p>
        <div className="mt-10 space-y-4 text-sm">
          <a
            href={`mailto:${site.email}`}
            className="flex items-center gap-3 text-ink-mute transition-colors hover:text-ink"
          >
            <Mail className="h-4 w-4 text-clay" /> {site.email}
          </a>
          <a
            href={site.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 text-ink-mute transition-colors hover:text-ink"
          >
            <Instagram className="h-4 w-4 text-clay" /> @thepractice.mx
          </a>
          <p className="flex items-center gap-3 text-ink-mute">
            <MapPin className="h-4 w-4 text-clay" /> Plaza La Ceiba, Querétaro, México
          </p>
        </div>
      </div>
      <ContactForm />
    </section>
  );
}
