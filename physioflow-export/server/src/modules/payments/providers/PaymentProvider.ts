export interface PaymentIntent {
  amount: number;
  currency: string;
  method: "MOBILE_MONEY" | "CARD" | "CASH";
  reference: string; // our internal payment id, used to correlate provider callbacks
}

export interface PaymentResult {
  providerRef: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
}

export interface PaymentProvider {
  /** Kick off a payment. For cash, this just records intent to pay in person. */
  initiate(intent: PaymentIntent): Promise<PaymentResult>;
  /** Check on a previously-initiated payment (e.g. polling a MoMo provider for confirmation). */
  verify(providerRef: string): Promise<PaymentResult["status"]>;
}
