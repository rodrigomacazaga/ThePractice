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

  // Liga por email con los practitioners ya registrados (vía /register): permite
  // ver si un lead de aplicación ya creó su perfil. Una sola query + match en memoria.
  const registeredProfiles = await db.practitionerProfile.findMany({
    include: { user: { select: { email: true } } },
  });
  const registeredByEmail = new Map<string, string>();
  for (const profile of registeredProfiles) {
    if (profile.user.email) {
      registeredByEmail.set(profile.user.email.toLowerCase(), profile.verificationStatus);
    }
  }

  const PIPELINE = [
    { key: "", label: "Todos" },
    { key: "NEW", label: `Nuevos (${countFor("NEW")})` },
    { key: "CONTACTED", label: `Contactados (${countFor("CONTACTED")})` },
    { key: "QUALIFIED", label: `Calificados (${countFor("QUALIFIED")})` },
    { key: "CALL_SCHEDULED", label: `Llamada (${countFor("CALL_SCHEDULED")})` },
    { key: "PAYMENT_LINK_SENT", label: `Pendiente de pago (${countFor("PAYMENT_LINK_SENT")})` },
    { key: "DEPOSIT_PAID", label: `Depósito (${countFor("DEPOSIT_PAID")})` },
    { key: "FOUNDER_RESERVED", label: `Founder reservado (${countFor("FOUNDER_RESERVED")})` },
    { key: "CONVERTED", label: `Convertidos (${countFor("CONVERTED")})` },
    { key: "NOT_COMPATIBLE", label: `No compatibles (${countFor("NOT_COMPATIBLE")})` },
    { key: "NOT_INTERESTED", label: `No interesados (${countFor("NOT_INTERESTED")})` },
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
              registeredStatus={
                lead.type === "PRACTITIONER_APPLICATION"
                  ? registeredByEmail.get(lead.email.toLowerCase()) ?? null
                  : null
              }
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
                startTimeframe: lead.startTimeframe,
                message: lead.message,
                source: lead.source,
                campaign:
                  [lead.utmSource, lead.utmMedium, lead.utmCampaign].filter(Boolean).join(" · ") ||
                  null,
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
