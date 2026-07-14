import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { safeQuery } from "@/lib/safe-query";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/marketing/section-heading";
import { RoomTypeCard } from "@/components/marketing/room-type-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Salas",
  description:
    "Talk Room, Consult Room, Premium Room y Studio. Espacios privados premium diseñados para terapia, consulta, coaching y talleres.",
};

export default async function RoomsPage() {
  const roomTypes = await safeQuery(
    () =>
      db.roomType.findMany({
        where: { active: true, location: { status: "OPEN" } },
        orderBy: { sort: "asc" },
      }),
    []
  );

  return (
    <>
      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="Los espacios"
          title="Salas diseñadas para tu tipo de sesión."
          description="Cada tipo de sala está pensado para una forma distinta de trabajar: conversación profunda, consulta profesional, sesiones de alto valor o grupos. Todas con privacidad acústica, luz cálida y mobiliario premium."
        />
      </section>

      <section className="container-page pb-20">
        <div className="grid gap-8 md:grid-cols-2">
          {roomTypes.map((rt) => (
            <RoomTypeCard key={rt.id} roomType={rt} />
          ))}
        </div>
      </section>

      <section className="border-t border-line bg-surface py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="El estándar"
            title="Lo que toda sala incluye."
            align="center"
          />
          <div className="mx-auto mt-10 grid max-w-3xl gap-x-12 gap-y-4 sm:grid-cols-2">
            {[
              "Privacidad acústica real",
              "Luz cálida regulable",
              "Mobiliario de diseño",
              "WiFi de alta velocidad",
              "Limpieza entre sesiones",
              "Clima individual",
              "Acceso con código por reserva",
              "Agua y coffee station en área común",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-ink-mute">
                <span className="h-1.5 w-1.5 rounded-full bg-clay" />
                {item}
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <ButtonLink href="/apply" size="xl">
              Aplicar para reservar salas
              <ArrowRight className="h-4 w-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
