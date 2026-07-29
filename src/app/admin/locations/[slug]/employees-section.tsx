import { Building, FileWarning } from "lucide-react";
import type { Employee, EmployeeDocument } from "@prisma/client";
import { formatMXN, formatDateMX } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import {
  upsertEmployee,
  deleteEmployee,
  upsertEmployeeDocument,
  deleteEmployeeDocument,
} from "@/app/admin/actions";

type EmployeeWithDocs = Employee & { documents: EmployeeDocument[] };

const TYPES = [
  ["FULL_TIME", "Tiempo completo"],
  ["PART_TIME", "Medio tiempo"],
  ["CONTRACTOR", "Honorarios"],
] as const;

const STATUSES = [
  ["ACTIVE", "Activo"],
  ["ON_LEAVE", "Incapacidad / permiso"],
  ["TERMINATED", "Baja"],
] as const;

const DOC_TYPES = [
  ["CONTRACT", "Contrato"],
  ["ID", "Identificación"],
  ["TAX_ID", "RFC / constancia fiscal"],
  ["SOCIAL_SECURITY", "IMSS"],
  ["BANK_DETAILS", "Datos bancarios"],
  ["MEDICAL_CERT", "Certificado médico"],
  ["TRAINING", "Capacitación"],
  ["NDA", "Convenio de confidencialidad"],
  ["OTHER", "Otro"],
] as const;

const TYPE_LABEL = Object.fromEntries(TYPES) as Record<string, string>;
const STATUS_LABEL = Object.fromEntries(STATUSES) as Record<string, string>;
const DOC_LABEL = Object.fromEntries(DOC_TYPES) as Record<string, string>;

