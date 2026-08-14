import type { Metadata } from "next";
import { PaymentConfirmationClient } from "./payment-confirmation-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Payment confirmation | Goldridr",
  description: "Confirmation of your Goldridr booking payment.",
  robots: { index: false, follow: false },
};

export default async function PaymentConfirmationPage( { params }: { params: Promise<{ token: string }> } ) {
  const { token } = await params;
  return <PaymentConfirmationClient token={ token } />;
}
