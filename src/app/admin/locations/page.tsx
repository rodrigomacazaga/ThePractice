import { Building2 } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  await requireAdmin();

  const locations = await db.location.findMany({
    orderBy: { sort: "asc" },
    include: {
      _count: { select: { rooms: true, practitioners: true, bookings: true } },
      lockers: true,
    },
  });

  return (
    <>
      <PageHeader
        title="Ubicaciones"
        description="La red de The Practice. Cada ubicación tiene sus salas, lockers y configuración."
      />

      <div className="grid gap-5 md:grid-cols-2">
        {locations.map((loc) => {
          const lockersFree = loc.lockers.filter((l) => l.status === "AVAILABLE").length;
          return (
            <Card key={loc.id}>
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4.5 w-4.5 text-clay" />
                      <h3 className="font-display text-lg font-bold">{loc.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-stone-deep">
                      {loc.city}, {loc.state} · {loc.timezone} · {loc.openingHour}:00–
                      {loc.closingHour}:00
                    </p>
                  </div>
                  <Badge variant={loc.status === "OPEN" ? "sage" : "amber"}>
                    {loc.status === "OPEN" ? "Abierta" : "Próximamente"}
                  </Badge>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: "Salas", value: loc._count.rooms },
                    { label: "Practitioners", value: loc._count.practitioners },
                    { label: "Reservas", value: loc._count.bookings },
                    {
                      label: "Lockers libres",
                      value: `${lockersFree}/${loc.lockers.length}`,
                    },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl bg-paper p-3">
                      <p className="font-display text-lg font-bold">{s.value}</p>
                      <p className="text-[10px] font-semibold tracking-wider text-stone uppercase">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs text-stone">
                  slug: <span className="font-mono">/locations/{loc.slug}</span>
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-stone">
        Alta de nuevas ubicaciones: vía seed o directamente en la base de datos
        en el MVP. El formulario de alta con fotos y amenidades llega en la
        siguiente fase (requiere el proveedor de storage en producción).
      </p>
    </>
  );
}
