import { Search, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX, formatMXN } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Field, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/dashboard/action-form";
import { toggleUserActive } from "../actions";

export const dynamic = "force-dynamic";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  FAILED: "Fallido",
  REFUNDED: "Reembolsado",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  CANCELLED: "Cancelado",
};

export default async function AdminClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();

  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const userWhere = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : undefined;

  const clients = await db.clientProfile.findMany({
    where: userWhere ? { user: userWhere } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          active: true,
          createdAt: true,
          payments: {
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
              id: true,
              amountCents: true,
              status: true,
              kind: true,
              createdAt: true,
            },
          },
        },
      },
      bookings: {
        orderBy: { startsAt: "desc" },
        take: 5,
        include: {
          practitioner: { include: { user: { select: { name: true } } } },
          location: { select: { shortName: true } },
        },
      },
      _count: { select: { bookings: true, favorites: true } },
    },
  });

  return (
    <>
      <PageHeader title="Clientes" description="Cuentas de clientes finales." />

      <form className="mb-6 flex max-w-md items-end gap-3">
        <Field label="Buscar por nombre o email" htmlFor="client-q" className="flex-1">
          <Input id="client-q" name="q" defaultValue={query} placeholder="ana@correo.com" />
        </Field>
        <Button type="submit" variant="outline" size="lg">
          <Search className="h-4 w-4" /> Buscar
        </Button>
      </form>

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "Sin coincidencias" : "Sin clientes registrados"}
          description={
            query
              ? `Ningún cliente coincide con "${query}".`
              : "Los clientes que creen cuenta para reservar sesiones aparecen aquí."
          }
        />
      ) : (
        <div className="space-y-4">
          {clients.map((c) => {
            const toggleActive = toggleUserActive.bind(null, c.user.id);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-line bg-surface p-6 shadow-(--shadow-card)"
              >
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar name={c.user.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-sm font-bold">{c.user.name}</p>
                      {!c.user.active && <Badge variant="rust">Cuenta inactiva</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-stone-deep">
                      {c.user.email} · {c._count.bookings} sesiones · {c._count.favorites} favoritos ·
                      alta {formatDateTimeMX(c.user.createdAt)}
                    </p>
                  </div>
                  <ActionButton
                    action={toggleActive}
                    label={c.user.active ? "Desactivar" : "Reactivar"}
                    variant={c.user.active ? "danger" : "outline"}
                    confirmText={
                      c.user.active
                        ? `¿Desactivar la cuenta de ${c.user.name}? No podrá iniciar sesión hasta reactivarla.`
                        : undefined
                    }
                  />
                </div>

                <details className="mt-4">
                  <summary className="cursor-pointer font-display text-xs font-semibold text-stone-deep hover:text-ink">
                    Ver últimas reservas y pagos
                  </summary>
                  <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
                        Últimas reservas
                      </p>
                      {c.bookings.length === 0 ? (
                        <p className="mt-2 text-sm text-stone">Sin reservas.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {c.bookings.map((b) => (
                            <li
                              key={b.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2"
                            >
                              <span className="min-w-0 truncate">
                                {b.location.shortName}
                                {b.practitioner ? ` · ${b.practitioner.user.name}` : ""}
                              </span>
                              <span className="whitespace-nowrap text-xs text-stone-deep">
                                {formatDateTimeMX(b.startsAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
                        Últimos pagos
                      </p>
                      {c.user.payments.length === 0 ? (
                        <p className="mt-2 text-sm text-stone">Sin pagos.</p>
                      ) : (
                        <ul className="mt-2 space-y-1.5 text-sm">
                          {c.user.payments.map((pay) => (
                            <li
                              key={pay.id}
                              className="flex items-center justify-between gap-3 rounded-lg bg-paper px-3 py-2"
                            >
                              <span className="min-w-0 truncate">
                                {formatMXN(pay.amountCents)}
                                <span className="ml-2 text-xs text-stone">
                                  {PAYMENT_STATUS_LABEL[pay.status] ?? pay.status}
                                </span>
                              </span>
                              <span className="whitespace-nowrap text-xs text-stone-deep">
                                {formatDateTimeMX(pay.createdAt)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
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
