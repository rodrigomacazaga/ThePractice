import { PrismaClient } from "@prisma/client";

/**
 * Singleton de Prisma seguro para serverless + hot-reload local.
 * En Netlify Functions cada instancia fría crea un cliente; usamos
 * la conexión pooled (pgbouncer) de Neon vía DATABASE_URL para no
 * agotar conexiones. Las migraciones usan DIRECT_URL.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
