import { Inbox } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { formatDateTimeMX } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const { profile } = await requirePractitioner();
  const leads = await db.lead.findMany({
    where: { practitionerId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <PageHeader
        title="Leads"
        description="Personas que te contactaron desde tu micrositio."
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Sin leads todavía"
          description="Cuando alguien te escriba desde tu micrositio, aparecerá aquí con sus datos de contacto."
        />
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="font-display text-sm font-bold">{lead.name}</p>
                  {lead.status === "NEW" && <Badge variant="clay">Nuevo</Badge>}
                </div>
                <p className="text-xs text-stone">{formatDateTimeMX(lead.createdAt)}</p>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-mute">{lead.message}</p>
              <div className="mt-3 flex flex-wrap gap-4 border-t border-line pt-3 text-xs text-stone-deep">
                <a href={`mailto:${lead.email}`} className="font-medium text-ink hover:underline">
                  {lead.email}
                </a>
                {lead.phone && (
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink hover:underline"
                  >
                    WhatsApp: {lead.phone}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
