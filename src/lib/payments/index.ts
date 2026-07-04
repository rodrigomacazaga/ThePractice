import type { PaymentProvider } from "./types";
import { MockPaymentProvider } from "./mock";
import { StripeProvider } from "./stripe";
import { MercadoPagoProvider } from "./mercado-pago";

export * from "./types";

let provider: PaymentProvider | null = null;

/** Resuelve el proveedor activo según PAYMENT_PROVIDER. */
export function getPaymentProvider(): PaymentProvider {
  if (provider) return provider;
  switch (process.env.PAYMENT_PROVIDER) {
    case "stripe":
      provider = new StripeProvider();
      break;
    case "mercado_pago":
      provider = new MercadoPagoProvider();
      break;
    default:
      provider = new MockPaymentProvider();
  }
  return provider;
}
