import type { Metadata } from "next";
import { CheckoutClient } from "./checkout-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Pay to confirm | Goldridr",
  description: "Securely confirm your Goldridr chauffeur booking.",
  robots: { index: false, follow: false },
};

export default async function PaymentPage( { params }: { params: Promise<{ token: string }> } ) {
  const { token } = await params;
  return <CheckoutClient token={ token } />;
}
