import type { Metadata } from "next";
import Image from "next/image";
import { LogoMark, Wordmark } from "@/components/brand/logo";
import { site } from "@/config/site";
import { PrintButton } from "./print-button";

const DOC_DESCRIPTION =
  "Documento informativo del concepto The Practice para proceso de arrendamiento.";

export const metadata: Metadata = {
  title: "The Practice La Ceiba — Concepto",
  description: DOC_DESCRIPTION,
  robots: { index: false, follow: false },
  // Sobreescribe la descripción del sitio (que menciona giros) para que el
  // Open Graph/Twitter de este documento sea neutral, no solo el contenido visible.
  openGraph: { title: "The Practice La Ceiba — Concepto", description: DOC_DESCRIPTION },
  twitter: { title: "The Practice La Ceiba — Concepto", description: DOC_DESCRIPTION },
};

// Contenido estructural del documento (institucional, sin información comercial).
const OPERACION = [
  { title: "Acceso bajo reservación", text: "Cada uso se agenda previamente; no hay entrada libre al público." },
  { title: "Usuarios autorizados", text: "Únicamente profesionales verificados y sus clientes con cita." },
  { title: "Administración centralizada", text: "Un solo operador coordina agenda, accesos y estándares de uso." },
  { title: "Limpieza entre usos", text: "Cada espacio se prepara y ordena antes de la siguiente sesión." },
  { title: "Horarios ordenados", text: "Actividad programada, sin flujo masivo ni aglomeraciones." },
  { title: "Reglas internas de uso", text: "Lineamientos claros de conducta, ruido e imagen del espacio." },
];

const ESPACIOS = [
  "Salas privadas para conversación y consulta individual.",
  "Salas para sesiones profesionales, con mobiliario y equipamiento adecuados.",
  "Espacios de mayor capacidad para talleres pequeños o sesiones grupales controladas.",
  "Área común de recepción y espera.",
  "Una terraza tipo lounge, como espacio complementario para los usuarios autorizados.",
];

const COMPATIBILIDAD = [
  "Atrae usuarios de perfil profesional y clientes que acuden con cita.",
  "Genera visitas recurrentes y ordenadas a lo largo del día.",
  "Complementa los servicios existentes de la plaza.",
  "Eleva la percepción de sofisticación del inmueble.",
  "Activa el espacio sin operación ruidosa ni actividad nocturna problemática.",
  "No depende de alto tráfico peatonal, ni genera filas o aglomeraciones.",
  "Mantiene una imagen cuidada y discreta en todo momento.",
];

const PERFIL = [
  "Profesionales independientes verificados.",
  "Clientes que asisten por cita, no por impulso.",
  "Usuarios de nivel medio y alto.",
  "Flujo principalmente programado y de bajo volumen simultáneo.",
];

const ESTANDARES = [
  "Cuidado de la imagen y el mantenimiento del local.",
  "Limpieza y orden permanentes.",
  "Control de ruido y ambiente tranquilo.",
  "Respeto al reglamento y a los lineamientos de la plaza.",
  "Señalética sobria y acorde a la imagen del inmueble.",
  "Operación discreta y por cita.",
  "Cumplimiento de los lineamientos aplicables.",
  "Coordinación continua con la administración de la plaza.",
];

const BENEFICIOS = [
  { title: "Un solo arrendatario formal", text: "Un interlocutor profesional y responsable, no múltiples inquilinos." },
  { title: "Concepto diferenciado", text: "Una propuesta premium que aporta identidad al inmueble." },
  { title: "Bajo impacto operativo", text: "Uso ordenado, silencioso y por reservación." },
  { title: "Vocación de permanencia", text: "Un proyecto pensado para el largo plazo en La Ceiba." },
];

function Marker() {
  return <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />;
}

