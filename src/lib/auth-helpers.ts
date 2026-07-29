import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { can, type PermissionContext } from "@/lib/permissions";
import { db } from "@/lib/db";

/**
 * Guards server-side. Se usan en layouts de cada panel y se
 * RE-verifican en cada server action / route handler (defensa en
 * profundidad: el JWT podría estar desactualizado tras un cambio de rol).
 */

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireRole(roles: UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.user.role)) redirect(homeFor(session.user.role));
  return session;
}

export async function requirePractitioner() {
  const session = await requireRole(["PRACTITIONER"]);
  const profile = await db.practitionerProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      membership: { include: { plan: true } },
      wallet: true,
      microsite: true,
    },
  });
  if (!profile) redirect("/apply");
  return { session, profile };
}

export async function requireClient() {
  const session = await requireRole(["CLIENT"]);
  let profile = await db.clientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    profile = await db.clientProfile.create({
      data: { userId: session.user.id },
    });
  }
  return { session, profile };
}

export async function requireAdmin() {
  return requireRole(ADMIN_ROLES);
}

export async function requireSuperAdmin() {
  return requireRole(["SUPER_ADMIN"]);
}

/** Home de cada rol después de login. */
export function homeFor(role: UserRole): string {
  switch (role) {
    case "PRACTITIONER":
      return "/practitioner";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin/overview";
    default:
      return "/client";
  }
}

/**
 * Facultades finas. `requireAdmin` sigue siendo la compuerta gruesa (¿entra al
 * panel?); esto responde la pregunta fina (¿puede esta acción concreta?).
 *
 * Se resuelve contra la base y no contra el JWT: un permiso revocado debe
 * surtir efecto de inmediato, sin esperar a que la sesión se renueve.
 */
export async function getPermissionContext(userId: string): Promise<PermissionContext> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      customRole: {
        select: { active: true, permissions: { select: { permission: true } } },
      },
      permissionOverrides: { select: { permission: true, allowed: true } },
    },
  });
  if (!user) redirect("/");

  return {
    role: user.role,
    rolePermissions:
      user.customRole && user.customRole.active
        ? user.customRole.permissions.map((p) => p.permission)
        : null,
    overrides: Object.fromEntries(
      user.permissionOverrides.map((o) => [o.permission, o.allowed])
    ),
  };
}

/** ¿La sesión actual puede hacer esto? Para decidir qué se pinta en la UI. */
export async function currentUserCan(permission: string): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return can(await getPermissionContext(session.user.id), permission);
}

/**
 * Exige una facultad en una server action o página. Si falta, manda al panel
 * del rol en vez de mostrar un error: el usuario no debería ver la puerta de
 * algo que no le toca.
 */
export async function requirePermission(permission: string) {
  const session = await requireSession();
  const ctx = await getPermissionContext(session.user.id);
  if (!can(ctx, permission)) redirect(homeFor(session.user.role));
  return session;
}
