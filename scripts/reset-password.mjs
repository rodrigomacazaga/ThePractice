/**
 * Resetea la contraseña de un usuario directamente en la base de datos.
 * Útil cuando se olvidó el SEED_PASSWORD de un ambiente.
 *
 * Uso (requiere DATABASE_URL en el entorno o en .env):
 *   npx prisma generate            # si aún no está generado el cliente
 *   node scripts/reset-password.mjs admin@thepractice.mx "NuevaContraseña123"
 */
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: node scripts/reset-password.mjs <email> "<nueva contraseña>"');
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres (mínimo del login).");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.update({
    where: { email: email.toLowerCase() },
    data: { passwordHash: await hash(password, 12) },
    select: { email: true, role: true },
  });
  console.log(`✔ Contraseña actualizada para ${user.email} (${user.role})`);
} catch (err) {
  console.error(
    err?.code === "P2025" ? `No existe un usuario con email ${email}` : err
  );
  process.exit(1);
} finally {
  await db.$disconnect();
}
