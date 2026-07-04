import Link from "next/link";
import { ExternalLink, Globe } from "lucide-react";
import { requirePractitioner } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { hourLabel } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, Input, Select, Textarea, Label } from "@/components/ui/form";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import {
  updateProfile,
  updateMicrosite,
  addAvailability,
  removeAvailability,
} from "../actions";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export default async function MicrositePage() {
  const { profile } = await requirePractitioner();
  const [microsite, availability] = await Promise.all([
    db.microsite.findUnique({ where: { practitionerId: profile.id } }),
    db.availability.findMany({
      where: { practitionerId: profile.id },
      orderBy: [{ weekday: "asc" }, { startHour: "asc" }],
    }),
  ]);

  const isPublished = microsite?.published ?? false;

  return (
    <>
      <PageHeader
        title="Mi micrositio"
        description="Tu página pública en el directorio de The Practice."
        actions={
          <Link
            href={`/p/${profile.slug}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-line-strong px-5 font-display text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            <ExternalLink className="h-4 w-4" />
            Ver mi página
          </Link>
        }
      />

      {/* ESTADO */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-5 shadow-(--shadow-card)">
        <Globe className="h-5 w-5 text-clay" />
        <div className="flex-1">
          <p className="font-display text-sm font-bold">
            thepractice.mx/p/{profile.slug}
          </p>
          <p className="text-xs text-stone-deep">
            {isPublished
              ? "Publicado — visible en el directorio y buscadores."
              : profile.verificationStatus === "APPROVED"
                ? "Borrador — publícalo abajo cuando esté listo."
                : "Se podrá publicar cuando tu perfil sea aprobado."}
          </p>
        </div>
        <Badge variant={isPublished ? "sage" : "amber"} size="md">
          {isPublished ? "Publicado" : "Borrador"}
        </Badge>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* PERFIL PÚBLICO */}
        <Card>
          <CardHeader>
            <CardTitle>Perfil público</CardTitle>
            <CardDescription>Lo que ven tus clientes potenciales.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActionForm action={updateProfile} className="space-y-5">
              <Field label="Headline" htmlFor="headline" hint="Ej. Psicóloga clínica · Ansiedad y burnout">
                <Input id="headline" name="headline" defaultValue={profile.headline ?? ""} maxLength={120} />
              </Field>
              <Field label="Bio" htmlFor="bio">
                <Textarea id="bio" name="bio" rows={5} defaultValue={profile.bio ?? ""} maxLength={3000} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Especialidades" htmlFor="specialties" hint="Separadas por coma">
                  <Input
                    id="specialties"
                    name="specialties"
                    defaultValue={profile.specialties.join(", ")}
                  />
                </Field>
                <Field label="Idiomas" htmlFor="languages" hint="Separados por coma">
                  <Input id="languages" name="languages" defaultValue={profile.languages.join(", ")} />
                </Field>
                <Field label="Modalidad" htmlFor="modality">
                  <Select id="modality" name="modality" defaultValue={profile.modality}>
                    <option value="IN_PERSON">Presencial</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Híbrida</option>
                  </Select>
                </Field>
                <Field label="Años de experiencia" htmlFor="yearsExperience">
                  <Input
                    id="yearsExperience"
                    name="yearsExperience"
                    type="number"
                    min={0}
                    defaultValue={profile.yearsExperience ?? ""}
                  />
                </Field>
                <Field label="Precio por sesión desde (MXN)" htmlFor="sessionPriceFrom">
                  <Input
                    id="sessionPriceFrom"
                    name="sessionPriceFrom"
                    type="number"
                    min={0}
                    defaultValue={
                      profile.sessionPriceFromCents != null
                        ? profile.sessionPriceFromCents / 100
                        : ""
                    }
                  />
                </Field>
                <Field label="Hasta (MXN)" htmlFor="sessionPriceTo">
                  <Input
                    id="sessionPriceTo"
                    name="sessionPriceTo"
                    type="number"
                    min={0}
                    defaultValue={
                      profile.sessionPriceToCents != null ? profile.sessionPriceToCents / 100 : ""
                    }
                  />
                </Field>
              </div>
              <Field label="Formación y credenciales (texto público)" htmlFor="credentialsText">
                <Textarea
                  id="credentialsText"
                  name="credentialsText"
                  rows={3}
                  defaultValue={profile.credentialsText ?? ""}
                />
              </Field>
              <Field label="Políticas para clientes" htmlFor="policiesText" hint="Cancelaciones, pagos, reagendas…">
                <Textarea
                  id="policiesText"
                  name="policiesText"
                  rows={3}
                  defaultValue={profile.policiesText ?? ""}
                />
              </Field>
              <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-mute">
                <input
                  type="checkbox"
                  name="acceptingClients"
                  defaultChecked={profile.acceptingClients}
                  className="h-4 w-4 accent-ink"
                />
                Acepto nuevos clientes
              </label>
            </ActionForm>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* CONFIG MICROSITIO */}
          <Card>
            <CardHeader>
              <CardTitle>Configuración del micrositio</CardTitle>
              <CardDescription>Publicación, SEO y opciones de reserva.</CardDescription>
            </CardHeader>
            <CardContent>
              <ActionForm action={updateMicrosite} className="space-y-5">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper p-4 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={isPublished}
                    disabled={profile.verificationStatus !== "APPROVED"}
                    className="h-4.5 w-4.5 accent-ink"
                  />
                  Micrositio publicado (visible en directorio)
                </label>
                <Field label="Título SEO" htmlFor="seoTitle" hint="Máx. 70 caracteres">
                  <Input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={microsite?.seoTitle ?? ""} />
                </Field>
                <Field label="Descripción SEO" htmlFor="seoDescription" hint="Máx. 160 caracteres">
                  <Textarea
                    id="seoDescription"
                    name="seoDescription"
                    rows={2}
                    maxLength={160}
                    defaultValue={microsite?.seoDescription ?? ""}
                  />
                </Field>
                <div className="space-y-2.5">
                  {[
                    { name: "showPrices", label: "Mostrar precios de servicios", checked: microsite?.showPrices ?? true },
                    { name: "showReviews", label: "Mostrar reseñas", checked: microsite?.showReviews ?? true },
                    { name: "allowBooking", label: "Permitir solicitudes de reserva de clientes", checked: microsite?.allowBooking ?? false },
                  ].map((opt) => (
                    <label key={opt.name} className="flex cursor-pointer items-center gap-3 text-sm text-ink-mute">
                      <input
                        type="checkbox"
                        name={opt.name}
                        defaultChecked={opt.checked}
                        className="h-4 w-4 accent-ink"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </ActionForm>
            </CardContent>
          </Card>

          {/* DISPONIBILIDAD PÚBLICA */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios públicos</CardTitle>
              <CardDescription>
                Los horarios en los que normalmente atiendes (se muestran en tu página).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availability.length > 0 && (
                <div className="mb-5 space-y-2">
                  {availability.map((slot) => {
                    const removeThis = removeAvailability.bind(null, slot.id);
                    return (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 text-sm"
                      >
                        <span>
                          {WEEKDAYS[slot.weekday]} · {hourLabel(slot.startHour)}–{hourLabel(slot.endHour)}
                        </span>
                        <ActionButton action={removeThis} label="Quitar" variant="ghost" />
                      </div>
                    );
                  })}
                </div>
              )}

              <ActionForm action={addAvailability} submitLabel="Agregar horario">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="weekday">Día</Label>
                    <Select id="weekday" name="weekday" defaultValue="1">
                      {WEEKDAYS.map((d, i) => (
                        <option key={d} value={i}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="startHour">Desde</Label>
                    <Select id="startHour" name="startHour" defaultValue="9">
                      {Array.from({ length: 16 }, (_, i) => i + 7).map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="endHour">Hasta</Label>
                    <Select id="endHour" name="endHour" defaultValue="14">
                      {Array.from({ length: 16 }, (_, i) => i + 8).map((h) => (
                        <option key={h} value={h}>
                          {hourLabel(h)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </ActionForm>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
