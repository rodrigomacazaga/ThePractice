import type { EmailMessage, EmailProvider } from "./types";

/** Resend vía REST API directa (sin SDK). */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  async send(message: EmailMessage): Promise<{ id: string }> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "The Practice <hola@thepractice.mx>",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        reply_to: message.replyTo,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend failed (${res.status}): ${await res.text()}`);
    }
    const data = await res.json();
    return { id: data.id };
  }
}
