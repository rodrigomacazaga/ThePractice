import { CreditCard } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
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

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [payments, monthPaid, monthByKind] = await Promise.all([
    db.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: { user: { select: { name: true, email: true } } },
    }),
    db.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amountCents: true },
      _count: true,
    }),
    db.payment.groupBy({
      by: ["kind"],
      where: { status: "PAID", paidAt: { gte: monthStart } },
      _sum: { amountCents: true },
    }),
  ]);

  const kindLabel: Record<string, string> = {
    MEMBERSHIP: "Membresías",
    PACKAGE: "Paquetes",
    BOOKING: "Salas",
    ADDON: "Add-ons",
    DEPOSIT: "Depósitos",
  };

  return (
    <>
      <PageHeader
        title="Pagos"
        description="Todos los pagos de la plataforma. Los reembolsos se procesan vía API con auditoría."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        <Stat
          label="Cobrado este mes"
          value={formatMXN(monthPaid._sum.amountCents ?? 0)}
          sub={`${monthPaid._count} pagos`}
          icon={CreditCard}
        />
        {monthByKind.slice(0, 3).map((row) => (
          <Stat
            key={row.kind}
            label={kindLabel[row.kind] ?? row.kind}
            value={formatMXN(row._sum.amountCents ?? 0)}
          />
        ))}
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="Sin pagos"
          description="Los pagos de membresías, paquetes y reservas aparecen aquí."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Fecha</TH>
              <TH>Usuario</TH>
              <TH>Concepto</TH>
              <TH>Proveedor</TH>
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
                  <TD>
                    <p className="font-medium">{p.user.name}</p>
                    <p className="text-xs text-stone">{p.user.email}</p>
                  </TD>
                  <TD className="max-w-56 truncate">{p.description ?? p.kind}</TD>
                  <TD className="text-stone-deep">{p.provider}</TD>
                  <TD className="text-right font-display font-bold">
                    {formatMXN(p.amountCents)}
                    {p.refundedCents > 0 && (
                      <span className="block text-xs font-normal text-stone">
                        −{formatMXN(p.refundedCents)}
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