export default function ConceptLaCeibaPage() {
  return (
    <div className="min-h-dvh bg-paper">
      {/* Barra utilitaria — solo pantalla */}
      <div className="border-b border-line bg-surface print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark />
          </div>
          <PrintButton />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-14 sm:px-10 sm:py-16">
        {/* ============ PORTADA ============ */}
        <section className="break-after-page">
          <div className="flex items-center gap-2.5">
            <LogoMark />
            <Wordmark withTagline />
          </div>

          <div className="mt-16">
            <p className="eyebrow">Documento de concepto · Proceso de arrendamiento</p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              The Practice La Ceiba
            </h1>
            <p className="mt-4 font-display text-lg font-semibold text-stone-deep sm:text-xl">
              Espacios profesionales privados bajo reservación
            </p>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
              Una propuesta de infraestructura profesional para especialistas
              independientes, diseñada para operar con orden, calidad y
              compatibilidad dentro de Plaza La Ceiba.
            </p>
          </div>

          <figure className="mt-12 break-inside-avoid">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line">
              <Image
                src="/images/room-premium.jpg"
                alt="Interiores de referencia de The Practice"
                fill
                priority
                sizes="(max-width: 896px) 100vw, 896px"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-3 font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
              Interiores de referencia · The Practice
            </figcaption>
          </figure>

          <p className="mt-12 text-sm text-stone-deep">
            Preparado para la propiedad y administración de Plaza La Ceiba.
          </p>
        </section>

        {/* ============ 01 · RESUMEN EJECUTIVO ============ */}
        <section className="mt-4 break-inside-avoid">
          <p className="eyebrow">01 · Resumen ejecutivo</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Un concepto profesional, ordenado y de bajo impacto.
          </h2>
          <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-mute">
            <p>
              The Practice es un concepto de espacios profesionales privados,
              diseñado para especialistas independientes que requieren un
              entorno de alta calidad para atender a sus clientes por cita.
              Reúne en un mismo local diversas salas equipadas, administradas de
              forma centralizada, con reservas, control de acceso, limpieza,
              mantenimiento y estándares de uso.
            </p>
            <p>
              Sirve a profesionales independientes verificados que hoy atienden
              por cuenta propia y buscan un espacio digno, privado y bien
              ubicado, sin comprometerse con la renta y la operación de un local
              completo.
            </p>
            <p>
              Para La Ceiba, esto representa un operador único y profesional, una
              marca cuidada y un flujo ordenado de usuarios de perfil
              profesional, con bajo impacto operativo y plena compatibilidad con
              una plaza premium.
            </p>
          </div>
        </section>

        {/* ============ 02 · EL CONCEPTO ============ */}
        <section className="mt-16 break-inside-avoid">
          <p className="eyebrow">02 · El concepto</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Varios espacios privados, un solo local administrado.
          </h2>
          <div className="mt-6 max-w-2xl space-y-4 text-[15px] leading-relaxed text-ink-mute">
            <p>
              The Practice concentra en un solo local varios espacios privados,
              diseñados para distintos tipos de sesiones profesionales. Cada
              profesional reserva el espacio que necesita para atender a sus
              clientes por cita, sin instalar su propia infraestructura ni rentar
              un local independiente.
            </p>
            <p>
              El uso es siempre por reservación y por parte de usuarios
              autorizados. No es un comercio con venta abierta al público, sino
              un entorno de atención profesional, privado y programado.
            </p>
          </div>
        </section>

        {/* ============ 03 · CÓMO OPERA ============ */}
        <section className="mt-16 break-before-page">
          <p className="eyebrow">03 · Cómo opera</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Una operación previsible y discreta.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
            La operación está diseñada para ser ordenada, silenciosa y
            compatible con la vida cotidiana de la plaza.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {OPERACION.map((o) => (
              <div
                key={o.title}
                className="break-inside-avoid rounded-2xl border border-line bg-surface p-6"
              >
                <h3 className="font-display text-sm font-bold">{o.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{o.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ 04 · TIPOS DE ESPACIOS ============ */}
        <section className="mt-16 break-inside-avoid">
          <p className="eyebrow">04 · Tipos de espacios</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Espacios equipados para distintas formas de atender.
          </h2>
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-2">
            <ul className="space-y-3.5">
              {ESPACIOS.map((e) => (
                <li key={e} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-mute">
                  <Marker />
                  {e}
                </li>
              ))}
            </ul>
            <figure className="break-inside-avoid">
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-line">
                <Image
                  src="/images/common-area.jpg"
                  alt="Área común y recepción de referencia"
                  fill
                  sizes="(max-width: 1024px) 100vw, 440px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
                Área común y recepción · referencia
              </figcaption>
            </figure>
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-relaxed text-stone">
            Todos los espacios son privados y de uso por reservación. El número y
            la configuración final se ajustan a las características del local.
          </p>
        </section>

        {/* ============ 05 · THE MEMBERS LOUNGE ============ */}
        <section className="mt-16 break-before-page">
          <p className="eyebrow">05 · Amenidad distintiva</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            The Members Lounge, en La Ceiba.
          </h2>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-2">
            <figure className="break-inside-avoid">
              <div className="relative aspect-[3/2] overflow-hidden rounded-2xl border border-line">
                <Image
                  src="/images/lounge-la-ceiba.jpg"
                  alt="Terraza tipo lounge de referencia en La Ceiba"
                  fill
                  sizes="(max-width: 1024px) 100vw, 440px"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
                Terraza tipo lounge · referencia
              </figcaption>
            </figure>
            <div>
              <p className="max-w-md text-[15px] leading-relaxed text-ink-mute">
                La ubicación de La Ceiba contempla un área tipo lounge, diseñada
                como espacio complementario para que los profesionales trabajen
                entre citas, esperen de forma cómoda y coincidan con otros
                usuarios autorizados del espacio.
              </p>
              <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
                <p className="text-sm leading-relaxed text-ink-mute">
                  Es una <strong>amenidad interna del concepto</strong>, de uso
                  exclusivo para usuarios autorizados.
                </p>
                <p className="mt-3 text-sm leading-relaxed text-stone-deep">
                  No es cafetería abierta al público, bar ni restaurante, y no
                  genera una operación independiente de alimentos y bebidas.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ 06 · COMPATIBILIDAD ============ */}
        <section className="mt-16 break-inside-avoid">
          <p className="eyebrow">06 · Compatibilidad con Plaza La Ceiba</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Un uso que suma a una plaza premium.
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
            {COMPATIBILIDAD.map((c) => (
              <li key={c} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-mute">
                <Marker />
                {c}
              </li>
            ))}
          </ul>
        </section>

        {/* ============ 07 · PERFIL DEL USUARIO ============ */}
        <section className="mt-16 break-inside-avoid">
          <p className="eyebrow">07 · Perfil del usuario</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Público profesional y programado.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-ink-mute">
            El público de The Practice es profesional y acude con cita: son
            especialistas independientes y sus clientes, en un entorno privado y
            cuidado.
          </p>
          <ul className="mt-8 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
            {PERFIL.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-mute">
                <Marker />
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* ============ 08 · ESTÁNDARES DE OPERACIÓN ============ */}
        <section className="mt-16 break-before-page">
          <p className="eyebrow">08 · Estándares de operación</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Compromisos con el inmueble y la plaza.
          </h2>
          <ul className="mt-8 grid gap-x-10 gap-y-3.5 sm:grid-cols-2">
            {ESTANDARES.map((e) => (
              <li key={e} className="flex items-start gap-3 text-[15px] leading-relaxed text-ink-mute">
                <Marker />
                {e}
              </li>
            ))}
          </ul>
        </section>

        {/* ============ 09 · BENEFICIO PARA LA PLAZA ============ */}
        <section className="mt-16 break-inside-avoid">
          <p className="eyebrow">09 · Beneficio para la propiedad</p>
          <h2 className="mt-3 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Desde la perspectiva del inmueble.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {BENEFICIOS.map((b) => (
              <div
                key={b.title}
                className="break-inside-avoid rounded-2xl border border-line bg-surface p-6"
              >
                <h3 className="font-display text-sm font-bold">{b.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-stone-deep">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ============ CIERRE ============ */}
        <section className="mt-16 break-inside-avoid rounded-2xl bg-ink p-8 text-paper sm:p-12">
          <div className="flex items-center gap-2.5">
            <LogoMark tone="paper" />
            <Wordmark tone="paper" />
          </div>
          <h2 className="mt-8 max-w-2xl font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
            Nuestra intención es establecer en La Ceiba la primera ubicación de
            The Practice.
          </h2>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-paper/70">
            Un proyecto con una operación seria, una estética cuidada y un
            concepto que aporte valor a la plaza y a su comunidad de usuarios.
            Quedamos atentos para ampliar cualquier punto operativo, técnico o de
            adecuación requerido durante el proceso de arrendamiento.
          </p>
          <div className="mt-8 border-t border-paper/15 pt-6">
            <p className="eyebrow-light">Contacto</p>
            <div className="mt-3 flex flex-wrap gap-x-8 gap-y-1.5 text-sm text-paper/80">
              <span>{site.email}</span>
              <span>{site.phone}</span>
              <span>{site.domain}</span>
            </div>
          </div>
        </section>

        <p className="mt-8 text-center font-display text-[10px] font-semibold tracking-[0.2em] text-stone uppercase">
          The Practice · Documento de concepto · Confidencial para la propiedad de Plaza La Ceiba
        </p>
      </main>
    </div>
  );
}
