import { randomUUID } from "node:crypto";
import type { PaymentProvider, PaymentIntent, PaymentResult } from "./PaymentProvider.js";

/** Cash payments are recorded as pending until a clinic admin marks them reconciled. */
export class ManualPaymentProvider implements PaymentProvider {
  async initiate(intent: PaymentIntent): Promise<PaymentResult> {
    return { providerRef: `manual_${randomUUID()}`, status: "PENDING" };
  }

  async verify(): Promise<PaymentResult["status"]> {
    // Manual payments are only ever confirmed by explicit staff action, never auto-verified.
    return "PENDING";
  }
}
