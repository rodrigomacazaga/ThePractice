import { Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminClientsPage() {
  await requireAdmin();

  const clients = await db.clientProfile.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { name: true, email: true, createdAt: true } },
      _count: { select: { bookings: true, favorites: true } },
    },
  });

  return (
    <>
      <PageHeader title="Clientes" description="Cuentas de clientes finales." />

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin clientes registrados"
          description="Los clientes que creen cuenta para reservar sesiones aparecen aquí."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nombre</TH>
              <TH>Email</TH>
              <TH className="text-right">Sesiones</TH>
              <TH className="text-right">Favoritos</TH>
              <TH>Alta</TH>
            </TR>
          </THead>
          <TBody>
            {clients.map((c) => (
              <TR key={c.id}>
                <TD className="font-medium">{c.user.name}</TD>
                <TD className="text-stone-deep">{c.user.email}</TD>
                <TD className="text-right">{c._count.bookings}</TD>
                <TD className="text-right">{c._count.favorites}</TD>
                <TD className="whitespace-nowrap text-stone-deep">
                  {formatDateTimeMX(c.user.createdAt)}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </>
  );
}
