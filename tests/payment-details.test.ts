import assert from "node:assert/strict";
import test from "node:test";
import { compactPaymentDetails, paypalPaymentDetails, squarePaymentDetails, stripePaymentDetails } from "@/lib/payments/details";

test( "normalizes Stripe card details from an expanded Checkout Session", () => {
  assert.deepEqual( compactPaymentDetails( stripePaymentDetails( {
    payment_intent: { latest_charge: { receipt_url: "https://receipt.test", payment_method_details: { card: { last4: "4242", brand: "visa", exp_month: 12, exp_year: 2030, wallet: { type: "apple_pay" } } } } },
  } ) ), { cardLast4: "4242", cardBrand: "visa", cardExpiryMonth: 12, cardExpiryYear: 2030, walletType: "apple_pay", receiptUrl: "https://receipt.test" } );
} );

test( "normalizes Square card details", () => {
  assert.deepEqual( compactPaymentDetails( squarePaymentDetails( {
    receipt_url: "https://square.test/receipt",
    card_details: { card: { last_4: "1111", card_brand: "MASTERCARD", exp_month: 8, exp_year: 2029 } },
  } ) ), { cardLast4: "1111", cardBrand: "MASTERCARD", cardExpiryMonth: 8, cardExpiryYear: 2029, receiptUrl: "https://square.test/receipt" } );
} );

test( "records Venmo as a wallet without inventing card data", () => {
  assert.deepEqual( compactPaymentDetails( paypalPaymentDetails( { payment_source: { venmo: { email_address: "customer@example.com" } } } ) ), { walletType: "venmo" } );
} );
