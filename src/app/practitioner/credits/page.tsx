import { Wallet } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatCredits, formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Stat } from "@/components/ui/stat";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckoutButton } from "@/components/dashboard/checkout-button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const TXN_LABEL: Record<string, string> = {
  PACKAGE_PURCHASE: "Compra de paquete",
  MEMBERSHIP_GRANT: "Horas de membresía",
  BOOKING_CONSUMPTION: "Reserva de sala",
  CANCELLATION_PENALTY: "Penalización por cancelación",
  NO_SHOW_PENALTY: "Penalización no-show",
  REFUND: "Reembolso",
  EXPIRATION: "Expiración",
  ROLLOVER: "Rollover",
  ADMIN_ADJUSTMENT: "Ajuste administrativo",
};

export default async function CreditsPage() {
  const { profile } = await requirePractitioner();

  const [packages, transactions] = await Promise.all([
    db.hourPackage.findMany({ where: { active: true }, orderBy: { sort: "asc" } }),
    profile.wallet
      ? db.creditTransaction.findMany({
          where: { walletId: profile.wallet.id },
          orderBy: { createdAt: "desc" },
          take: 30,
        })
      : Promise.resolve([]),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usedThisMonth = transactions
    .filter((t) => t.type === "BOOKING_CONSUMPTION" && t.createdAt >= monthStart)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return (
    <>
      <PageHeader
        title="Créditos"
        description="1 crédito = 1 hora de sala estándar. Salas premium consumen 1.5, studio 2."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Balance actual"
          value={formatCredits(profile.wallet?.balance ?? 0)}
          icon={Wallet}
        />
        <Stat label="Usados este mes" value={formatCredits(usedThisMonth)} />
        <Stat
          label="Membresía"
          value={
            profile.membership?.status === "ACTIVE"
              ? `${formatCredits(profile.membership.plan.includedCredits)}/mes`
              : "—"
          }
          sub={profile.membership?.status === "ACTIVE" ? profile.membership.plan.name : "Sin plan activo"}
        />
      </div>

      {/* COMPRAR PAQUETES */}
      <h2 className="mt-10 eyebrow">Comprar horas</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className="flex flex-col rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)"
          >
            <p className="font-display text-2xl font-bold">
              {formatCredits(pkg.hours)} <span className="text-sm text-stone">horas</span>
            </p>
            <p className="mt-1.5 font-display text-base font-bold">{formatMXN(pkg.priceCents)}</p>
            <p className="mt-0.5 text-xs text-stone-deep">
              {formatMXN(Math.round(pkg.priceCents / pkg.hours))}/h · vigencia {pkg.validityDays} días
            </p>
            <div className="mt-4">
              <CheckoutButton kind="PACKAGE" code={pkg.code} size="md" variant="outline" className="w-full">
                Comprar
              </CheckoutButton>
            </div>
          </div>
        ))}
      </div>

      {/* MOVIMIENTOS */}
      <h2 className="mt-10 eyebrow">Movimientos</h2>
      <div className="mt-4">
        {transactions.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="Sin movimientos"
            description="Compra un paquete o activa una membresía para cargar créditos."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Fecha</TH>
                <TH>Concepto</TH>
                <TH>Detalle</TH>
                <TH className="text-right">Créditos</TH>
                <TH className="text-right">Balance</TH>
              </TR>
            </THead>
            <TBody>
              {transactions.map((t) => (
                <TR key={t.id}>
                  <TD className="whitespace-nowrap text-stone-deep">
                    {formatDateTimeMX(t.createdAt)}
                  </TD>
                  <TD>
                    <Badge variant={t.amount >= 0 ? "sage" : "default"}>
                      {TXN_LABEL[t.type] ?? t.type}
                    </Badge>
                  </TD>
                  <TD className="max-w-56 truncate text-stone-deep">{t.note ?? "—"}</TD>
                  <TD
                    className={
                      t.amount >= 0
                        ? "text-right font-display font-bold text-sage"
                        : "text-right font-display font-bold"
                    }
                  >
                    {t.amount >= 0 ? "+" : ""}
                    {formatCredits(t.amount)}
                  </TD>
                  <TD className="text-right text-stone-deep">{formatCredits(t.balanceAfter)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </div>
    </>
  );
}
