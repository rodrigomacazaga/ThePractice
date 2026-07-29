import { Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatMXN, formatDateMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { EmptyState } from "@/components/ui/empty-state";
import { upsertExpense, deleteExpense } from "../actions";
import { getRevenue, getCosts, computeMargin, monthToDate } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  ["RENT", "Renta"],
  ["UTILITIES", "Servicios (luz, agua, internet)"],
  ["PAYROLL", "Nómina"],
  ["MAINTENANCE", "Mantenimiento"],
  ["CLEANING", "Limpieza"],
  ["SUPPLIES", "Insumos"],
  ["MARKETING", "Marketing"],
  ["SOFTWARE", "Software"],
  ["INSURANCE", "Seguros"],
  ["TAXES", "Impuestos"],
  ["OTHER", "Otros"],
] as const;

const RECURRENCES = [
  ["MONTHLY", "Mensual"],
  ["YEARLY", "Anual"],
  ["ONE_TIME", "Único"],
] as const;

const CATEGORY_LABEL = Object.fromEntries(CATEGORIES) as Record<string, string>;
const RECURRENCE_LABEL = Object.fromEntries(RECURRENCES) as Record<string, string>;

function ExpenseFields({
  expense,
  locations,
}: {
  expense?: {
    id: string;
    locationId: string | null;
    category: string;
    recurrence: string;
    concept: string;
    amountCents: number;
    vendor: string | null;
    notes: string | null;
    incurredAt: Date | null;
  };
  locations: { id: string; shortName: string }[];
}) {
  const uid = expense?.id ?? "new";
  return (
    <>
      {expense && <input type="hidden" name="expenseId" value={expense.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Concepto" htmlFor={`ex-concept-${uid}`}>
          <Input
            id={`ex-concept-${uid}`}
            name="concept"
            defaultValue={expense?.concept}
            placeholder="Renta del local"
            required
          />
        </Field>
        <Field label="Importe mensual (MXN)" htmlFor={`ex-amount-${uid}`} hint="Anual: captura el total del año">
          <Input
            id={`ex-amount-${uid}`}
            name="amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={expense ? expense.amountCents / 100 : ""}
            required
          />
        </Field>
        <Field label="Categoría" htmlFor={`ex-cat-${uid}`}>
          <Select id={`ex-cat-${uid}`} name="category" defaultValue={expense?.category ?? "RENT"}>
            {CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Recurrencia" htmlFor={`ex-rec-${uid}`}>
          <Select id={`ex-rec-${uid}`} name="recurrence" defaultValue={expense?.recurrence ?? "MONTHLY"}>
            {RECURRENCES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ubicación" htmlFor={`ex-loc-${uid}`} hint="Vacío = gasto corporativo">
          <Select id={`ex-loc-${uid}`} name="locationId" defaultValue={expense?.locationId ?? ""}>
            <option value="">Corporativo (toda la red)</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.shortName}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Proveedor (opcional)" htmlFor={`ex-vendor-${uid}`}>
          <Input id={`ex-vendor-${uid}`} name="vendor" defaultValue={expense?.vendor ?? ""} />
        </Field>
        <Field label="Fecha (solo gastos únicos)" htmlFor={`ex-date-${uid}`}>
          <Input
            id={`ex-date-${uid}`}
            name="incurredAt"
            type="date"
            defaultValue={expense?.incurredAt ? expense.incurredAt.toISOString().slice(0, 10) : ""}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Notas" htmlFor={`ex-notes-${uid}`}>
          <Textarea id={`ex-notes-${uid}`} name="notes" rows={2} defaultValue={expense?.notes ?? ""} />
        </Field>
      </div>
    </>
  );
}

/**
 * Costos de la operación. Es la pieza que permite hablar de utilidad y no solo
 * de ingresos: mientras esté vacía, el margen de los dashboards aparece como
 * pendiente en vez de fingir un número.
 */
export default async function AdminCostsPage() {
  await requireAdmin();
  const { from, to } = monthToDate();

  const [expenses, locations, revenue, costos, empleados] = await Promise.all([
    db.expense.findMany({
      where: { active: true },
      include: { location: { select: { shortName: true } } },
      orderBy: [{ category: "asc" }, { concept: "asc" }],
    }),
    db.location.findMany({
      where: { status: { not: "CLOSED" } },
      select: { id: true, shortName: true },
      orderBy: { sort: "asc" },
    }),
    getRevenue(from, to),
    getCosts(from, to),
    db.employee.count({ where: { status: "ACTIVE", monthlySalaryCents: { not: null } } }),
  ]);

  const margin = computeMargin(revenue.total.totalCents, costos.totalCents);

  return (
    <>
      <PageHeader
        title="Costos y rentabilidad"
        description="Renta, servicios, nómina y demás gastos. De aquí sale el margen que ves en el dashboard y en cada ubicación."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Ingreso del mes" value={formatMXN(revenue.total.totalCents)} icon={TrendingUp} />
        <Stat
          label="Costos del mes"
          value={formatMXN(costos.totalCents)}
          sub={`${expenses.length} gastos · nómina de ${empleados} empleados`}
          icon={Receipt}
        />
        <Stat
          label="Margen"
          value={costos.totalCents === 0 ? "—" : formatMXN(margin.margenCents)}
          sub={costos.totalCents === 0 ? "Captura gastos para calcularlo" : `${margin.margenPct}% del ingreso`}
          icon={margin.margenCents >= 0 ? TrendingUp : TrendingDown}
        />
        <Stat
          label="Nómina del periodo"
          value={formatMXN(costos.nominaCents)}
          sub="Desde los empleados con sueldo capturado"
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="eyebrow">Gastos registrados</h2>
        <Modal trigger="Nuevo gasto" title="Nuevo gasto">
          <ActionForm action={upsertExpense} submitLabel="Guardar gasto">
            <ExpenseFields locations={locations} />
          </ActionForm>
        </Modal>
      </div>

      {expenses.length === 0 ? (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Todavía no hay gastos capturados</CardTitle>
            <CardDescription>
              Sin gastos, los dashboards solo pueden mostrar ingresos. Registra al menos la renta y
              los servicios de cada sede para ver margen, utilidad y punto de equilibrio.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={Receipt}
              title="Empieza por los gastos fijos"
              description="Renta, servicios, limpieza y nómina son los que más pesan."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Concepto</TH>
                <TH>Categoría</TH>
                <TH>Ubicación</TH>
                <TH>Recurrencia</TH>
                <TH>Importe</TH>
                <TH>Fecha</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {expenses.map((e) => (
                <TR key={e.id}>
                  <TD className="font-display font-semibold">{e.concept}</TD>
                  <TD className="text-stone-deep">{CATEGORY_LABEL[e.category] ?? e.category}</TD>
                  <TD>
                    {e.location ? (
                      <Badge variant="outline">{e.location.shortName}</Badge>
                    ) : (
                      <Badge variant="default">Corporativo</Badge>
                    )}
                  </TD>
                  <TD>{RECURRENCE_LABEL[e.recurrence] ?? e.recurrence}</TD>
                  <TD className="font-display font-semibold">{formatMXN(e.amountCents)}</TD>
                  <TD className="text-xs text-stone">
                    {e.incurredAt ? formatDateMX(e.incurredAt) : "—"}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Modal trigger="Editar" title={`Editar ${e.concept}`}>
                        <ActionForm action={upsertExpense} submitLabel="Guardar">
                          <ExpenseFields expense={e} locations={locations} />
                        </ActionForm>
                      </Modal>
                      <ActionButton
                        action={deleteExpense.bind(null, e.id)}
                        label="Eliminar"
                        variant="danger"
                        confirmText={`¿Eliminar el gasto "${e.concept}"?`}
                      />
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
      )}

      <p className="mt-4 text-xs text-stone">
        Los gastos mensuales se prorratean al periodo consultado y los anuales cuentan 1/12 por mes.
        La nómina se suma desde los empleados con sueldo capturado: si además registras la nómina
        como gasto, no captures el sueldo en el empleado para no contarla dos veces.
      </p>
    </>
  );
}
