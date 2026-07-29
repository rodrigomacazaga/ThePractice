import { ShieldCheck, UserCog } from "lucide-react";
import { requirePermission } from "@/lib/auth-helpers";
import { db } from "@/lib/db";
import { PERMISSION_GROUPS, ALL_PERMISSIONS } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { ActionForm, ActionButton } from "@/components/dashboard/action-form";
import { upsertRole, deleteRole, assignRole } from "../actions";

export const dynamic = "force-dynamic";

/** Matriz de facultades: un checkbox por función del sistema. */
function PermissionMatrix({ granted }: { granted: Set<string> }) {
  return (
    <div className="space-y-5">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.key}>
          <p className="font-display text-[11px] font-semibold tracking-wider text-stone-deep uppercase">
            {group.label}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {group.permissions.map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line bg-paper p-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="permissions"
                  value={key}
                  defaultChecked={granted.has(key)}
                  className="mt-0.5 h-4 w-4 accent-ink"
                />
                <span>
                  {label}
                  <span className="mt-0.5 block font-mono text-[10px] text-stone">{key}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RoleFields({
  role,
}: {
  role?: { id: string; name: string; description: string | null; active: boolean; permissions: { permission: string }[] };
}) {
  const uid = role?.id ?? "new";
  const granted = new Set(role?.permissions.map((p) => p.permission) ?? []);
  return (
    <>
      {role && <input type="hidden" name="roleId" value={role.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del rol" htmlFor={`role-name-${uid}`}>
          <Input
            id={`role-name-${uid}`}
            name="name"
            defaultValue={role?.name}
            placeholder="Operaciones"
            required
          />
        </Field>
        <Field label="Activo" htmlFor={`role-active-${uid}`}>
          <label className="flex h-11 items-center gap-2 text-sm">
            <input
              id={`role-active-${uid}`}
              type="checkbox"
              name="active"
              defaultChecked={role?.active ?? true}
              className="h-4 w-4 accent-ink"
            />
            El rol puede usarse
          </label>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Descripción" htmlFor={`role-desc-${uid}`}>
          <Textarea
            id={`role-desc-${uid}`}
            name="description"
            rows={2}
            defaultValue={role?.description ?? ""}
            placeholder="Qué hace esta persona en el día a día"
          />
        </Field>
      </div>
      <div className="mt-5 border-t border-line pt-5">
        <p className="mb-3 font-display text-sm font-bold">Facultades</p>
        <PermissionMatrix granted={granted} />
      </div>
    </>
  );
}

/**
 * Roles y facultades. El enum de usuario decide a qué panel entra cada quien;
 * el rol decide qué puede hacer dentro. Sin rol asignado, un admin conserva sus
 * facultades actuales: asignarle uno lo acota, no lo amplía.
 */
export default async function AdminRolesPage() {
  await requirePermission("roles.manage");

  const [roles, staff] = await Promise.all([
    db.role.findMany({
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customRole: { select: { id: true, name: true } },
        _count: { select: { permissionOverrides: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Roles y facultades"
        description="Crea roles y elige de la matriz qué puede hacer cada uno. Se puede activar o desactivar cualquier facultad en cualquier momento."
      />

      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-deep">
          {roles.length} rol{roles.length === 1 ? "" : "es"} · {ALL_PERMISSIONS.length} facultades
          disponibles
        </p>
        <Modal trigger="Nuevo rol" title="Nuevo rol">
          <ActionForm action={upsertRole} submitLabel="Crear rol">
            <RoleFields />
          </ActionForm>
        </Modal>
      </div>

      {roles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay roles definidos</CardTitle>
            <CardDescription>
              Mientras no existan roles, los administradores conservan las facultades que ya tienen.
              Al crear un rol y asignarlo, esa persona queda limitada exactamente a lo que marques.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {roles.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-clay" />
                      <p className="font-display text-base font-bold">{role.name}</p>
                    </div>
                    {role.description && (
                      <p className="mt-1 text-xs text-stone-deep">{role.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant={role.active ? "sage" : "default"}>
                      {role.active ? "Activo" : "Inactivo"}
                    </Badge>
                    {role.isSystem && <Badge variant="outline">Sistema</Badge>}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Badge variant="default">
                    {role.permissions.length} de {ALL_PERMISSIONS.length} facultades
                  </Badge>
                  <Badge variant="outline">
                    {role._count.users} persona{role._count.users === 1 ? "" : "s"}
                  </Badge>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                  <Modal trigger="Editar facultades" title={`Facultades de ${role.name}`}>
                    <ActionForm action={upsertRole} submitLabel="Guardar facultades">
                      <RoleFields role={role} />
                    </ActionForm>
                  </Modal>
                  {!role.isSystem && (
                    <ActionButton
                      action={deleteRole.bind(null, role.id)}
                      label="Eliminar"
                      variant="danger"
                      confirmText={`¿Eliminar el rol ${role.name}? Las ${role._count.users} personas que lo tenían volverán a sus facultades por defecto.`}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ASIGNACIÓN */}
      <section className="mt-10">
        <h2 className="eyebrow">Quién tiene qué rol</h2>
        <Card className="mt-4 overflow-x-auto">
          <Table>
            <THead>
              <TR>
                <TH>Persona</TH>
                <TH>Acceso base</TH>
                <TH>Rol asignado</TH>
                <TH>Excepciones</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {staff.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <p className="font-display font-semibold">{u.name}</p>
                    <p className="text-xs text-stone-deep">{u.email}</p>
                  </TD>
                  <TD>
                    <Badge variant={u.role === "SUPER_ADMIN" ? "clay" : "outline"}>
                      {u.role === "SUPER_ADMIN" ? "Super admin" : "Admin"}
                    </Badge>
                  </TD>
                  <TD>
                    {u.customRole ? (
                      <Badge variant="default">{u.customRole.name}</Badge>
                    ) : (
                      <span className="text-xs text-stone">Sin rol (facultades por defecto)</span>
                    )}
                  </TD>
                  <TD>
                    {u._count.permissionOverrides > 0 ? (
                      <Badge variant="amber">{u._count.permissionOverrides}</Badge>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD>
                    {u.role === "SUPER_ADMIN" ? (
                      <span className="text-xs text-stone">Siempre tiene todo</span>
                    ) : (
                      <Modal trigger="Cambiar rol" title={`Rol de ${u.name}`}>
                        <ActionForm action={assignRole} submitLabel="Asignar">
                          <input type="hidden" name="userId" value={u.id} />
                          <Field label="Rol" htmlFor={`assign-${u.id}`}>
                            <Select
                              id={`assign-${u.id}`}
                              name="roleId"
                              defaultValue={u.customRole?.id ?? ""}
                            >
                              <option value="">Sin rol (facultades por defecto)</option>
                              {roles
                                .filter((r) => r.active)
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    {r.name}
                                  </option>
                                ))}
                            </Select>
                          </Field>
                          <p className="mt-3 text-xs text-stone-deep">
                            Al asignar un rol, esta persona queda limitada a las facultades marcadas
                            en él. Sin rol, conserva las facultades por defecto de un administrador.
                          </p>
                        </ActionForm>
                      </Modal>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>
        <p className="mt-3 flex items-start gap-1.5 text-xs text-stone">
          <UserCog className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          El super admin siempre conserva todas las facultades: es la salvaguarda para no quedarse
          sin acceso a la administración.
        </p>
      </section>
    </>
  );
}
