# The Practice — notas para Claude

## Flujo de trabajo

**Cada cambio se commitea y se empuja a `main`.** No dejar trabajo sin
commitear ni acumular cambios en ramas: al terminar una modificación, commit
descriptivo y `git push origin main`.

## Contexto del proyecto

- Next.js 15 (App Router), TypeScript, Tailwind CSS v4, Prisma + Postgres
  (Neon), NextAuth v5, desplegado en Netlify.
- **Todo el sitio está detrás de login**: el middleware exige sesión en cada
  ruta. Solo son públicos `/` (la puerta de entrada con logo + usuario y
  contraseña), `/api/auth/*`, `/api/webhooks/*` y `/api/jobs/*`.
- Precios, planes, salas y ubicaciones viven en la base de datos, no en el
  código. No hardcodear importes ni catálogo.
- La sede es **The Practice La Ceiba**, en la zona de **Lomas de Campanario
  Norte, Querétaro** (el nombre y la ruta `/la-ceiba` son heredados de una
  ubicación anterior en Plaza La Ceiba).

## Cuentas y seed

- `npm run db:seed` crea/actualiza las cuentas demo y **re-sincroniza sus
  contraseñas** con `SEED_PASSWORD`.
- `SEED_PASSWORD` es obligatoria en entornos desplegados (el seed aborta sin
  ella). En Netlify debe ser variable **no secreta con scope de builds**: como
  variable secreta no llega al comando de build.
- `node scripts/verify-login.mjs <email>` comprueba contra la base que una
  cuenta autentica con `SEED_PASSWORD`.
- `node scripts/reset-password.mjs <email> "<contraseña>"` cambia una
  contraseña directamente en la base.

## Verificación

Antes de dar por terminado un cambio: `npm run typecheck` y `npm run build`.
Para cambios de UI, comprobarlos en el navegador — no basta con que compile.

## Restricciones

- El repositorio es **público**: nunca commitear contraseñas, llaves ni
  credenciales. Van en variables de entorno.
- No inventar fechas de apertura, precios, testimonios ni políticas legales.
