import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { createWithLegacyId, first } from "@/lib/pocketbase/core";
import type { SmsCampaignType } from "./sms-evidence";

// Carriers require an auditable record of when each number consented and when it
// revoked. The sms_consents collection is that ledger; bookings.smsConsentedAt is the
// send-time gate that mirrors it.

export type SmsConsentAction = "opt_in" | "opt_out" | "help" | "unknown";

const OPT_OUT_KEYWORDS = new Set( [ "stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout" ] );
const OPT_IN_KEYWORDS = new Set( [ "start", "unstop", "yes", "optin" ] );
const HELP_KEYWORDS = new Set( [ "help", "info" ] );

export function classifyInboundKeyword( body: string ): SmsConsentAction {
  const keyword = body.trim().toLowerCase().replace( /[^a-z]/g, "" );
  if ( OPT_OUT_KEYWORDS.has( keyword ) ) return "opt_out";
  if ( OPT_IN_KEYWORDS.has( keyword ) ) return "opt_in";
  if ( HELP_KEYWORDS.has( keyword ) ) return "help";
  return "unknown";
}

// Booking phone numbers are free text while Twilio always sends E.164, so both sides
// are reduced to their significant digits before comparison.
export function normalizePhone( phone: string ): string {
  const digits = phone.replace( /\D/g, "" );
  return digits.length > 10 ? digits.slice( -10 ) : digits;
}

async function bookingsForPhone( phone: string ): Promise<Array<{ id: string; passengerPhone: string }>> {
  const normalized = normalizePhone( phone );
  if ( normalized.length < 10 ) return [];
  const pb = getPocketBaseClient();
  const records = await pb.collection( pocketBaseCollections.bookings ).getFullList( {
    filter: pb.filter( "passengerPhone != ''" ),
    fields: "id,passengerPhone",
  } );
  return records
    .map( record => ( { id: String( record.id ), passengerPhone: String( record.passengerPhone || "" ) } ) )
    .filter( record => normalizePhone( record.passengerPhone ) === normalized );
}

export async function recordSmsConsent( input: {
  customerEmail: string;
  phone: string;
  consentVersion: string;
  campaignType: SmsCampaignType;
  consentedAt?: string;
  consentSource?: string;
  consentText?: string;
  ipAddress?: string;
  userAgent?: string;
} ): Promise<void> {
  const normalized = normalizePhone( input.phone );
  if ( !normalized || !input.customerEmail ) return;
  const consentedAt = input.consentedAt || new Date().toISOString();
  const existing = await first(
    pocketBaseCollections.smsConsents,
    "phone = {:phone} && customerEmail = {:email} && campaignType = {:campaignType}",
    { phone: normalized, email: input.customerEmail, campaignType: input.campaignType }
  );
  if ( existing ) {
    await getPocketBaseClient().collection( pocketBaseCollections.smsConsents ).update( existing.id, {
      consentVersion: input.consentVersion,
      campaignType: input.campaignType,
      consentedAt,
      revokedAt: "",
      consentSource: input.consentSource || "",
      consentText: input.consentText || "",
      ipAddress: input.ipAddress || "",
      userAgent: input.userAgent || "",
    } );
    return;
  }
  await createWithLegacyId( pocketBaseCollections.smsConsents, {
    customerEmail: input.customerEmail,
    phone: normalized,
    consentVersion: input.consentVersion,
    campaignType: input.campaignType,
    consentedAt,
    revokedAt: "",
    consentSource: input.consentSource || "",
    consentText: input.consentText || "",
    ipAddress: input.ipAddress || "",
    userAgent: input.userAgent || "",
    sourceCreatedAt: consentedAt,
  } );
}

export async function revokeSmsConsent( phone: string ): Promise<{ ledgerRevoked: number; bookingsCleared: number }> {
  const normalized = normalizePhone( phone );
  if ( !normalized ) return { ledgerRevoked: 0, bookingsCleared: 0 };
  const pb = getPocketBaseClient();
  const revokedAt = new Date().toISOString();

  const ledger = await pb.collection( pocketBaseCollections.smsConsents ).getFullList( {
    filter: pb.filter( "phone = {:phone}", { phone: normalized } ),
  } );
  for ( const record of ledger ) {
    await pb.collection( pocketBaseCollections.smsConsents ).update( record.id, { revokedAt } );
  }

  const bookings = await bookingsForPhone( normalized );
  for ( const booking of bookings ) {
    await pb.collection( pocketBaseCollections.bookings ).update( booking.id, { smsConsentedAt: "" } );
  }

  return { ledgerRevoked: ledger.length, bookingsCleared: bookings.length };
}

export async function restoreSmsConsent( phone: string ): Promise<{ ledgerRestored: number; bookingsRestored: number }> {
  const normalized = normalizePhone( phone );
  if ( !normalized ) return { ledgerRestored: 0, bookingsRestored: 0 };
  const pb = getPocketBaseClient();
  const consentedAt = new Date().toISOString();

  const ledger = await pb.collection( pocketBaseCollections.smsConsents ).getFullList( {
    filter: pb.filter( "phone = {:phone}", { phone: normalized } ),
  } );
  // A number that never consented cannot opt itself back in by texting START.
  if ( ledger.length === 0 ) return { ledgerRestored: 0, bookingsRestored: 0 };
  for ( const record of ledger ) {
    await pb.collection( pocketBaseCollections.smsConsents ).update( record.id, { revokedAt: "", consentedAt } );
  }

  const bookings = await bookingsForPhone( normalized );
  for ( const booking of bookings ) {
    await pb.collection( pocketBaseCollections.bookings ).update( booking.id, { smsConsentedAt: consentedAt } );
  }

  return { ledgerRestored: ledger.length, bookingsRestored: bookings.length };
}

export async function hasActiveSmsConsent(
  phone: string,
  campaignType: SmsCampaignType = "transactional"
): Promise<boolean> {
  const normalized = normalizePhone( phone );
  if ( !normalized ) return false;
  const record = await first(
    pocketBaseCollections.smsConsents,
    "phone = {:phone} && campaignType = {:campaignType}",
    { phone: normalized, campaignType }
  );
  return Boolean( record && !record.revokedAt );
}
