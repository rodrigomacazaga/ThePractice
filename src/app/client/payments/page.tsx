import { CreditCard } from "lucide-react";
import { requireClient } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function ClientPaymentsPage() {
  const { session } = await requireClient();
  const payments = await db.payment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader title="Pagos" description="Tus pagos de sesiones." />

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin pagos"
          description="Cuando pagues una sesión online, tu recibo aparecerá aquí."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Concepto</TH>
              <TH className="text-right">Monto</TH>
              <TH>Estado</TH>
            </TR>
          </THead>
          <TBody>
            {payments.map((p) => (
              <TR key={p.id}>
                <TD className="whitespace-nowrap text-stone-deep">
                  {formatDateTimeMX(p.createdAt)}
                </TD>
                <TD>{p.description ?? "—"}</TD>
                <TD className="text-right font-display font-bold">{formatMXN(p.amountCents)}</TD>
                <TD>
                  <Badge variant={p.status === "PAID" ? "sage" : "default"}>{p.status}</Badge>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
