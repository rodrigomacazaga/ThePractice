import { ArrowRight, CalendarDays, Compass } from "lucide-react";
import { requireClient } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PractitionerCard } from "@/components/marketing/practitioner-card";

export const dynamic = "force-dynamic";

export default async function ClientDashboard() {
  const { session, profile } = await requireClient();

  const [upcoming, recommended] = await Promise.all([
    db.booking.findMany({
      where: {
        clientId: profile.id,
        startsAt: { gte: new Date() },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
      orderBy: { startsAt: "asc" },
      take: 3,
      include: {
        practitioner: { include: { user: { select: { name: true } } } },
        service: true,
        location: true,
      },
    }),
    db.practitionerProfile.findMany({
      where: { verificationStatus: "APPROVED", microsite: { published: true }, acceptingClients: true },
      orderBy: [{ featured: "desc" }, { approvedAt: "desc" }],
      take: 3,
      include: {
        user: { select: { name: true, image: true } },
        locations: { include: { location: true } },
      },
    }),
  ]);

  const firstName = (session.user.name ?? "").split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Hola, ${firstName}`}
        description="Encuentra a tu profesional y gestiona tus sesiones."
        actions={
          <ButtonLink href="/directory">
            <Compass className="h-4 w-4" />
            Explorar directorio
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Próximas sesiones</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin sesiones agendadas"
              description="Explora el directorio y agenda tu primera sesión con un profesional verificado."
              action={<ButtonLink href="/directory">Buscar profesional</ButtonLink>}
            />
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-semibold">
                      {b.service?.name ?? "Sesión"} con {b.practitioner?.user.name}
                    </p>
                    <p className="text-xs text-stone-deep">
                      {formatDateTimeMX(b.startsAt, b.location.timezone)} · The Practice{" "}
                      {b.location.shortName}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-stone">{b.code}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {recommended.length > 0 && (
        <>
          <div className="mt-10 flex items-end justify-between">
            <h2 className="eyebrow">Profesionales recomendados</h2>
            <ButtonLink href="/directory" variant="ghost" size="sm">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </ButtonLink>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((p) => (
              <PractitionerCard key={p.id} practitioner={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
