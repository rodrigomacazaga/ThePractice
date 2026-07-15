# Deploy en Netlify — The Practice

Guía completa para llevar The Practice a producción en Netlify con
`thepractice.mx`.

---

## 1. Prerrequisitos

- Repositorio en GitHub con este código.
- Cuenta en [Netlify](https://netlify.com).
- Base de datos Postgres en [Neon](https://neon.tech) (recomendado) o Supabase.
- (Opcional producción) Cuentas de Stripe/Mercado Pago, Resend y Cloudinary.

## 2. Base de datos (Neon)

1. Crea un proyecto en Neon → obtén dos connection strings:
   - **Pooled** (con `-pooler` en el host) → `DATABASE_URL`
   - **Direct** → `DIRECT_URL`
2. Aplica el esquema y el seed desde tu máquina:

```bash
DATABASE_URL="<pooled>" DIRECT_URL="<direct>" npm run db:push
DATABASE_URL="<pooled>" DIRECT_URL="<direct>" SEED_PASSWORD="<contraseña-fuerte>" npm run db:seed
```

> Para entornos con migraciones formales: `npx prisma migrate dev` en local
> genera migraciones y `npm run db:migrate` las aplica en producción.

## 3. Conectar GitHub con Netlify

1. Netlify → **Add new site → Import an existing project → GitHub**.
2. Selecciona el repo. Netlify detecta Next.js e instala el runtime oficial
   (`@netlify/plugin-nextjs`) automáticamente — no lo fijes manualmente.
3. Build command: `npm run build` · Publish directory: `.next`
   (ya definidos en `netlify.toml`).
4. Cada push a `main` = Production Deploy; cada PR = Deploy Preview.

## 4. Variables de entorno en Netlify

**Site settings → Environment variables.** Configura por contexto:

### Production

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Pooled connection de Neon |
| `DIRECT_URL` | Direct connection de Neon |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://thepractice.mx` |
| `APP_URL` / `NEXT_PUBLIC_APP_URL` | `https://thepractice.mx` |
| `PAYMENT_PROVIDER` | `stripe` o `mercado_pago` (o `mock` mientras validas) |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | De tu dashboard de Stripe |
| `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_WEBHOOK_SECRET` | De tu cuenta MP |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` / `EMAIL_FROM` | De Resend (dominio verificado) |
| `UPLOAD_PROVIDER` | `cloudinary` (o `mock`) |
| `CLOUDINARY_*` | De tu cuenta Cloudinary |
| `CRON_SECRET` | Secreto largo para `/api/jobs/run` |
| `NETLIFY_NEXT_SKEW_PROTECTION` | `true` |

### Deploy Previews

Igual que producción **pero**: `DATABASE_URL` de una rama/DB de staging,
`PAYMENT_PROVIDER=mock`, `EMAIL_PROVIDER=mock` (no cobrar ni enviar correos
reales desde previews).

## 5. Dominio thepractice.mx

1. Netlify → **Domain management → Add custom domain** → `thepractice.mx`.
2. Opción recomendada: delegar DNS a Netlify (cambia los nameservers en tu
   registrar) — o crea un `A/ALIAS` apuntando al load balancer de Netlify y
   `CNAME www` → tu sitio.
3. Activa HTTPS (Let's Encrypt automático) y "Force HTTPS".
4. Actualiza `NEXTAUTH_URL`, `APP_URL` y `NEXT_PUBLIC_APP_URL` al dominio final
   y redeploy.

## 6. Webhooks de pagos

### Stripe

1. Dashboard → Developers → Webhooks → Add endpoint:
   `https://thepractice.mx/api/webhooks/stripe`
2. Eventos: `checkout.session.completed`, `checkout.session.expired`,
   `payment_intent.payment_failed`.
3. Copia el **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

### Mercado Pago

1. Panel de desarrollador → Webhooks:
   `https://thepractice.mx/api/webhooks/mercado-pago` (tópico `payment`).
2. Configura la clave secreta → `MERCADO_PAGO_WEBHOOK_SECRET`.

Ambos endpoints verifican firma, registran el evento en `WebhookEvent`
(idempotencia por `eventId`) y aplican `fulfillPayment` — que a su vez es
idempotente (`PENDING → PAID` una sola vez).

> **Nota**: el flujo actual usa Checkout de pago único. La **renovación
> automática de membresías** con cobro real requiere Stripe
> Subscriptions/preapproval de MP — está en la lista de siguientes fases; hoy
> el job `renew-memberships` renueva periodos y créditos (útil con mock o
> cobro manual).

## 7. Jobs recurrentes (cron)

No hay servidor persistente. Los jobs son funciones idempotentes expuestas en
`POST /api/jobs/run`, protegidas con `CRON_SECRET`:

```bash
curl -X POST "https://thepractice.mx/api/jobs/run" \
  -H "Authorization: Bearer $CRON_SECRET"
# o un job específico:
curl -X POST "https://thepractice.mx/api/jobs/run?job=mark-no-shows" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Opciones para dispararlo cada 15–30 min:

- **Netlify Scheduled Functions**: crea una función programada que haga fetch
  al endpoint con el header.
- **Cron externo** (cron-job.org, GitHub Actions cron, Upstash QStash).

Jobs incluidos: `release-unpaid-bookings`, `expire-credits`, `mark-no-shows`,
`renew-memberships`. También ejecutables manualmente desde
**/admin/settings**.

## 8. Build local con Netlify CLI (opcional)

```bash
npm i -g netlify-cli
netlify login && netlify link
npm run netlify:build   # simula el build de Netlify
npm run netlify:dev     # dev server con emulación de funciones
```

## 9. Checklist de producción

- [ ] `db:push`/`db:migrate` aplicado en la DB de producción
- [ ] Seed ejecutado (o datos reales cargados) y **contraseñas demo cambiadas /
      usuarios demo eliminados**
- [ ] `NEXTAUTH_SECRET` único y fuerte (no el de desarrollo)
- [ ] `NEXTAUTH_URL` y `NEXT_PUBLIC_APP_URL` = dominio final con https
- [ ] `PAYMENT_PROVIDER` real + webhook configurado y probado (evento de test)
- [ ] `EMAIL_PROVIDER=resend` con dominio verificado (SPF/DKIM)
- [ ] `CRON_SECRET` configurado + cron externo activo
- [ ] Dominio con HTTPS forzado
- [ ] Headers de seguridad activos (vienen en `netlify.toml` + `next.config.ts`)
- [ ] Prueba end-to-end: aplicar como practitioner → aprobar en admin →
      activar membresía → reservar sala → cancelar → verificar créditos
- [ ] Textos legales revisados por asesoría legal (los incluidos son borrador)
- [ ] Analytics instalado (PostHog/Plausible — pendiente de elección)

## 10. Riesgos técnicos conocidos

1. **Renovación de membresías con cobro real**: pendiente de Stripe
   Subscriptions / MP preapproval (hoy: pago único + job de renovación).
2. **Rate limiting**: en memoria por instancia (mitiga spam básico). Para
   límite global: Upstash Redis o WAF.
3. **Uploads**: la abstracción y firma Cloudinary están listas, pero la UI de
   documentos registra URLs (no sube archivos). Conectar el widget de upload
   es un paso corto.
4. **Cambio de rol en caliente**: la sesión JWT refleja cambios de rol hasta el
   siguiente login (mitigado con re-verificación en cada mutación).
5. **Zona horaria**: todo el sistema opera en `America/Mexico_City` por
   ubicación; si abres sede en otra zona, ya está soportado por `Location.timezone`.
6. **Emails**: se envían fire-and-forget; si Resend falla solo se loggea.
   Para garantía de entrega: cola (QStash/Inngest).
