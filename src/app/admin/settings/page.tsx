import { X } from "lucide-react";
import type { Location } from "@prisma/client";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { getSetting, getLocationOverride, type SettingKey } from "@/lib/settings";
import { ALL_JOBS } from "@/lib/jobs";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { Tabs } from "@/components/ui/tabs";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { updateBookingSettings, removeSettingOverride, runJobAction } from "../actions";

export const dynamic = "force-dynamic";

const JOB_LABEL: Record<string, string> = {
  "release-unpaid-bookings": "Liberar reservas sin pago",
  "expire-credits": "Expirar créditos vencidos",
  "mark-no-shows": "Marcar no-shows",
  "renew-memberships": "Renovar membresías vencidas",
};

const FIELDS: { key: SettingKey; label: string; hint?: string; min?: number; max?: number }[] = [
  {
    key: "booking.cancellation_window_hours",
    label: "Ventana de cancelación (horas)",
    hint: "Antes de este límite, reembolso completo",
    min: 0,
  },
  {
    key: "booking.late_cancel_penalty_pct",
    label: "Penalización cancelación tardía (%)",
    hint: "% de créditos que se pierden",
    min: 0,
    max: 100,
  },
  { key: "booking.no_show_penalty_pct", label: "Penalización no-show (%)", min: 0, max: 100 },
  { key: "booking.min_advance_minutes", label: "Anticipación mínima (minutos)", min: 0 },
  { key: "booking.max_days_ahead", label: "Máx. días de anticipación", min: 1 },
  {
    key: "booking.pending_payment_hold_minutes",
    label: "Retención de slot sin pago (minutos)",
    hint: "Tras este tiempo la reserva sin pagar se libera",
    min: 1,
  },
  {
    key: "founder.deposit_cents",
    label: "Depósito Founder (centavos MXN)",
    hint: "0 = sin configurar",
    min: 0,
  },
  {
    key: "founder.campaign_ends_ts",
    label: "Fin de campaña Founder (epoch seg)",
    hint: "0 = sin límite; el precio Founder deja de aplicar tras esta fecha",
    min: 0,
  },
];

/** Valores efectivos + si cada uno es override local o heredado del global. */
async function resolveValues(locationId?: string) {
  return Promise.all(
    FIELDS.map(async (f) => {
      const effective = await getSetting(f.key, locationId);
      const override = locationId ? await getLocationOverride(f.key, locationId) : null;
      return { ...f, effective, isOverride: override != null };
    })
  );
}

function SettingsForm({
  location,
  values,
}: {
  location?: Location;
  values: Awaited<ReturnType<typeof resolveValues>>;
}) {
  return (
    <ActionForm action={updateBookingSettings} submitLabel="Guardar reglas">
      {location && <input type="hidden" name="locationId" value={location.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {values.map((v) => (
          <Field
            key={v.key}
            label={v.label}
            htmlFor={`${location?.id ?? "global"}-${v.key}`}
            hint={v.hint}
          >
            <div className="flex items-center gap-2">
              <Input
                id={`${location?.id ?? "global"}-${v.key}`}
                name={v.key}
                type="number"
                min={v.min}
                max={v.max}
                defaultValue={v.effective}
              />
              {location &&
                (v.isOverride ? (
                  <Badge variant="clay" className="shrink-0">
                    override
                  </Badge>
                ) : (
                  <Badge variant="default" className="shrink-0">
                    heredado
                  </Badge>
                ))}
            </div>
          </Field>
        ))}
      </div>
      {location && (
        <p className="mt-4 text-xs text-stone-deep">
          Un valor en blanco no borra nada. Para que un campo vuelva a heredar el global,
          usa “Quitar override”.
        </p>
      )}
    </ActionForm>
  );
}

export default async function AdminSettingsPage() {
  await requireAdmin();

  const locations = await db.location.findMany({ orderBy: { sort: "asc" } });
  const globalValues = await resolveValues();
  const perLocation = await Promise.all(
    locations.map(async (loc) => ({ loc, values: await resolveValues(loc.id) }))
  );

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Reglas operativas de reservas. El valor global aplica salvo que una ubicación tenga su propio override."
      />

      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.6fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reglas de reservas y cancelación</CardTitle>
            <CardDescription>Global y override por establecimiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              tabs={[
                { id: "global", label: "Global" },
                ...locations.map((l) => ({ id: l.id, label: l.shortName })),
              ]}
              panels={[
                <SettingsForm key="global" values={globalValues} />,
                ...perLocation.map(({ loc, values }) => (
                  <div key={loc.id} className="space-y-5">
                    <SettingsForm location={loc} values={values} />
                    <div className="border-t border-line pt-4">
                      <p className="mb-2 text-xs font-semibold text-stone-deep uppercase">
                        Quitar override (vuelve a heredar el global)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {values
                          .filter((v) => v.isOverride)
                          .map((v) => (
                            <ActionButton
                              key={v.key}
                              action={async () => {
                                "use server";
                                const fd = new FormData();
                                fd.set("locationId", loc.id);
                                fd.set("key", v.key);
                                return removeSettingOverride(fd);
                              }}
                              label={
                                <>
                                  <X className="h-3 w-3" /> {v.label}
                                </>
                              }
                              variant="outline"
                            />
                          ))}
                        {values.every((v) => !v.isOverride) && (
                          <span className="text-sm text-stone-deep">
                            Sin overrides: esta sede hereda todo del global.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )),
              ]}
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Jobs recurrentes</CardTitle>
            <CardDescription>
              En producción corren vía cron (ver README_DEPLOY_NETLIFY.md). Aquí puedes
              ejecutarlos manualmente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {ALL_JOBS.map((job) => {
              const run = runJobAction.bind(null, job);
              return (
                <div
                  key={job}
                  className="flex items-center justify-between gap-3 rounded-xl bg-paper px-4 py-3"
                >
                  <span className="text-sm font-medium">{JOB_LABEL[job] ?? job}</span>
                  <ActionButton action={run} label="Ejecutar" variant="outline" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
