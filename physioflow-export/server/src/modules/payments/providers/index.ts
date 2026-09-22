import type { PaymentProvider } from "./PaymentProvider.js";
import { ManualPaymentProvider } from "./ManualPaymentProvider.js";
import { MockMobileMoneyProvider } from "./MockMobileMoneyProvider.js";

const manual = new ManualPaymentProvider();
const mobileMoney = new MockMobileMoneyProvider();

/** Card is routed to the mobile money mock for now (same "instant success" demo behavior);
 *  a real deployment would add a CardProvider class implementing the same interface. */
export function getProviderForMethod(method: "MOBILE_MONEY" | "CARD" | "CASH"): PaymentProvider {
  switch (method) {
    case "CASH":
      return manual;
    case "MOBILE_MONEY":
    case "CARD":
    default:
      return mobileMoney;
  }
}
