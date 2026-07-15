import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { site } from "@/config/site";
import { ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "The Practice construye la infraestructura de la práctica privada moderna: espacios premium, tecnología y comunidad para profesionales del bienestar.",
};

export default function AboutPage() {
  return (
    <>
      <section className="container-page py-20 lg:py-28">
        <div className="max-w-3xl">
          <p className="eyebrow">Nosotros</p>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Creemos que ejercer por tu cuenta no debería sentirse como estar
            solo.
          </h1>
          <div className="mt-8 space-y-6 text-lg leading-relaxed text-stone-deep">
            <p>
              Miles de terapeutas, nutriólogos y coaches en México ejercen de
              forma independiente. Son excelentes en lo suyo — y aun así pasan
              una parte enorme de su semana lidiando con rentas, agendas,
              cobros, recordatorios y espacios que no están a la altura de su
              trabajo.
            </p>
            <p>
              The Practice existe para quitarles todo eso de encima. Construimos
              la infraestructura completa de una práctica privada moderna:
              espacios premium diseñados para conversaciones que importan,
              tecnología que hace que reservar y cobrar sea trivial, y un
              directorio que acerca clientes a profesionales verificados.
            </p>
            <p>
              Empezamos en Querétaro con The Practice La Ceiba. El plan es una
              red que crece ciudad por ciudad: {site.roadmapSedes.join(" y ")} y
              más sedes en evaluación — una sola membresía, muchas puertas.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-20">
        <div className="container-page">
          <p className="eyebrow">Principios</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Premium sin pretensión",
                text: "Los espacios se sienten de alto nivel, pero cálidos. La tecnología es potente, pero simple. Nada intimida, todo funciona.",
              },
              {
                title: "El practitioner primero",
                text: "El negocio funciona cuando al profesional le va bien. Cada decisión de producto empieza por su cuenta de resultados.",
              },
              {
                title: "Confianza verificable",
                text: "Verificamos credenciales, publicamos políticas claras y las reseñas requieren consentimiento. La confianza se construye con procesos.",
              },
            ].map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-paper p-7">
                <LogoMark className="h-6 w-6" tone="clay" />
                <h3 className="mt-4 font-display text-base font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-deep">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 text-center">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">
          ¿Construimos tu práctica juntos?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/apply" size="lg">
            Aplicar como practitioner
            <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink href="/contact" variant="outline" size="lg">
            Contactar al equipo
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
