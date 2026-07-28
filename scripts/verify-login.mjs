/**
 * Verificación temporal de credenciales, pensada para correr en el build.
 *
 * Comprueba que una cuenta puede autenticar con SEED_PASSWORD replicando lo
 * que hace el provider de credenciales (buscar por email + bcrypt.compare).
 * Sale con código 1 si no coincide, de modo que un deploy en rojo signifique
 * "las contraseñas de la base NO son las esperadas" y uno en verde lo
 * contrario. No imprime hashes ni contraseñas.
 *
 * Uso: node scripts/verify-login.mjs [email]
 */
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

const email = (process.argv[2] ?? "admin@thepractice.mx").toLowerCase();
const password = process.env.SEED_PASSWORD;

if (!password) {
  console.error("✖ SEED_PASSWORD no está definida: no hay nada que verificar.");
  process.exit(1);
}

const db = new PrismaClient();
try {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✖ No existe el usuario ${email} en la base de datos.`);
    process.exit(1);
  }
  if (!user.passwordHash) {
    console.error(`✖ ${email} no tiene contraseña definida.`);
    process.exit(1);
  }
  if (!user.active) {
    console.error(`✖ ${email} está inactivo: el login lo rechazaría.`);
    process.exit(1);
  }
  if (!(await compare(password, user.passwordHash))) {
    console.error(`✖ La contraseña de ${email} NO coincide con SEED_PASSWORD.`);
    process.exit(1);
  }
  console.log(`✔ ${email} (${user.role}) autentica correctamente con SEED_PASSWORD.`);
} finally {
  await db.$disconnect();
}
