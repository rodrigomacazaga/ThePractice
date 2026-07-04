import { requireAdmin } from "@/lib/auth-helpers";
import { getSetting } from "@/lib/settings";
import { ALL_JOBS } from "@/lib/jobs";
import { PageHeader } from "@/components/dashboard/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { updateBookingSettings, runJobAction } from "../actions";

export const dynamic = "force-dynamic";

const JOB_LABEL: Record<string, string> = {
  "release-unpaid-bookings": "Liberar reservas sin pago (>30 min)",
  "expire-credits": "Expirar créditos vencidos",
  "mark-no-shows": "Marcar no-shows",
  "renew-memberships": "Renovar membresías vencidas",
};

export default async function AdminSettingsPage() {
  await requireAdmin();

  const [windowHours, latePenalty, noShowPenalty, minAdvance, maxDays] = await Promise.all([
    getSetting("booking.cancellation_window_hours"),
    getSetting("booking.late_cancel_penalty_pct"),
    getSetting("booking.no_show_penalty_pct"),
    getSetting("booking.min_advance_minutes"),
    getSetting("booking.max_days_ahead"),
  ]);

  return (
    <>
      <PageHeader
        title="Configuración"
        description="Reglas operativas globales. Pueden sobreescribirse por ubicación vía base de datos."
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reglas de reservas y cancelación</CardTitle>
            <CardDescription>
              Aplican a todas las ubicaciones salvo override específico.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateBookingSettings} submitLabel="Guardar reglas">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Ventana de cancelación (horas)"
                  htmlFor="s-window"
                  hint="Antes de este límite, reembolso completo"
                >
                  <Input
                    id="s-window"
                    name="booking.cancellation_window_hours"
                    type="number"
                    min={0}
                    defaultValue={windowHours}
                  />
                </Field>
                <Field
                  label="Penalización cancelación tardía (%)"
                  htmlFor="s-late"
                  hint="% de créditos que se pierden"
                >
                  <Input
                    id="s-late"
                    name="booking.late_cancel_penalty_pct"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={latePenalty}
                  />
                </Field>
                <Field label="Penalización no-show (%)" htmlFor="s-noshow">
                  <Input
                    id="s-noshow"
                    name="booking.no_show_penalty_pct"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={noShowPenalty}
                  />
                </Field>
                <Field label="Anticipación mínima (minutos)" htmlFor="s-advance">
                  <Input
                    id="s-advance"
                    name="booking.min_advance_minutes"
                    type="number"
                    min={0}
                    defaultValue={minAdvance}
                  />
                </Field>
                <Field label="Máx. días de anticipación" htmlFor="s-maxdays">
                  <Input
                    id="s-maxdays"
                    name="booking.max_days_ahead"
                    type="number"
                    min={1}
                    defaultValue={maxDays}
                  />
                </Field>
              </div>
            </ActionForm>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Jobs recurrentes</CardTitle>
            <CardDescription>
              En producción corren vía cron (ver README_DEPLOY_NETLIFY.md).
              Aquí puedes ejecutarlos manualmente.
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
