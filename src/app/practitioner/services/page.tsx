import { Briefcase } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { createService, toggleService, deleteService } from "../actions";

export const dynamic = "force-dynamic";

const modalityLabel = { IN_PERSON: "Presencial", ONLINE: "Online", HYBRID: "Híbrida" } as const;

export default async function ServicesPage() {
  const { profile } = await requirePractitioner();
  const services = await db.practitionerService.findMany({
    where: { practitionerId: profile.id },
    orderBy: { sort: "asc" },
  });

  return (
    <>
      <PageHeader
        title="Mis servicios"
        description="Los servicios que ofreces a clientes, visibles en tu micrositio."
      />

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          {services.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Aún no tienes servicios"
              description="Agrega tu primer servicio: sesión individual, terapia de pareja, consulta de nutrición…"
            />
          ) : (
            <div className="space-y-3">
              {services.map((service) => {
                const toggle = toggleService.bind(null, service.id);
                const remove = deleteService.bind(null, service.id);
                return (
                  <div
                    key={service.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-display text-sm font-bold">{service.name}</p>
                        <Badge variant={service.active ? "sage" : "default"}>
                          {service.active ? "Activo" : "Pausado"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-stone-deep">
                        {service.durationMin} min · {modalityLabel[service.modality]} ·{" "}
                        {formatMXN(service.priceCents)}
                        {service.description ? ` — ${service.description}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <ActionButton
                        action={toggle}
                        label={service.active ? "Pausar" : "Activar"}
                        variant="outline"
                      />
                      <ActionButton
                        action={remove}
                        label="Eliminar"
                        variant="ghost"
                        confirmText="¿Eliminar este servicio?"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Nuevo servicio</CardTitle>
            <CardDescription>Ej. “Sesión individual · 60 min”.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={createService} submitLabel="Agregar servicio" className="space-y-4">
              <Field label="Nombre" htmlFor="sv-name">
                <Input id="sv-name" name="name" required placeholder="Sesión individual" />
              </Field>
              <Field label="Descripción (opcional)" htmlFor="sv-desc">
                <Textarea id="sv-desc" name="description" rows={2} maxLength={300} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Duración (min)" htmlFor="sv-duration">
                  <Input id="sv-duration" name="durationMin" type="number" defaultValue={60} min={15} step={15} />
                </Field>
                <Field label="Precio (MXN)" htmlFor="sv-price">
                  <Input id="sv-price" name="price" type="number" defaultValue={900} min={0} step={50} />
                </Field>
                <Field label="Modalidad" htmlFor="sv-modality">
                  <Select id="sv-modality" name="modality" defaultValue="IN_PERSON">
                    <option value="IN_PERSON">Presencial</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Híbrida</option>
                  </Select>
                </Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
