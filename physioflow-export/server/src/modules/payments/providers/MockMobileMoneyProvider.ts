import { randomUUID } from "node:crypto";
import type { PaymentProvider, PaymentIntent, PaymentResult } from "./PaymentProvider.js";

/**
 * Demo-only stand-in for a real Mobile Money aggregator (e.g. Paystack, Flutterwave, Hubtel).
 * Implements the same PaymentProvider interface, so wiring in a real gateway later means
 * writing one new class here — nothing else in the app changes.
 */
export class MockMobileMoneyProvider implements PaymentProvider {
  private statuses = new Map<string, PaymentResult["status"]>();

  async initiate(intent: PaymentIntent): Promise<PaymentResult> {
    const providerRef = `momo_${randomUUID()}`;
    // Simulate near-instant success for demo purposes.
    this.statuses.set(providerRef, "SUCCEEDED");
    return { providerRef, status: "SUCCEEDED" };
  }

  async verify(providerRef: string): Promise<PaymentResult["status"]> {
    return this.statuses.get(providerRef) ?? "FAILED";
  }
}
