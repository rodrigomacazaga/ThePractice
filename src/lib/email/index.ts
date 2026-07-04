import type { EmailProvider } from "./types";
import { MockEmailProvider } from "./mock";
import { ResendEmailProvider } from "./resend";

export * from "./types";
export { emailTemplates } from "./templates";

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;
  switch (process.env.EMAIL_PROVIDER) {
    case "resend":
      provider = new ResendEmailProvider();
      break;
    default:
      provider = new MockEmailProvider();
  }
  return provider;
}

/**
 * Envío fire-and-forget: los emails nunca deben tirar una transacción
 * de negocio. Los fallos se registran y se siguen en observabilidad.
 */
export async function sendEmailSafe(
  message: Parameters<EmailProvider["send"]>[0]
): Promise<void> {
  try {
    await getEmailProvider().send(message);
  } catch (err) {
    console.error("[email] send failed:", err);
  }
}
