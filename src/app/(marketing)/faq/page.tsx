import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FaqList } from "@/components/marketing/faq";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Preguntas frecuentes",
  description: "Todo sobre membresías, salas, créditos, verificación, reservas y políticas de The Practice.",
};

const SECTIONS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "Para profesionales",
    items: [
      {
        q: "¿Quién puede aplicar a The Practice?",
        a: "Psicólogos, terapeutas, nutriólogos, coaches, fisioterapeutas (práctica ligera) y especialistas en bienestar con credenciales verificables. Revisamos cada aplicación para mantener una comunidad curada.",
      },
      {
        q: "¿Cuánto cuesta?",
        a: "Puedes pagar por hora (desde $280 MXN), comprar paquetes de horas con descuento, o contratar una membresía mensual desde $1,690 MXN que incluye horas, micrositio y directorio según el plan.",
      },
      {
        q: "¿Cómo funcionan los créditos?",
        a: "Un crédito = una hora de sala estándar. Salas premium consumen 1.5 y el studio 2 por hora. Tus créditos de membresía se renuevan cada mes; los de paquetes duran 90 días.",
      },
      {
        q: "¿Qué pasa si cancelo una reserva de sala?",
        a: "Con más de 24 h de anticipación, recuperas tus créditos. Con menos, aplica la política de cancelación tardía. Los no-shows consumen los créditos completos de la reserva.",
      },
      {
        q: "¿Puedo facturar mis pagos a The Practice?",
        a: "Sí. Emitimos comprobantes de tus membresías, paquetes y horas para tu contabilidad.",
      },
      {
        q: "¿Las membresías incluyen locker?",
        a: "Sí. Toda membresía activa incluye un locker personal sin costo adicional, asignado en tu ubicación principal y sujeto a disponibilidad. El plan Resident garantiza locker grande.",
      },
    ],
  },
  {
    title: "Para clientes",
    items: [
      {
        q: "¿Cómo sé que un profesional es confiable?",
        a: "Todos los perfiles publicados pasaron verificación documental (cédula profesional o certificación según la disciplina). El badge 'Verificado' lo indica.",
      },
      {
        q: "¿Cuánto cuesta una sesión?",
        a: "Cada profesional define sus precios, visibles en su perfil. El rango típico va de $700 a $2,000 MXN por sesión.",
      },
      {
        q: "¿Puedo tomar sesiones online?",
        a: "Sí, muchos profesionales ofrecen modalidad online o híbrida. Filtra el directorio por modalidad.",
      },
    ],
  },
  {
    title: "Sobre The Practice",
    items: [
      {
        q: "¿The Practice es una clínica?",
        a: "No. The Practice provee espacios premium, tecnología y un directorio. No prestamos servicios médicos, terapéuticos ni clínicos; cada practitioner es responsable de su ejercicio profesional.",
      },
      {
        q: "¿Dónde están ubicados?",
        a: "La primera ubicación es The Practice La Ceiba en Querétaro. Juriquilla, Zibatá y más ubicaciones están en evaluación.",
      },
      {
        q: "¿Guardan información clínica de los pacientes?",
        a: "No. La plataforma gestiona reservas, pagos y perfiles públicos. Los expedientes clínicos son responsabilidad exclusiva de cada profesional, fuera de la plataforma.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <section className="container-page py-20 lg:py-24">
      <SectionHeading
        eyebrow="Preguntas frecuentes"
        title="Respuestas claras."
        description="Si no encuentras lo que buscas, escríbenos: hola@thepractice.mx"
      />
      <div className="mt-12 max-w-3xl space-y-12">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="eyebrow">{section.title}</h2>
            <div className="mt-4">
              <FaqList items={section.items} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-16 max-w-3xl rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="font-display text-base font-bold">¿Otra pregunta?</p>
        <ButtonLink href="/contact" variant="outline" size="lg" className="mt-4">
          Contáctanos
        </ButtonLink>
      </div>
    </section>
  );
}
