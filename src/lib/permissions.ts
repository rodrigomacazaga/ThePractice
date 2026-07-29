import type { UserRole } from "@prisma/client";

/**
 * Catálogo de facultades del sistema — la matriz que ve el super admin.
 *
 * Vive en código a propósito: una facultad existe porque hay una función que
 * la respeta. Si viviera en base de datos podrían quedar permisos huérfanos
 * apuntando a funciones que ya no existen, y nadie sabría qué hace cada uno.
 *
 * El default es NEGAR: solo lo concedido explícitamente al rol (o a la persona)
 * se permite. La única excepción es SUPER_ADMIN, que siempre puede todo — de lo
 * contrario sería posible quedarse sin acceso a la administración.
 */

export const PERMISSION_GROUPS = [
  {
    key: "negocio",
    label: "Negocio y finanzas",
    permissions: [
      ["business.dashboard.view", "Ver el dashboard del negocio"],
      ["business.revenue.view", "Ver ingresos y MRR"],
      ["business.margin.view", "Ver costos, margen y utilidad"],
      ["expenses.view", "Consultar gastos"],
      ["expenses.manage", "Registrar y editar gastos"],
      ["expenses.delete", "Eliminar gastos"],
      ["payments.view", "Consultar pagos"],
      ["payments.refund", "Reembolsar pagos"],
    ],
  },
  {
    key: "ubicaciones",
    label: "Ubicaciones y salas",
    permissions: [
      ["locations.view", "Ver ubicaciones y su rendimiento"],
      ["locations.manage", "Crear y editar ubicaciones"],
      ["rooms.manage", "Administrar salas y tipos de sala"],
      ["bookings.view", "Consultar reservas"],
      ["bookings.manage", "Crear, mover y cancelar reservas"],
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    permissions: [
      ["pricing.view", "Ver planes y precios"],
      ["pricing.manage", "Editar planes, paquetes y tarifas"],
      ["leads.view", "Consultar leads"],
      ["leads.manage", "Mover leads en el pipeline"],
      ["landing.manage", "Editar el contenido de las landings"],
    ],
  },
  {
    key: "personas",
    label: "Personas",
    permissions: [
      ["practitioners.view", "Consultar practitioners"],
      ["practitioners.verify", "Verificar y aprobar practitioners"],
      ["clients.view", "Consultar clientes"],
      ["employees.view", "Consultar el equipo de nómina"],
      ["employees.manage", "Administrar equipo y su documentación"],
    ],
  },
  {
    key: "sistema",
    label: "Sistema",
    permissions: [
      ["settings.manage", "Cambiar la configuración operativa"],
      ["roles.manage", "Crear roles y asignar facultades"],
      ["audit.view", "Ver la bitácora de auditoría"],
      ["jobs.run", "Ejecutar procesos programados"],
    ],
  },
] as const;

export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number][0];

/** Todas las claves del catálogo, para validar lo que llega de un formulario. */
export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map(([key]) => key)
);

export const PERMISSION_LABEL: Record<string, string> = Object.fromEntries(
  PERMISSION_GROUPS.flatMap((g) => g.permissions.map(([key, label]) => [key, label]))
);

export function isValidPermission(value: string): boolean {
  return ALL_PERMISSIONS.includes(value);
}

/**
 * Facultades que trae el enum por sí solo, sin rol asignado. Mantiene el
 * comportamiento actual: un ADMIN sigue pudiendo operar aunque nadie le haya
 * creado un rol todavía. Al asignarle un rol, este acota lo que puede hacer.
 */
const ENUM_BASELINE: Record<UserRole, string[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS.filter((p) => p !== "roles.manage"),
  PRACTITIONER: [],
  CLIENT: [],
};

export interface PermissionContext {
  role: UserRole;
  /** Facultades concedidas por el rol asignado (null = sin rol). */
  rolePermissions: string[] | null;
  /** Excepciones por persona: permiso → permitido. */
  overrides: Record<string, boolean>;
}

/**
 * Resuelve una facultad. Orden de precedencia:
 *   1. SUPER_ADMIN siempre puede (no se puede quedar sin acceso).
 *   2. Una excepción por persona gana sobre el rol, en ambos sentidos.
 *   3. El rol asignado, si existe.
 *   4. La línea base del enum, si no hay rol asignado.
 */
export function can(ctx: PermissionContext, permission: string): boolean {
  if (ctx.role === "SUPER_ADMIN") return true;

  const override = ctx.overrides[permission];
  if (override !== undefined) return override;

  if (ctx.rolePermissions) return ctx.rolePermissions.includes(permission);

  return ENUM_BASELINE[ctx.role].includes(permission);
}

/** Facultades efectivas, para pintar la UI sin repetir la lógica. */
export function effectivePermissions(ctx: PermissionContext): string[] {
  return ALL_PERMISSIONS.filter((p) => can(ctx, p));
}
