"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { ActionForm } from "@/components/dashboard/action-form";
import { updateLead } from "../actions";
import { cn } from "@/lib/utils";

export interface LeadData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty: string | null;
  yearsExperience: number | null;
  city: string | null;
  status: string;
  typeLabel: string;
  interestedPlan: string | null;
  roomPreference: string | null;
  weeklySessions: number | null;
  preferredDays: string[];
  preferredHours: string | null;
  wantsLocker: boolean | null;
  message: string | null;
  source: string | null;
  depositCents: number | null;
  adminNotes: string | null;
  createdAtLabel: string;
  locationName: string | null;
}

const STATUS_VARIANT: Record<string, "clay" | "amber" | "sage" | "default" | "ink" | "rust"> = {
  NEW: "clay",
  CONTACTED: "amber",
  QUALIFIED: "amber",
  CALL_SCHEDULED: "ink",
  DEPOSIT_PAID: "sage",
  CONVERTED: "sage",
  LOST: "default",
};

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  QUALIFIED: "Calificado",
  CALL_SCHEDULED: "Llamada agendada",
  DEPOSIT_PAID: "Depósito pagado",
  CONVERTED: "Convertido",
  LOST: "Perdido",
};

export function LeadRow({ lead }: { lead: LeadData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-line bg-surface shadow-(--shadow-card)">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full flex-wrap items-center gap-3 p-5 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-bold">{lead.name}</p>
            <Badge variant={STATUS_VARIANT[lead.status] ?? "default"}>
              {STATUS_LABEL[lead.status] ?? lead.status}
            </Badge>
            <Badge variant="outline">{lead.typeLabel}</Badge>
          </div>
          <p className="mt-1 text-xs text-stone-deep">
            {[lead.specialty, lead.city, lead.source, lead.createdAtLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-stone transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-2">
          {/* DATOS */}
          <div className="space-y-3 text-sm">
            <p>
              <a href={`mailto:${lead.email}`} className="font-medium text-ink underline">
                {lead.email}
              </a>
              {lead.phone && (
                <>
                  {" · "}
                  <a
                    href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink underline"
                  >
                    {lead.phone}
                  </a>
                </>
              )}
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-ink-mute">
              {lead.yearsExperience != null && <p>Experiencia: {lead.yearsExperience} años</p>}
              {lead.weeklySessions != null && <p>Sesiones/semana: {lead.weeklySessions}</p>}
              {lead.interestedPlan && <p>Plan de interés: {lead.interestedPlan}</p>}
              {lead.roomPreference && <p>Sala: {lead.roomPreference}</p>}
              {lead.preferredDays.length > 0 && <p>Días: {lead.preferredDays.join(", ")}</p>}
              {lead.preferredHours && <p>Horario: {lead.preferredHours}</p>}
              {lead.wantsLocker != null && <p>Locker: {lead.wantsLocker ? "sí" : "no"}</p>}
              {lead.locationName && <p>Ubicación: {lead.locationName}</p>}
            </div>
            {lead.message && (
              <p className="rounded-xl bg-paper p-4 text-xs leading-relaxed text-ink-mute">
                “{lead.message}”
              </p>
            )}
          </div>

          {/* GESTIÓN */}
          <ActionForm action={updateLead} submitLabel="Actualizar lead">
            <input type="hidden" name="leadId" value={lead.id} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Etapa" htmlFor={`status-${lead.id}`}>
                <Select id={`status-${lead.id}`} name="status" defaultValue={lead.status}>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Depósito (MXN)" htmlFor={`deposit-${lead.id}`}>
                <Input
                  id={`deposit-${lead.id}`}
                  name="deposit"
                  type="number"
                  min={0}
                  defaultValue={lead.depositCents != null ? lead.depositCents / 100 : ""}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Notas internas" htmlFor={`notes-${lead.id}`}>
                <Textarea
                  id={`notes-${lead.id}`}
                  name="adminNotes"
                  rows={2}
                  defaultValue={lead.adminNotes ?? ""}
                />
              </Field>
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  );
}
