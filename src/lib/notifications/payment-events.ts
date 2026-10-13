import type { PaymentAttempt } from "@/lib/payments/types";

export type PaymentNotificationInput = Pick<PaymentAttempt, "id" | "bookingReference" | "status"> & Partial<PaymentAttempt>;

export function paymentNotificationFor( payment: PaymentNotificationInput ) {
  const descriptions: Record<PaymentAttempt[ "status" ], { title: string; body: string }> = {
    pending: { title: `Payment started for ${ payment.bookingReference }`, body: "A customer opened the payment checkout." },
    awaiting_verification: { title: `Payment review needed for ${ payment.bookingReference }`, body: "A Zelle payment claim is waiting for admin verification." },
    paid: { title: `Payment received for ${ payment.bookingReference }`, body: "The payment completed successfully and the booking is confirmed." },
    failed: { title: `Payment failed for ${ payment.bookingReference }`, body: payment.failureMessage || "The payment provider reported a failed payment." },
    partially_refunded: { title: `Partial refund for ${ payment.bookingReference }`, body: "Part of the payment was refunded. Any legs covered by the refund were cancelled; the rest of the booking stands." },
    refunded: { title: `Payment refunded for ${ payment.bookingReference }`, body: "The payment was refunded and the booking was cancelled." },
    expired: { title: `Payment expired for ${ payment.bookingReference }`, body: "The payment window expired before payment was confirmed." },
  };
  return {
    type: `payment.${ payment.status }`,
    // A payment can be partially refunded more than once, so each refund gets its own event.
    eventKey: `payment:${ payment.id }:${ payment.status }${ payment.status === "partially_refunded" ? `:${ payment.refunds?.length ?? 0 }` : "" }`,
    ...descriptions[ payment.status ],
  };
}
