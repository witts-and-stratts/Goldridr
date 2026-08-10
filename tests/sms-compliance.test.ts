import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SMS_CONSENT_DISCLOSURE,
  SMS_CONSENT_RATES,
  SMS_CONSENT_VERSION,
  SMS_HELP_REPLY,
  SMS_MARKETING_CONSENT_DISCLOSURE,
  SMS_MARKETING_PROGRAM_NAME,
  SMS_OPT_IN_REPLY,
  SMS_OPT_OUT_REPLY,
  SMS_PROGRAM_NAME,
  SMS_SUPPORT_EMAIL,
} from "@/lib/sms-consent-copy";
import { smsConsentEvidenceFromRequest } from "@/lib/notifications/sms-evidence";
import { buildSmsBody, resolveTwilioWebhookUrl } from "@/lib/notifications/sms-program";
import { ContactFormSchema } from "@/lib/form-schemas";

test( "consent copy contains Twilio's required recurring-message disclosures", () => {
  assert.match( SMS_CONSENT_RATES, /^Message and data rates may apply/ );
  assert.doesNotMatch( SMS_CONSENT_DISCLOSURE, /standard rates/i );
  assert.match( SMS_CONSENT_DISCLOSURE, /Message frequency varies/ );
  assert.match( SMS_CONSENT_DISCLOSURE, /Reply HELP for help/ );
  assert.match( SMS_CONSENT_DISCLOSURE, /STOP to cancel/ );
  assert.match( SMS_CONSENT_DISCLOSURE, /Consent is not required/ );
  assert.equal( SMS_CONSENT_VERSION, "2026-08" );
} );

test( "automated keyword replies are branded and actionable", () => {
  assert.match( SMS_HELP_REPLY, new RegExp( SMS_PROGRAM_NAME ) );
  assert.match( SMS_HELP_REPLY, new RegExp( SMS_SUPPORT_EMAIL.replace( ".", "\\." ) ) );
  assert.match( SMS_HELP_REPLY, /Reply STOP to cancel/ );
  assert.match( SMS_OPT_OUT_REPLY, new RegExp( SMS_PROGRAM_NAME ) );
  assert.match( SMS_OPT_OUT_REPLY, /No further messages will be sent/ );
  assert.match( SMS_OPT_IN_REPLY, new RegExp( SMS_PROGRAM_NAME ) );
  assert.match( SMS_OPT_IN_REPLY, /Msg & data rates may apply/ );
  assert.match( SMS_OPT_IN_REPLY, /Reply HELP for help, STOP to cancel/ );
} );

test( "marketing and transactional opt-ins are separate complete disclosures", () => {
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, new RegExp( SMS_MARKETING_PROGRAM_NAME ) );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /automated marketing text messages/ );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /up to 4 messages per month/ );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /Message and data rates may apply/ );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /Reply HELP for help/ );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /Reply STOP to cancel/ );
  assert.match( SMS_MARKETING_CONSENT_DISCLOSURE, /Consent is not required/ );
  assert.notEqual( SMS_MARKETING_CONSENT_DISCLOSURE, SMS_CONSENT_DISCLOSURE );
} );

test( "phone numbers and text message preferences require each other", () => {
  const base = {
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "",
    notes: "",
    discountCode: "",
    smsOptIn: false,
    marketingSmsOptIn: false,
  };

  assert.equal( ContactFormSchema.safeParse( base ).success, true );
  assert.equal( ContactFormSchema.safeParse( { ...base, smsOptIn: true } ).success, false );
  assert.equal( ContactFormSchema.safeParse( { ...base, marketingSmsOptIn: true } ).success, false );
  assert.equal( ContactFormSchema.safeParse( { ...base, phone: "+17135550123" } ).success, false );
  assert.equal( ContactFormSchema.safeParse( { ...base, phone: "+17135550123", smsOptIn: true } ).success, true );
  assert.equal( ContactFormSchema.safeParse( { ...base, phone: "+17135550123", marketingSmsOptIn: true } ).success, true );
} );

test( "the first booking message confirms the program disclosures", () => {
  const body = buildSmsBody( "booking_created", {
    bookingReference: "GR-TEST",
    date: "2026-08-14",
    time: "14:30",
  } );

  assert.match( body, /^Goldridr:/ );
  assert.match( body, /GR-TEST/ );
  assert.match( body, /Msg frequency varies/ );
  assert.match( body, /Msg & data rates may apply/ );
  assert.match( body, /Reply HELP for help, STOP to cancel/ );
} );

test( "every operational SMS template includes opt-out instructions", () => {
  for ( const template of [ "booking_reminder", "booking_assignment", "booking_deleted", "booking_status" ] ) {
    const body = buildSmsBody( template, {
      bookingReference: "GR-TEST",
      date: "2026-08-14",
      time: "14:30",
      status: "confirmed",
    } );
    assert.match( body, /^Goldridr/ );
    assert.match( body, /Reply STOP to opt out\.$/ );
  }
} );

test( "web booking consent evidence captures the reviewed disclosure and request source", () => {
  const request = new Request( "https://goldridr.com/api/booking", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
      "user-agent": "GoldRidrcompliance test",
    },
  } );
  const evidence = smsConsentEvidenceFromRequest( request );

  assert.equal( evidence.consentSource, "web_booking" );
  assert.equal( evidence.campaignType, "transactional" );
  assert.equal( evidence.consentVersion, SMS_CONSENT_VERSION );
  assert.equal( evidence.consentText, SMS_CONSENT_DISCLOSURE );
  assert.equal( evidence.ipAddress, "203.0.113.10" );
  assert.equal( evidence.userAgent, "GoldRidrcompliance test" );

  const marketingEvidence = smsConsentEvidenceFromRequest( request, "marketing" );
  assert.equal( marketingEvidence.campaignType, "marketing" );
  assert.equal( marketingEvidence.consentText, SMS_MARKETING_CONSENT_DISCLOSURE );
} );

test( "Twilio signature validation uses the public forwarded webhook URL", () => {
  const request = new Request( "http://website:3000/api/webhooks/twilio", {
    headers: {
      "x-forwarded-proto": "https",
      "x-forwarded-host": "goldridr.com",
    },
  } );

  assert.equal(
    resolveTwilioWebhookUrl( request ),
    "https://goldridr.com/api/webhooks/twilio"
  );
  assert.equal(
    resolveTwilioWebhookUrl( request, "https://sms.goldridr.com/inbound" ),
    "https://sms.goldridr.com/inbound"
  );
} );

test( "public compliance surfaces contain no placeholder phone and expose reviewable terms", () => {
  const contact = readFileSync( "src/app/contact/page.tsx", "utf8" );
  const bookingPage = readFileSync( "src/components/booking/BookingPageShell.tsx", "utf8" );

  assert.doesNotMatch( contact, /\+?1?\s*\(?555\)?[\s-]*123[\s-]*4567/ );
  assert.match( bookingPage, /<SmsProgramTerms \/>/ );
  assert.doesNotMatch( bookingPage, /Standard Rates/ );
  assert.match( contact, /NEXT_PUBLIC_CONTACT_PHONE/ );

  const consent = readFileSync( "src/components/booking/SmsConsent.tsx", "utf8" );
  assert.match( consent, /name="marketingSmsOptIn"/ );
  assert.match( consent, /name="smsOptIn"/ );
} );
