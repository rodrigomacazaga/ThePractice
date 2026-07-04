/**
 * Templates de email transaccional. HTML simple y sobrio, consistente
 * con la marca: fondo paper, tipografía system, wordmark en texto.
 * (Los clientes de correo no cargan webfonts de forma confiable.)
 */

const baseUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://thepractice.mx";

function layout(title: string, bodyHtml: string, ctaLabel?: string, ctaUrl?: string) {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#f6f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1b1916;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f3ee;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="padding:0 8px 24px;">
          <span style="font-size:15px;font-weight:700;letter-spacing:-0.02em;">The Practice</span>
          <span style="font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#8a8378;margin-left:10px;">Private Practice Spaces</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e6e0d5;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#4a463f;">${bodyHtml}</div>
          ${
            ctaLabel && ctaUrl
              ? `<div style="margin-top:24px;"><a href="${ctaUrl}" style="display:inline-block;background:#1b1916;color:#f6f3ee;text-decoration:none;font-size:13px;font-weight:600;padding:12px 24px;border-radius:10px;">${ctaLabel}</a></div>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:20px 8px;font-size:11px;color:#8a8378;line-height:1.5;">
          The Practice provee espacios e infraestructura. Cada practitioner es responsable de sus servicios profesionales.<br/>
          © The Practice · thepractice.mx
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const emailTemplates = {
  practitionerApplicationReceived(name: string) {
    return {
      subject: "Recibimos tu aplicación — The Practice",
      html: layout(
        "Recibimos tu aplicación",
        `<p>Hola ${name},</p>
         <p>Gracias por tu interés en The Practice. Nuestro equipo revisará tu perfil y te contactará en las próximas 48 horas para agendar una llamada.</p>
         <p>Mientras tanto, puedes conocer las membresías y tipos de sala en nuestro sitio.</p>`,
        "Ver membresías",
        `${baseUrl()}/memberships`
      ),
    };
  },

  practitionerApproved(name: string) {
    return {
      subject: "Tu perfil fue aprobado — The Practice",
      html: layout(
        "Bienvenido a The Practice",
        `<p>Hola ${name},</p>
         <p>Tu perfil fue verificado y aprobado. Ya puedes reservar salas, activar tu micrositio y aparecer en el directorio.</p>`,
        "Ir a mi panel",
        `${baseUrl()}/practitioner`
      ),
    };
  },

  bookingConfirmed(name: string, roomName: string, when: string, accessCode: string) {
    return {
      subject: `Reserva confirmada · ${roomName} · ${when}`,
      html: layout(
        "Reserva confirmada",
        `<p>Hola ${name},</p>
         <p>Tu reserva está confirmada:</p>
         <p style="background:#f6f3ee;border-radius:10px;padding:16px;margin:16px 0;">
           <strong>${roomName}</strong><br/>${when}<br/>
           Código de acceso: <strong style="font-size:16px;letter-spacing:0.1em;">${accessCode}</strong>
         </p>
         <p>El código estará activo 10 minutos antes de tu horario. Recuerda dejar la sala lista para el siguiente practitioner.</p>`,
        "Ver mis reservas",
        `${baseUrl()}/practitioner/calendar`
      ),
    };
  },

  bookingCancelled(name: string, roomName: string, when: string, penalty?: string) {
    return {
      subject: `Reserva cancelada · ${roomName} · ${when}`,
      html: layout(
        "Reserva cancelada",
        `<p>Hola ${name},</p>
         <p>Tu reserva de <strong>${roomName}</strong> (${when}) fue cancelada.</p>
         ${penalty ? `<p>${penalty}</p>` : ""}`,
        "Reservar otra sala",
        `${baseUrl()}/practitioner/book`
      ),
    };
  },

  bookingReminder(name: string, roomName: string, when: string, accessCode: string) {
    return {
      subject: `Recordatorio · ${roomName} · ${when}`,
      html: layout(
        "Tu sesión es pronto",
        `<p>Hola ${name},</p>
         <p><strong>${roomName}</strong> · ${when}</p>
         <p>Código de acceso: <strong style="font-size:16px;letter-spacing:0.1em;">${accessCode}</strong></p>`
      ),
    };
  },

  paymentSucceeded(name: string, description: string, amount: string) {
    return {
      subject: `Pago recibido · ${amount}`,
      html: layout(
        "Pago recibido",
        `<p>Hola ${name},</p>
         <p>Recibimos tu pago de <strong>${amount}</strong> por: ${description}.</p>
         <p>Tu recibo está disponible en tu panel.</p>`,
        "Ver pagos",
        `${baseUrl()}/practitioner/payments`
      ),
    };
  },

  paymentFailed(name: string, description: string) {
    return {
      subject: "No pudimos procesar tu pago — The Practice",
      html: layout(
        "Pago no procesado",
        `<p>Hola ${name},</p>
         <p>El pago por <em>${description}</em> no pudo procesarse. Intenta de nuevo o usa otro método de pago.</p>`
      ),
    };
  },

  membershipActivated(name: string, planName: string, credits: string) {
    return {
      subject: `Membresía ${planName} activada — The Practice`,
      html: layout(
        `Membresía ${planName} activa`,
        `<p>Hola ${name},</p>
         <p>Tu membresía <strong>${planName}</strong> está activa. Se cargaron <strong>${credits} créditos</strong> a tu cuenta.</p>`,
        "Reservar sala",
        `${baseUrl()}/practitioner/book`
      ),
    };
  },

  creditsLoaded(name: string, credits: string, balance: string) {
    return {
      subject: "Créditos cargados — The Practice",
      html: layout(
        "Créditos cargados",
        `<p>Hola ${name},</p>
         <p>Se cargaron <strong>${credits} créditos</strong>. Tu balance actual: <strong>${balance}</strong>.</p>`
      ),
    };
  },

  leadReceivedAdmin(leadName: string, specialty: string, source: string) {
    return {
      subject: `Nuevo lead: ${leadName} (${specialty})`,
      html: layout(
        "Nuevo lead recibido",
        `<p><strong>${leadName}</strong> · ${specialty}</p><p>Fuente: ${source}</p>`,
        "Ver leads",
        `${baseUrl()}/admin/leads`
      ),
    };
  },

  clientBookingNotice(practitionerName: string, clientName: string, when: string) {
    return {
      subject: `Nueva reserva de cliente · ${when}`,
      html: layout(
        "Un cliente reservó contigo",
        `<p>Hola ${practitionerName},</p>
         <p><strong>${clientName}</strong> reservó una sesión: ${when}.</p>`,
        "Ver agenda",
        `${baseUrl()}/practitioner/calendar`
      ),
    };
  },
};
