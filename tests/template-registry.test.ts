import assert from "node:assert/strict";
import test from "node:test";
import {
  PDF_ALLOWED_VARIABLES,
  SAMPLE_PAYLOAD,
  TEMPLATE_REGISTRY,
  defaultTemplateContent,
  getRegistryEntry,
  listAvailableVariables,
  resolveTemplateIdentity,
} from "@/lib/notifications/template-registry";
import { buildSmsBody, smsDisclosureFor, withCompliance } from "@/lib/notifications/sms-program";
import { emailDefaultContent, emailLayout } from "@/templates/email/defaults";
import { validateTemplateContent } from "@/lib/notifications/template-validation";
import { SMS_BODY_FULL_DISCLOSURE, SMS_BODY_OPT_OUT } from "@/lib/sms-consent-copy";

test( "the registry covers the expected SMS, email, and PDF identities", () => {
  const ids = new Set( TEMPLATE_REGISTRY.map( entry => `${ entry.channel }:${ entry.templateId }` ) );
  for ( const id of [
    "sms:booking_created",
    "sms:booking_status:confirmed",
    "sms:booking_status:updated",
    "sms:booking_assignment:assigned",
    "sms:booking_assignment:unassigned",
    "email:booking_created",
    "email:chauffeur_reminder",
    "email:delivery_failure",
    "email:default",
    "pdf:invoice",
    "pdf:payment",
  ] ) {
    assert.ok( ids.has( id ), `missing ${ id }` );
  }
  assert.equal( getRegistryEntry( "sms", "manual_message" ), undefined );
  assert.equal( getRegistryEntry( "email", "broadcast" ), undefined );
} );

test( "variant selection derives the template identity from the payload", () => {
  assert.equal( resolveTemplateIdentity( "sms", "booking_status", { status: "confirmed" } )?.entry.templateId, "booking_status:confirmed" );
  assert.equal( resolveTemplateIdentity( "sms", "booking_status", { status: "accepted" } )?.entry.templateId, "booking_status:confirmed" );
  assert.equal( resolveTemplateIdentity( "sms", "booking_status", { status: "in_progress" } )?.entry.templateId, "booking_status:updated" );
  assert.equal( resolveTemplateIdentity( "sms", "booking_assignment", { chauffeurName: "Marcus" } )?.entry.templateId, "booking_assignment:assigned" );
  assert.equal( resolveTemplateIdentity( "sms", "booking_assignment", { chauffeurName: "" } )?.entry.templateId, "booking_assignment:unassigned" );
  assert.equal( resolveTemplateIdentity( "email", "booking_assignment", { action: "reassigned" } )?.entry.templateId, "booking_assignment:assigned" );
  assert.equal( resolveTemplateIdentity( "email", "booking_assignment", { action: "unassigned" } )?.entry.templateId, "booking_assignment:unassigned" );
  assert.equal( resolveTemplateIdentity( "sms", "booking_created", {} )?.variant, "" );
  assert.equal( resolveTemplateIdentity( "sms", "does_not_exist", {} ), null );
} );

test( "every SMS default matches the legacy buildSmsBody output with compliance appended", () => {
  for ( const entry of TEMPLATE_REGISTRY.filter( item => item.channel === "sms" ) ) {
    const payload = entry.samplePayload;
    const content = entry.defaultContent( payload ) as { body: string };
    const expected = buildSmsBody( entry.templateId, payload );
    assert.equal(
      withCompliance( content.body, smsDisclosureFor( entry.templateId ) ),
      expected,
      `SMS parity failed for ${ entry.templateId }`
    );
    assert.equal(
      content.body.includes( SMS_BODY_OPT_OUT ) || content.body.includes( SMS_BODY_FULL_DISCLOSURE ),
      false,
      `compliance copy must not be part of the editable body (${ entry.templateId })`
    );
  }
} );

test( "SMS editor defaults retain variables while preview content is rendered", () => {
  const entry = getRegistryEntry( "sms", "booking_created" )!;
  const editor = entry.defaultEditorContent!( entry.samplePayload ) as { body: string };
  const preview = entry.defaultContent( entry.samplePayload ) as { body: string };
  assert.ok( editor.body.includes( "{{ booking.reference }}" ) );
  assert.ok( !preview.body.includes( "{{ booking.reference }}" ) );
  assert.ok( preview.body.includes( "GR-7F3K2" ) );
} );

test( "email defaults reproduce the existing subject and structural layout", () => {
  const created = emailDefaultContent( "booking_created", SAMPLE_PAYLOAD );
  assert.equal( created.subject, "We received booking GR-7F3K2" );
  assert.equal( created.ctaLabel, "Pay to confirm" );

  const layout = emailLayout( "booking_created", SAMPLE_PAYLOAD, "https://app.goldridr.com" );
  assert.equal( layout.ctaUrl, SAMPLE_PAYLOAD.paymentUrl );
  assert.equal( layout.booking?.reference, "GR-7F3K2" );
  assert.equal( layout.booking?.service, "Airport transfer" );

  const confirmed = emailDefaultContent( "booking_status:confirmed", { ...SAMPLE_PAYLOAD, status: "confirmed" } );
  assert.equal( confirmed.subject, "Booking GR-7F3K2 confirmed" );
  const updated = emailDefaultContent( "booking_status:updated", { ...SAMPLE_PAYLOAD, status: "cancelled" } );
  assert.equal( updated.subject, "Booking GR-7F3K2 is Cancelled" );
} );

test( "allowed variables are scoped to each template identity", () => {
  const smsCreated = listAvailableVariables( "sms", "booking_created" );
  const smsStatus = listAvailableVariables( "sms", "booking_status:updated" );
  const emailCreated = listAvailableVariables( "email", "booking_created" );
  const emailStatus = listAvailableVariables( "email", "booking_status:updated" );
  const deliveryFailure = listAvailableVariables( "email", "delivery_failure" );

  assert.ok( smsCreated.includes( "links.payment" ) );
  assert.ok( !smsStatus.includes( "links.payment" ) );
  assert.ok( emailCreated.includes( "pin" ) );
  assert.ok( !emailStatus.includes( "pin" ) );
  assert.ok( deliveryFailure.includes( "message" ) );
  assert.ok( !emailStatus.includes( "message" ) );
  assert.ok( !emailCreated.includes( "links.qrImage" ) );
  assert.deepEqual( listAvailableVariables( "pdf", "invoice" ), PDF_ALLOWED_VARIABLES );
} );

test( "unknown channels and ids fall back safely", () => {
  assert.deepEqual( defaultTemplateContent( "sms", "does_not_exist", {} ), { body: "" } );
  assert.equal( getRegistryEntry( "email", "nope" ), undefined );
} );