function EmployeeFields({ locationId, employee }: { locationId: string; employee?: Employee }) {
  const uid = employee?.id ?? "new";
  return (
    <>
      {employee && <input type="hidden" name="employeeId" value={employee.id} />}
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`em-name-${uid}`}>
          <Input id={`em-name-${uid}`} name="name" defaultValue={employee?.name} required />
        </Field>
        <Field label="Puesto" htmlFor={`em-pos-${uid}`}>
          <Input
            id={`em-pos-${uid}`}
            name="position"
            defaultValue={employee?.position}
            placeholder="Recepción"
            required
          />
        </Field>
        <Field label="Email" htmlFor={`em-mail-${uid}`}>
          <Input id={`em-mail-${uid}`} name="email" type="email" defaultValue={employee?.email ?? ""} />
        </Field>
        <Field label="Teléfono" htmlFor={`em-tel-${uid}`}>
          <Input id={`em-tel-${uid}`} name="phone" defaultValue={employee?.phone ?? ""} />
        </Field>
        <Field label="Tipo de contrato" htmlFor={`em-type-${uid}`}>
          <Select id={`em-type-${uid}`} name="employmentType" defaultValue={employee?.employmentType ?? "FULL_TIME"}>
            {TYPES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estatus" htmlFor={`em-status-${uid}`}>
          <Select id={`em-status-${uid}`} name="status" defaultValue={employee?.status ?? "ACTIVE"}>
            {STATUSES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Sueldo mensual (MXN)"
          htmlFor={`em-sal-${uid}`}
          hint="Alimenta la nómina en costos"
        >
          <Input
            id={`em-sal-${uid}`}
            name="monthlySalary"
            type="number"
            min={0}
            step="0.01"
            defaultValue={employee?.monthlySalaryCents != null ? employee.monthlySalaryCents / 100 : ""}
          />
        </Field>
        <Field label="Fecha de ingreso" htmlFor={`em-start-${uid}`}>
          <Input
            id={`em-start-${uid}`}
            name="startedAt"
            type="date"
            defaultValue={(employee?.startedAt ?? new Date()).toISOString().slice(0, 10)}
            required
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notas" htmlFor={`em-notes-${uid}`}>
          <Textarea id={`em-notes-${uid}`} name="notes" rows={2} defaultValue={employee?.notes ?? ""} />
        </Field>
      </div>
    </>
  );
}

/** Equipo de nómina de la sede, con su documentación y vencimientos. */
export function EmployeesSection({
  locationId,
  employees,
}: {
  locationId: string;
  employees: EmployeeWithDocs[];
}) {
  const en60dias = new Date(Date.now() + 60 * 86_400_000);
  const porVencer = employees.flatMap((e) =>
    e.documents
      .filter((d) => d.expiresAt != null && d.expiresAt <= en60dias)
      .map((d) => ({ empleado: e.name, doc: d.name, expiresAt: d.expiresAt! }))
  );

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Equipo de la sede</h2>
        <Modal trigger="Nuevo empleado" title="Nuevo empleado">
          <ActionForm action={upsertEmployee} submitLabel="Guardar empleado">
            <EmployeeFields locationId={locationId} />
          </ActionForm>
        </Modal>
      </div>

      {porVencer.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-soft px-4 py-3 text-sm font-medium text-amber-warm">
          <FileWarning className="h-4 w-4 shrink-0" />
          {porVencer.length} documento{porVencer.length === 1 ? "" : "s"} por vencer en 60 días:{" "}
          {porVencer
            .slice(0, 3)
            .map((d) => `${d.doc} de ${d.empleado} (${formatDateMX(d.expiresAt)})`)
            .join(", ")}
          {porVencer.length > 3 ? "…" : ""}
        </div>
      )}

      {employees.length === 0 ? (
        <EmptyState
          icon={Building}
          title="Sin empleados dados de alta"
          description="Registra al equipo de esta sede para llevar su nómina y su documentación. La nómina capturada alimenta los costos."
        />
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Nombre</TH>
                <TH>Puesto</TH>
                <TH>Contrato</TH>
                <TH>Estatus</TH>
                <TH>Sueldo</TH>
                <TH>Documentos</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {employees.map((e) => (
                <TR key={e.id}>
                  <TD className="font-display font-semibold">{e.name}</TD>
                  <TD className="text-stone-deep">{e.position}</TD>
                  <TD>
                    <Badge variant="outline">{TYPE_LABEL[e.employmentType] ?? e.employmentType}</Badge>
                  </TD>
                  <TD>
                    <Badge variant={e.status === "ACTIVE" ? "sage" : "amber"}>
                      {STATUS_LABEL[e.status] ?? e.status}
                    </Badge>
                  </TD>
                  <TD>{e.monthlySalaryCents != null ? formatMXN(e.monthlySalaryCents) : "—"}</TD>
                  <TD>
                    <Modal trigger={`${e.documents.length} docs`} title={`Documentos de ${e.name}`}>
                      <div className="space-y-3">
                        {e.documents.length === 0 && (
                          <p className="text-sm text-stone-deep">Sin documentos cargados.</p>
                        )}
                        {e.documents.map((d) => (
                          <div
                            key={d.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-line p-3"
                          >
                            <div className="min-w-0">
                              <a
                                href={d.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="truncate font-display text-sm font-semibold underline"
                              >
                                {d.name}
                              </a>
                              <p className="text-xs text-stone-deep">
                                {DOC_LABEL[d.type] ?? d.type}
                                {d.expiresAt ? ` · vence ${formatDateMX(d.expiresAt)}` : ""}
                              </p>
                            </div>
                            <ActionButton
                              action={deleteEmployeeDocument.bind(null, d.id)}
                              label="Quitar"
                              variant="danger"
                              confirmText={`¿Quitar ${d.name}?`}
                            />
                          </div>
                        ))}
                        <div className="border-t border-line pt-3">
                          <ActionForm action={upsertEmployeeDocument} submitLabel="Agregar documento">
                            <input type="hidden" name="employeeId" value={e.id} />
                            <div className="grid gap-3 sm:grid-cols-2">
                              <Field label="Tipo" htmlFor={`doc-type-${e.id}`}>
                                <Select id={`doc-type-${e.id}`} name="type" defaultValue="CONTRACT">
                                  {DOC_TYPES.map(([v, l]) => (
                                    <option key={v} value={v}>
                                      {l}
                                    </option>
                                  ))}
                                </Select>
                              </Field>
                              <Field label="Nombre" htmlFor={`doc-name-${e.id}`}>
                                <Input id={`doc-name-${e.id}`} name="name" required />
                              </Field>
                              <Field label="Liga al archivo" htmlFor={`doc-url-${e.id}`}>
                                <Input id={`doc-url-${e.id}`} name="url" type="url" required />
                              </Field>
                              <Field label="Vence (opcional)" htmlFor={`doc-exp-${e.id}`}>
                                <Input id={`doc-exp-${e.id}`} name="expiresAt" type="date" />
                              </Field>
                            </div>
                          </ActionForm>
                        </div>
                      </div>
                    </Modal>
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Modal trigger="Editar" title={`Editar ${e.name}`}>
                        <ActionForm action={upsertEmployee} submitLabel="Guardar">
                          <EmployeeFields locationId={locationId} employee={e} />
                        </ActionForm>
                      </Modal>
                      <ActionButton
                        action={deleteEmployee.bind(null, e.id)}
                        label="Eliminar"
                        variant="danger"
                        confirmText={`¿Eliminar a ${e.name}? Se borra también su documentación.`}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}
    </section>
  );
}
