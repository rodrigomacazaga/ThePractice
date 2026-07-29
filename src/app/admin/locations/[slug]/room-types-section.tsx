import type { RoomType } from "@prisma/client";
import { Plus } from "lucide-react";
import { formatCredits, formatMXN } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { deleteRoomType, updateRoomTypePricing, upsertRoomType } from "@/app/admin/actions";

function RoomTypeAttributeFields({ rt, uid: uidProp }: { rt?: RoomType; uid?: string }) {
  const uid = uidProp ?? rt?.id ?? "new";
  return (
    <>
      {rt && <input type="hidden" name="roomTypeId" value={rt.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre" htmlFor={`rt-name-${uid}`}>
          <Input
            id={`rt-name-${uid}`}
            name="name"
            required
            placeholder="Focus Room"
            defaultValue={rt?.name}
          />
        </Field>
        <Field label="Capacidad (personas)" htmlFor={`rt-cap-${uid}`}>
          <Input
            id={`rt-cap-${uid}`}
            name="capacity"
            type="number"
            min={1}
            max={30}
            defaultValue={rt?.capacity ?? 2}
          />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`rt-desc-${uid}`}>
          <Textarea
            id={`rt-desc-${uid}`}
            name="description"
            rows={2}
            defaultValue={rt?.description ?? ""}
          />
        </Field>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field
          label="Ideal para"
          htmlFor={`rt-ideal-${uid}`}
          hint="Sepáralas con comas: Psicología, Coaching"
        >
          <Input
            id={`rt-ideal-${uid}`}
            name="idealFor"
            placeholder="Psicología, Coaching"
            defaultValue={rt?.idealFor.join(", ")}
          />
        </Field>
        <Field
          label="Features"
          htmlFor={`rt-feat-${uid}`}
          hint="Sepáralas con comas: 2 sillones, Luz cálida"
        >
          <Input
            id={`rt-feat-${uid}`}
            name="features"
            placeholder="2 sillones, Luz cálida"
            defaultValue={rt?.features.join(", ")}
          />
        </Field>
      </div>
      <div className="mt-3 flex items-end gap-4">
        <Field label="Orden" htmlFor={`rt-sort-${uid}`}>
          <Input
            id={`rt-sort-${uid}`}
            name="sort"
            type="number"
            min={0}
            defaultValue={rt?.sort ?? 0}
            className="w-24"
          />
        </Field>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="active"
            defaultChecked={rt?.active ?? true}
            className="h-4 w-4 accent-clay"
          />
          Activo (visible y reservable)
        </label>
      </div>
    </>
  );
}

/**
 * Campos de un paquete de horas. Sin locationId (llega en una fase posterior):
 * la estructura queda lista para extenderse con un selector de ubicación.
 */

/**
 * Tipos de sala de UNA ubicación. Vive aquí y no en planes y precios: un tipo
 * de sala es inventario físico de la sede, no parte del catálogo comercial.
 */
export function RoomTypesSection({
  loc,
}: {
  loc: { id: string; shortName: string; roomTypes: RoomType[] };
}) {
  return (
        <section key={loc.id}>
          <h2 className="mt-12 eyebrow">Tipos de sala · {loc.shortName}</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {loc.roomTypes.map((rt) => (
          <Card key={rt.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>
                {rt.name}
                <span className="ml-2 font-mono text-xs font-normal text-stone-deep">{rt.code}</span>
                {!rt.active && (
                  <Badge variant="default" className="ms-2">
                    Inactivo
                  </Badge>
                )}
              </CardTitle>
              <span className="text-xs text-stone-deep">
                {formatMXN(rt.baseHourlyPriceCents)}/h · {formatCredits(rt.creditsPerHour)} cr/h
              </span>
            </CardHeader>
            <CardContent>
              <ActionForm action={updateRoomTypePricing} submitLabel="Guardar precios">
                <input type="hidden" name="roomTypeId" value={rt.id} />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Precio/hora (MXN)" htmlFor={`bp-${rt.id}`}>
                    <Input
                      id={`bp-${rt.id}`}
                      name="basePrice"
                      type="number"
                      min={0}
                      defaultValue={rt.baseHourlyPriceCents / 100}
                    />
                  </Field>
                  <Field label="Con membresía" htmlFor={`mpx-${rt.id}`}>
                    <Input
                      id={`mpx-${rt.id}`}
                      name="memberPrice"
                      type="number"
                      min={0}
                      defaultValue={
                        rt.memberHourlyPriceCents != null ? rt.memberHourlyPriceCents / 100 : ""
                      }
                    />
                  </Field>
                  <Field label="Créditos/hora" htmlFor={`cph-${rt.id}`}>
                    <Input
                      id={`cph-${rt.id}`}
                      name="creditsPerHour"
                      type="number"
                      min={0.5}
                      step="0.5"
                      defaultValue={rt.creditsPerHour}
                    />
                  </Field>
                </div>
              </ActionForm>

              <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <Modal trigger="Editar atributos" title={`Editar ${rt.name}`}>
                  <ActionForm action={upsertRoomType} submitLabel="Guardar atributos">
                    <RoomTypeAttributeFields rt={rt} />
                  </ActionForm>
                </Modal>
                <ActionButton
                  action={deleteRoomType.bind(null, rt.id)}
                  label="Eliminar"
                  variant="danger"
                  confirmText={`¿Eliminar el tipo "${rt.name}"? Si no tiene salas se borra definitivamente; si tiene salas solo se desactiva.`}
                />
              </div>
            </CardContent>
          </Card>
            ))}

            {/* Nuevo tipo en esta ubicación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-4.5 w-4.5 text-clay" /> Nuevo tipo en {loc.shortName}
                </CardTitle>
                <CardDescription>
                  El código es la llave interna del tipo (minúsculas y guiones, ej.{" "}
                  <span className="font-mono">focus</span>), único por ubicación y fijo tras
                  crear. Las salas de este tipo se dan de alta en la sección Salas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ActionForm action={upsertRoomType} submitLabel="Crear tipo de sala">
                  <input type="hidden" name="locationId" value={loc.id} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Código" htmlFor={`rt-code-new-${loc.id}`}>
                      <Input id={`rt-code-new-${loc.id}`} name="code" required placeholder="focus" />
                    </Field>
                    <Field label="Precio/hora (MXN)" htmlFor={`rt-bp-new-${loc.id}`}>
                      <Input
                        id={`rt-bp-new-${loc.id}`}
                        name="basePrice"
                        type="number"
                        min={0}
                        required
                      />
                    </Field>
                    <Field label="Con membresía (MXN)" htmlFor={`rt-mp-new-${loc.id}`}>
                      <Input id={`rt-mp-new-${loc.id}`} name="memberPrice" type="number" min={0} />
                    </Field>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Field label="Créditos/hora" htmlFor={`rt-cph-new-${loc.id}`}>
                      <Input
                        id={`rt-cph-new-${loc.id}`}
                        name="creditsPerHour"
                        type="number"
                        min={0.5}
                        step="0.5"
                        defaultValue={1}
                      />
                    </Field>
                  </div>
                  <div className="mt-3">
                    <RoomTypeAttributeFields uid={`new-${loc.id}`} />
                  </div>
                </ActionForm>
              </CardContent>
            </Card>
          </div>
        </section>
  );
}
