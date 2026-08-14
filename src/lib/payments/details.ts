export interface StoredPaymentDetails {
  cardLast4?: string;
  cardBrand?: string;
  cardExpiryMonth?: number;
  cardExpiryYear?: number;
  walletType?: string;
  receiptUrl?: string;
}

type UnknownRecord = Record<string, unknown>;

function record( value: unknown ): UnknownRecord {
  return value && typeof value === "object" ? value as UnknownRecord : {};
}

function text( value: unknown ): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function number( value: unknown ): number | undefined {
  const parsed = Number( value );
  return Number.isInteger( parsed ) && parsed > 0 ? parsed : undefined;
}

export function stripePaymentDetails( session: unknown ): StoredPaymentDetails {
  const paymentIntent = record( record( session ).payment_intent );
  const charge = record( paymentIntent.latest_charge );
  const methodDetails = record( charge.payment_method_details );
  const card = record( methodDetails.card );
  const wallet = record( card.wallet );
  const cashApp = record( methodDetails.cashapp );
  return {
    cardLast4: text( card.last4 ),
    cardBrand: text( card.brand ),
    cardExpiryMonth: number( card.exp_month ),
    cardExpiryYear: number( card.exp_year ),
    walletType: text( wallet.type ) || ( Object.keys( cashApp ).length ? "cash_app" : undefined ),
    receiptUrl: text( charge.receipt_url ),
  };
}

export function squarePaymentDetails( payment: unknown ): StoredPaymentDetails {
  const source = record( payment );
  const cardDetails = record( source.card_details );
  const card = record( cardDetails.card );
  const wallet = record( card.digital_wallet );
  return {
    cardLast4: text( card.last_4 ),
    cardBrand: text( card.card_brand ),
    cardExpiryMonth: number( card.exp_month ),
    cardExpiryYear: number( card.exp_year ),
    walletType: text( wallet.type ),
    receiptUrl: text( source.receipt_url ),
  };
}

export function paypalPaymentDetails( capture: unknown ): StoredPaymentDetails {
  const source = record( capture );
  const paymentSource = record( source.payment_source );
  const card = record( paymentSource.card );
  const expiry = text( card.expiry )?.split( "-" );
  return {
    cardLast4: text( card.last_digits ),
    cardBrand: text( card.brand ),
    cardExpiryMonth: expiry?.[ 1 ] ? number( expiry[ 1 ] ) : undefined,
    cardExpiryYear: expiry?.[ 0 ] ? number( expiry[ 0 ] ) : undefined,
    walletType: Object.keys( record( paymentSource.venmo ) ).length ? "venmo" : undefined,
  };
}

export function compactPaymentDetails( details: StoredPaymentDetails ): Record<string, string | number> {
  return Object.fromEntries( Object.entries( details ).filter( ( entry ): entry is [ string, string | number ] => entry[ 1 ] !== undefined ) );
}
