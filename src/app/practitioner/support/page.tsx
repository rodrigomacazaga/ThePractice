import { LifeBuoy, Mail, MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent } from "@/components/ui/card";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  return (
    <>
      <PageHeader
        title="Soporte"
        description="Estamos para ayudarte. Respuesta típica en menos de 4 horas hábiles."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-7">
            <Mail className="h-5 w-5 text-clay" />
            <h3 className="mt-3 font-display text-base font-bold">Email</h3>
            <p className="mt-1 text-sm text-stone-deep">
              Para cambios de plan, facturación y verificación.
            </p>
            <a
              href={`mailto:${site.email}`}
              className="mt-4 inline-block font-display text-sm font-semibold text-ink underline"
            >
              {site.email}
            </a>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-7">
            <MessageCircle className="h-5 w-5 text-clay" />
            <h3 className="mt-3 font-display text-base font-bold">WhatsApp</h3>
            <p className="mt-1 text-sm text-stone-deep">
              Para temas urgentes del espacio (acceso, salas, incidencias).
            </p>
            <p className="mt-4 font-display text-sm font-semibold text-ink">{site.phone}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardContent className="flex items-start gap-4 p-7">
          <LifeBuoy className="h-5 w-5 shrink-0 text-clay" />
          <div className="text-sm leading-relaxed text-ink-mute">
            <p className="font-display font-bold text-ink">Temas frecuentes</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Cancelar o pausar membresía: escríbenos antes de tu fecha de renovación.</li>
              <li>Cambio de slug del micrositio: lo hacemos por ti para no romper enlaces.</li>
              <li>Solicitar locker o add-ons: indícanos la ubicación y te confirmamos disponibilidad.</li>
              <li>Facturas: se emiten con los datos fiscales que nos compartas por email.</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
