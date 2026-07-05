/**
 * Netlify Scheduled Function: dispara los jobs recurrentes cada 30 minutos.
 *  - release-unpaid-bookings: libera reservas sin pago (>30 min)
 *  - expire-credits: expira lotes de créditos vencidos
 *  - mark-no-shows: marca no-shows tras el horario sin check-in
 *  - renew-memberships: renueva periodos y otorga créditos
 *
 * La lógica vive en /api/jobs/run (idempotente, protegida con CRON_SECRET);
 * esta función solo la invoca. process.env.URL la inyecta Netlify con la
 * URL principal del sitio.
 */
export default async () => {
  const base = process.env.URL ?? "https://thepractice-mx.netlify.app";
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[scheduled-jobs] CRON_SECRET no configurado");
    return;
  }

  try {
    const res = await fetch(`${base}/api/jobs/run`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    console.log(`[scheduled-jobs] ${res.status}: ${body}`);
  } catch (err) {
    console.error("[scheduled-jobs] error:", err);
  }
};

export const config = {
  schedule: "*/30 * * * *",
};
