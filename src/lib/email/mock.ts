import type { EmailMessage, EmailProvider } from "./types";

/** Log-only. Para desarrollo y deploy previews. */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async send(message: EmailMessage): Promise<{ id: string }> {
    console.log(
      `[email:mock] to=${message.to} subject="${message.subject}"`
    );
    return { id: `mock_${Date.now()}` };
  }
}
