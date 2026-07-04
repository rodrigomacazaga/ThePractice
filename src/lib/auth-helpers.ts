import { redirect } from "next/navigation";
import type { UserRole } from "@prisma/client";
import { auth } from "@/lib/auth";
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
