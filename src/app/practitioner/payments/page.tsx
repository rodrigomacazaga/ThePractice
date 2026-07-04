import { CreditCard } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; variant: "sage" | "amber" | "rust" | "default" }> = {
  PAID: { label: "Pagado", variant: "sage" },
  PENDING: { label: "Pendiente", variant: "amber" },
  FAILED: { label: "Fallido", variant: "rust" },
  REFUNDED: { label: "Reembolsado", variant: "default" },
  PARTIALLY_REFUNDED: { label: "Reemb. parcial", variant: "default" },
  CANCELLED: { label: "Cancelado", variant: "default" },
};

const KIND_LABEL: Record<string, string> = {
  MEMBERSHIP: "Membresía",
  PACKAGE: "Paquete de horas",
  BOOKING: "Reserva de sala",
  ADDON: "Add-on",
  DEPOSIT: "Depósito",
};

export default async function PaymentsPage() {
  const { session } = await requirePractitioner();
  const payments = await db.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="Pagos"
        description="Tus pagos a The Practice: membresías, paquetes y salas."
      />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin pagos registrados"
          description="Tus pagos de membresías, paquetes y reservas aparecerán aquí con su recibo."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Concepto</TH>
              <TH>Tipo</TH>
              <TH className="text-right">Monto</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {payments.map((p) => {
              const meta = STATUS_META[p.status] ?? { label: p.status, variant: "default" as const };
              return (
                <TR key={p.id}>
                  <TD className="whitespace-nowrap text-stone-deep">
                    {formatDateTimeMX(p.createdAt)}
                  </TD>
                  <TD className="max-w-64 truncate">{p.description ?? "—"}</TD>
                  <TD>{KIND_LABEL[p.kind] ?? p.kind}</TD>
                  <TD className="text-right font-display font-bold">
                    {formatMXN(p.amountCents)}
                    {p.refundedCents > 0 && (
                      <span className="block text-xs font-normal text-stone">
                        −{formatMXN(p.refundedCents)} reembolsado
                      </span>
                    )}
                  </TD>
                  <TD>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}
