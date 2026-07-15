import { UserRound } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionButton, ActionForm } from "@/components/dashboard/action-form";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import {
  approvePractitioner,
  rejectPractitioner,
  toggleFeatured,
  reviewDocument,
  adjustCredits,
  updatePractitionerProfile,
  toggleUserActive,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; variant: "sage" | "amber" | "rust" | "default" }> = {
  APPROVED: { label: "Aprobado", variant: "sage" },
  PENDING_REVIEW: { label: "Por verificar", variant: "amber" },
  REJECTED: { label: "Rechazado", variant: "rust" },
  NEEDS_UPDATE: { label: "Requiere update", variant: "amber" },
  EXPIRED: { label: "Vencido", variant: "rust" },
};

export default async function AdminPractitionersPage() {
  await requireAdmin();

  const practitioners = await db.practitionerProfile.findMany({
    orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
    include: {
      user: true,
      wallet: true,
      membership: { include: { plan: true } },
      documents: { where: { status: "PENDING_REVIEW" } },
      microsite: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Practitioners"
        description="Verificación, membresías, créditos y visibilidad."
      />

      {practitioners.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Sin practitioners"
          description="Cuando alguien se registre como profesional aparecerá aquí para verificación."
        />
      ) : (
        <div className="space-y-4">
          {practitioners.map((p) => {
            const meta = STATUS_META[p.verificationStatus] ?? {
              label: p.verificationStatus,
              variant: "default" as const,
            };
            const approve = approvePractitioner.bind(null, p.id);
            const reject = rejectPractitioner.bind(null, p.id);
            const feature = toggleFeatured.bind(null, p.id);
            const toggleActive = toggleUserActive.bind(null, p.user.id);

            return (
              <div
                key={p.id}
                className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar name={p.user.name} src={p.photoUrl ?? p.user.image} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold">{p.user.name}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                      {p.featured && <Badge variant="clay">Destacado</Badge>}
                      {p.membership?.status === "ACTIVE" && (
                        <Badge variant="ink">{p.membership.plan.name}</Badge>
                      )}
                      {!p.user.active && <Badge variant="rust">Cuenta inactiva</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-deep">
                      {p.user.email} · /p/{p.slug} · {p.specialties.join(", ") || "sin especialidad"} ·
                      créditos: {formatCredits(p.wallet?.balance ?? 0)} · alta{" "}
                      {formatDateTimeMX(p.createdAt)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {p.verificationStatus !== "APPROVED" && (
                      <ActionButton action={approve} label="Aprobar" variant="outline" />
                    )}
                    {p.verificationStatus !== "REJECTED" && (
                      <ActionButton
                        action={reject}
                        label="Rechazar"
                        variant="ghost"
                        confirmText={`¿Rechazar a ${p.user.name}?`}
                      />
                    )}
                    <ActionButton
                      action={feature}
                      label={p.featured ? "Quitar destacado" : "Destacar"}
                      variant="ghost"
                    />
                    <Modal trigger="Editar" title={`Editar ${p.user.name}`}>
                      <ActionForm action={updatePractitionerProfile} submitLabel="Guardar cambios">
                        <input type="hidden" name="practitionerId" value={p.id} />
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="Nombre" htmlFor={`ed-name-${p.id}`}>
                            <Input id={`ed-name-${p.id}`} name="name" required defaultValue={p.user.name} />
                          </Field>
                          <Field label="Teléfono" htmlFor={`ed-phone-${p.id}`}>
                            <Input id={`ed-phone-${p.id}`} name="phone" defaultValue={p.user.phone ?? ""} />
                          </Field>
                        </div>
                        <div className="mt-3">
                          <Field label="Headline (público)" htmlFor={`ed-head-${p.id}`}>
                            <Input
                              id={`ed-head-${p.id}`}
                              name="headline"
                              placeholder="Psicóloga clínica · Ansiedad y burnout"
                              defaultValue={p.headline ?? ""}
                            />
                          </Field>
                        </div>
                        <div className="mt-3">
                          <Field label="Especialidades (separadas por coma)" htmlFor={`ed-spec-${p.id}`}>
                            <Textarea
                              id={`ed-spec-${p.id}`}
                              name="specialties"
                              rows={2}
                              defaultValue={p.specialties.join(", ")}
                            />
                          </Field>
                        </div>
                      </ActionForm>
                    </Modal>
                    <ActionButton
                      action={toggleActive}
                      label={p.user.active ? "Desactivar cuenta" : "Reactivar"}
                      variant={p.user.active ? "danger" : "outline"}
                      confirmText={
                        p.user.active
                          ? `¿Desactivar la cuenta de ${p.user.name}? No podrá iniciar sesión hasta reactivarla.`
                          : undefined
                      }
                    />
                  </div>
                </div>

                {/* DOCUMENTOS PENDIENTES */}
                {p.documents.length > 0 && (
                  <div className="mt-4 space-y-2 rounded-xl bg-paper p-4">
                    <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
                      Documentos por revisar
                    </p>
                    {p.documents.map((doc) => {
                      const approveDoc = reviewDocument.bind(null, doc.id, true);
                      const rejectDoc = reviewDocument.bind(null, doc.id, false);
                      return (
                        <div key={doc.id} className="flex flex-wrap items-center gap-3 text-sm">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 truncate font-medium text-ink underline"
                          >
                            {doc.name}
                          </a>
                          <span className="text-xs text-stone">{doc.type}</span>
                          <ActionButton action={approveDoc} label="Aprobar" variant="outline" />
                          <ActionButton action={rejectDoc} label="Rechazar" variant="ghost" />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* AJUSTE DE CRÉDITOS */}
                <details className="mt-4">
                  <summary className="cursor-pointer font-display text-xs font-semibold text-stone-deep hover:text-ink">
                    Ajustar créditos manualmente
                  </summary>
                  <div className="mt-3 max-w-xl">
                    <ActionForm action={adjustCredits} submitLabel="Aplicar ajuste">
                      <input type="hidden" name="practitionerId" value={p.id} />
                      <div className="grid grid-cols-[140px_1fr] gap-3">
                        <Field label="Créditos (+/−)" htmlFor={`adj-${p.id}`}>
                          <Input
                            id={`adj-${p.id}`}
                            name="amount"
                            type="number"
                            step="0.5"
                            placeholder="4"
                          />
                        </Field>
                        <Field label="Motivo (queda en auditoría)" htmlFor={`note-${p.id}`}>
                          <Input
                            id={`note-${p.id}`}
                            name="note"
                            placeholder="Compensación por incidencia en sala"
                          />
                        </Field>
                      </div>
                    </ActionForm>
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
