# The Practice — Private Practice Spaces

Plataforma física + digital para profesionales independientes de terapia,
wellness, coaching y nutrición. Espacios privados premium + micrositio +
directorio + reservas + pagos, sin renta fija.

**Dominio:** thepractice.mx · **Primera ubicación:** The Practice La Ceiba (Querétaro) ·
**Arquitectura:** multi-ubicación desde el día uno.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15 (App Router) + TypeScript |
| Estilos | Tailwind CSS v4 (tokens propios, sin plantillas) |
| Base de datos | PostgreSQL (Neon recomendado) + Prisma |
| Auth | Auth.js (NextAuth v5) — credenciales + JWT con roles |
| Validación | Zod + React Hook Form |
| Pagos | Abstracción `PaymentProvider` → Mock / Stripe / Mercado Pago |
| Email | Abstracción `EmailProvider` → Mock / Resend (via REST) |
| Storage | Abstracción `StorageProvider` → Mock / Cloudinary (upload firmado) |
| Jobs | Funciones idempotentes vía `/api/jobs/run` + cron externo |
| Hosting | Netlify (ver `README_DEPLOY_NETLIFY.md`) |

## Correr localmente

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env
# Edita .env: DATABASE_URL/DIRECT_URL (Neon o Postgres local) y NEXTAUTH_SECRET
# openssl rand -base64 32  → para NEXTAUTH_SECRET

# 3. Base de datos
npm run db:push        # crea el esquema
npm run db:seed        # datos demo (ubicaciones, planes, practitioners, leads)

# 4. Desarrollo
npm run dev            # http://localhost:3000
```

### Usuarios demo (contraseña: `ThePractice2026!`)

| Email | Rol | Estado |
| --- | --- | --- |
| `superadmin@thepractice.mx` | Super Admin | — |
| `admin@thepractice.mx` | Admin | — |
| `ana@thepractice.mx` | Practitioner | Aprobada · plan Pro · micrositio publicado |
| `roberto@thepractice.mx` | Practitioner | Aprobado · plan Premium · destacado |
| `sofia@thepractice.mx` | Practitioner | Aprobada · plan Flex |
| `diego@thepractice.mx` | Practitioner | **Pendiente de verificación** (prueba el flujo admin) |
| `cliente@ejemplo.mx` | Cliente | — |

### Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Desarrollo |
| `npm run build` | `prisma generate` + build de producción |
| `npm run typecheck` | TypeScript estricto |
| `npm run db:push` | Sincroniza esquema (desarrollo) |
| `npm run db:migrate` | `prisma migrate deploy` (producción) |
| `npm run db:seed` | Seed idempotente |
| `npm run db:studio` | Prisma Studio |

## Estructura

```
src/
  app/
    (marketing)/        Sitio público: home, for-practitioners, for-clients,
                        memberships, rooms, locations/[slug], directory,
                        p/[slug] (micrositios), apply, la-ceiba (preventa),
                        about, faq, contact, legal/*
    (auth)/             login, signup
    practitioner/       Panel practitioner (13 secciones)
    client/             Panel cliente
    admin/              Panel admin (overview, leads, practitioners, bookings,
                        locations, rooms, catálogo de precios, pagos, settings)
    api/                Route handlers: auth, register, leads, bookings,
                        availability, payments, webhooks, jobs
  components/
    ui/                 Design system propio (button, card, badge, form, table…)
    brand/              Logo (wordmark + glyph "room within a space")
    marketing/          Navbar, footer, cards, formularios públicos
    dashboard/          Shell de paneles, nav, action forms
  lib/
    auth.ts             NextAuth v5 (JWT + roles)
    auth-helpers.ts     Guards server-side por rol
    bookings/engine.ts  Motor de reservas (advisory locks anti doble-reserva)
    payments/           PaymentProvider: mock, stripe, mercado-pago + fulfillment
    email/              EmailProvider: mock, resend + templates transaccionales
    storage/            StorageProvider: mock, cloudinary (upload firmado)
    jobs/               Jobs idempotentes (expirar créditos, no-shows, renovaciones)
    settings.ts         Reglas operativas configurables desde admin
prisma/
  schema.prisma         ~30 modelos, multi-location y multi-role
  seed.ts               Datos demo completos
```

## Decisiones de arquitectura clave

1. **Multi-ubicación real**: `Location` es una entidad de primera clase; salas,
   reservas, lockers, leads y settings cuelgan de ella. Agregar "The Practice
   Juriquilla" es una fila, no un refactor.
2. **Anti doble-reserva serverless**: `pg_advisory_xact_lock(hashtext(roomId))`
   dentro de la transacción serializa reservas concurrentes por sala. Funciona
   con N funciones Netlify simultáneas.
3. **Créditos como ledger**: `CreditWallet.balance` es un acumulador, pero cada
   movimiento queda en `CreditTransaction` (compra, consumo, reembolso,
   expiración, ajuste) con `balanceAfter` — auditable y debuggeable.
4. **Precios 100% en base de datos**: planes, paquetes, tipos de sala, tasas de
   créditos y reglas de cancelación se editan en `/admin/catalog` y
   `/admin/settings`. Cero precios hardcodeados.
5. **Pagos idempotentes**: `fulfillPayment()` solo actúa en la transición
   `PENDING → PAID` (updateMany atómico); webhooks registran eventos únicos en
   `WebhookEvent`. Reintentos no duplican membresías ni créditos.
6. **Dinero en centavos (Int), créditos en Float**: dinero nunca en punto
   flotante; créditos (1.5, 2.0) sí, porque son unidades de negocio con
   precisión de medias horas.
7. **Sin SDKs de pagos/email**: Stripe, Mercado Pago y Resend via REST + fetch.
   Menos cold-start en serverless y la abstracción es la interfaz estable.
8. **Marketing estático, operación dinámica**: las páginas sin datos operativos
   se prerenderizan (CDN); las que leen DB son `force-dynamic` con `safeQuery`
   (una caída de DB degrada a contenido vacío, nunca a un 500 en el home).
9. **Sin notas clínicas**: la plataforma gestiona reservas, pagos y perfiles
   públicos. Los expedientes clínicos quedan explícitamente fuera (ver
   `/legal/privacy`).

## Deploy

Ver **[README_DEPLOY_NETLIFY.md](./README_DEPLOY_NETLIFY.md)** — incluye
checklist de producción, configuración de webhooks, cron jobs y dominio.
