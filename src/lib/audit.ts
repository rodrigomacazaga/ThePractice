import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

/** Auditoría de acciones sensibles (admin y sistema). Nunca debe tirar el flujo. */
export async function audit(params: {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  data?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        data: params.data,
      },
    });
  } catch (err) {
    console.error("[audit] failed:", err);
  }
}
