import { Inbox } from "lucide-react";
import { requireAdmin } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { LeadRow } from "./lead-row";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  PRACTITIONER_APPLICATION: "Aplicación",
  CONTACT: "Contacto",
  CLIENT_INQUIRY: "Cliente potencial",
};

interface Props {
  searchParams: Promise<{ status?: string; type?: string }>;
}

export default async function AdminLeadsPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;

  const leads = await db.lead.findMany({
    where: {
      status: sp.status ? (sp.status as never) : undefined,
      type: sp.type ? (sp.type as never) : undefined,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { location: true },
  });

  const counts = await db.lead.groupBy({ by: ["status"], _count: true });
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  const PIPELINE = [
    { key: "", label: "Todos" },
    { key: "NEW", label: `Nuevos (${countFor("NEW")})` },
    { key: "CONTACTED", label: `Contactados (${countFor("CONTACTED")})` },
    { key: "QUALIFIED", label: `Calificados (${countFor("QUALIFIED")})` },
    { key: "CALL_SCHEDULED", label: `Llamada (${countFor("CALL_SCHEDULED")})` },
    { key: "DEPOSIT_PAID", label: `Depósito (${countFor("DEPOSIT_PAID")})` },
    { key: "CONVERTED", label: `Convertidos (${countFor("CONVERTED")})` },
    { key: "LOST", label: `Perdidos (${countFor("LOST")})` },
  ];

  return (
    <>
      <PageHeader
        title="Leads"
        description="Pipeline de preventa y solicitudes de contacto."
      />

      {/* FILTRO POR ETAPA */}
      <div className="mb-6 flex flex-wrap gap-2">
        {PIPELINE.map((stage) => (
          <a
            key={stage.key}
            href={stage.key ? `/admin/leads?status=${stage.key}` : "/admin/leads"}
            className={
              (sp.status ?? "") === stage.key
                ? "rounded-xl bg-ink px-4 py-2 font-display text-xs font-semibold text-paper"
                : "rounded-xl border border-line-strong bg-surface px-4 py-2 font-display text-xs font-semibold text-ink-mute hover:border-ink"
            }
          >
            {stage.label}
          </a>
        ))}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin leads en esta etapa"
          description="Los leads de la landing de La Ceiba, /apply y contacto aparecen aquí."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={{
                id: lead.id,
                name: lead.name,
                email: lead.email,
                phone: lead.phone,
                specialty: lead.specialty,
                yearsExperience: lead.yearsExperience,
                city: lead.city,
                status: lead.status,
                typeLabel: TYPE_LABEL[lead.type] ?? lead.type,
                interestedPlan: lead.interestedPlan,
                roomPreference: lead.roomPreference,
                weeklySessions: lead.weeklySessions,
                preferredDays: lead.preferredDays,
                preferredHours: lead.preferredHours,
                wantsLocker: lead.wantsLocker,
                message: lead.message,
                source: lead.source,
                depositCents: lead.depositCents,
                adminNotes: lead.adminNotes,
                createdAtLabel: formatDateTimeMX(lead.createdAt),
                locationName: lead.location?.shortName ?? null,
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-2 text-xs text-stone">
        <Badge variant="outline">Fuentes: landing-la-ceiba · apply · contact · micrositios</Badge>
      </div>
    </>
  );
}
