import { FileText, ShieldCheck } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form";
import { ActionForm } from "@/components/dashboard/action-form";
import { registerDocument } from "../actions";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  ID: "Identificación",
  PROFESSIONAL_LICENSE: "Cédula profesional",
  CERTIFICATION: "Certificación",
  TAX_CERTIFICATE: "Constancia fiscal",
  PROFILE_PHOTO: "Foto de perfil",
  OTHER: "Otro",
};

const STATUS_META: Record<string, { label: string; variant: "sage" | "amber" | "rust" | "default" }> = {
  PENDING_REVIEW: { label: "En revisión", variant: "amber" },
  APPROVED: { label: "Aprobado", variant: "sage" },
  REJECTED: { label: "Rechazado", variant: "rust" },
  EXPIRED: { label: "Vencido", variant: "rust" },
  NEEDS_UPDATE: { label: "Requiere actualización", variant: "amber" },
};

export default async function DocumentsPage() {
  const { profile } = await requirePractitioner();
  const documents = await db.document.findMany({
    where: { practitionerId: profile.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Documentos"
        description="Verificación de identidad y credenciales profesionales."
      />

      <div className="mb-8 flex items-start gap-3 rounded-2xl border border-line bg-surface p-5 text-sm text-ink-mute shadow-(--shadow-card)">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
        <p>
          La verificación protege a toda la comunidad. Tus documentos solo son
          visibles para el equipo de The Practice y nunca se publican.
          <span className="mt-1 block text-xs text-stone">
            MVP: registra la URL de tu documento (Drive/Dropbox con acceso de
            lectura). La carga directa de archivos llega con el proveedor de
            storage en producción.
          </span>
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <div>
          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin documentos"
              description="Registra tu identificación y cédula/certificación para completar la verificación."
            />
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => {
                const meta = STATUS_META[doc.status] ?? {
                  label: doc.status,
                  variant: "default" as const,
                };
                return (
                  <div
                    key={doc.id}
                    className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-paper">
                      <FileText className="h-4.5 w-4.5 text-stone-deep" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-bold">{doc.name}</p>
                      <p className="text-xs text-stone-deep">
                        {TYPE_LABEL[doc.type] ?? doc.type} · {formatDateTimeMX(doc.createdAt)}
                      </p>
                      {doc.reviewNotes && (
                        <p className="mt-1 text-xs text-rust">{doc.reviewNotes}</p>
                      )}
                    </div>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Registrar documento</CardTitle>
            <CardDescription>Se revisa típicamente en 48 horas.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={registerDocument} submitLabel="Enviar a revisión" className="space-y-4">
              <Field label="Tipo" htmlFor="doc-type">
                <Select id="doc-type" name="type" defaultValue="PROFESSIONAL_LICENSE">
                  {Object.entries(TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nombre del documento" htmlFor="doc-name">
                <Input id="doc-name" name="name" required placeholder="Cédula profesional 1234567" />
              </Field>
              <Field label="URL del archivo" htmlFor="doc-url" hint="Enlace con permiso de lectura">
                <Input id="doc-url" name="url" type="url" required placeholder="https://…" />
              </Field>
            </ActionForm>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
