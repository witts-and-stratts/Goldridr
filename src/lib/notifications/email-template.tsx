import React from "react";
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { getBookingQrImageUrl, getBookingVerifyUrl } from "@/lib/booking-qr";
import { getAppUrl } from "@/lib/admin-settings";
import { getEmailConfig } from "./config";
import type { RenderedEmail } from "./types";

interface EmailContent {
  subject: string;
  preview: string;
  heading: string;
  message: string;
  appUrl: string;
  footerNote?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  details?: Array<[ string, string ]>;
  booking?: {
    reference: string;
    statusLabel: string;
    service: string;
    date: string;
    time: string;
    pickup: string;
    dropoff?: string;
    passengers?: string;
    flightNumber?: string;
    duration?: string;
    estimate?: string;
    notes?: string;
  };
  riderQr?: {
    reference: string;
    imageUrl: string;
    verifyUrl: string;
  };
}

const RIDER_TRIP_EMAIL_TEMPLATES = new Set( [
  "booking_created",
  "booking_status",
  "booking_reminder",
  "booking_assignment",
  "booking_deleted",
  "manual_message",
] );

function stringValue( value: unknown ): string {
  if ( typeof value === "string" ) return value.trim();
  if ( typeof value === "number" ) return String( value );
  return "";
}

function numberValue( value: unknown ): number | undefined {
  if ( typeof value === "number" && Number.isFinite( value ) ) return value;
  const parsed = Number( value );
  return Number.isFinite( parsed ) ? parsed : undefined;
}

function formatBookingDate( value: unknown ): string {
  const date = stringValue( value );
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec( date );
  if ( !match ) return date;
  const formatted = new Intl.DateTimeFormat( "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  } ).format( new Date( Date.UTC( Number( match[ 1 ] ), Number( match[ 2 ] ) - 1, Number( match[ 3 ] ) ) ) );
  return formatted;
}

function formatBookingTime( value: unknown ): string {
  const time = stringValue( value );
  const match = /^(\d{1,2}):(\d{2})/.exec( time );
  if ( !match ) return time;
  const hours = Number( match[ 1 ] );
  return `${ hours % 12 || 12 }:${ match[ 2 ] } ${ hours >= 12 ? "PM" : "AM" }`;
}

function formatCurrency( value: unknown ): string {
  const amount = numberValue( value );
  if ( amount === undefined ) return "";
  return new Intl.NumberFormat( "en-US", {
    style: "currency",
    currency: "USD",
  } ).format( amount );
}

function tripTypeLabel( value: unknown ): string {
  switch ( stringValue( value ).toLowerCase() ) {
    case "airport":
      return "Airport transfer";
    case "hourly":
      return "Hourly service";
    case "city":
    case "town":
      return "Around town";
    default:
      return stringValue( value ) || "Chauffeur service";
  }
}

function bookingContent(
  payload: Record<string, unknown>,
  reference: string,
  statusLabel: string
): NonNullable<EmailContent["booking"]> {
  const tripDetails = payload.tripDetails && typeof payload.tripDetails === "object"
    ? payload.tripDetails as Record<string, unknown>
    : {};
  const isHourly = stringValue( payload.tripType ).toLowerCase() === "hourly";
  const durationMinutes = numberValue( payload.duration );
  const durationHours = isHourly
    ? numberValue( tripDetails.durationHours )
      ?? numberValue( tripDetails.duration )
      ?? ( durationMinutes ? durationMinutes / 60 : undefined )
    : undefined;

  return {
    reference,
    statusLabel,
    service: tripTypeLabel( payload.tripType ),
    date: formatBookingDate( payload.date ),
    time: formatBookingTime( payload.time ),
    pickup: stringValue( tripDetails.pickupLocation || tripDetails.pickup ) || "To be confirmed",
    dropoff: stringValue( tripDetails.dropoffLocation || tripDetails.destination ),
    passengers: stringValue( tripDetails.passengers ),
    flightNumber: stringValue( tripDetails.flightNumber ),
    duration: durationHours ? `${ durationHours } ${ durationHours === 1 ? "hour" : "hours" }` : "",
    estimate: formatCurrency( tripDetails.estimatedTotal ?? tripDetails.estimatedPrice ),
    notes: stringValue( payload.notes ),
  };
}

function contentFor( template: string, payload: Record<string, unknown> ): EmailContent {
  const reference = String( payload.bookingReference || "" );
  const passenger = String( payload.passengerName || "Passenger" );
  const dateTime = payload.date && payload.time ? `${ payload.date } at ${ payload.time }` : "";
  const appUrl = String( payload.appUrl || getAppUrl() );
  const status = String( payload.status || "" );
  const message = String( payload.message || "" );
  const subject = String( payload.subject || "" );

  switch ( template ) {
    case "booking_created": {
      const pin = typeof payload.pin === "string" && payload.pin ? payload.pin : null;
      return {
        subject: `We received booking ${ reference }`,
        preview: "Your Goldridr booking request was received.",
        heading: "Booking request received",
        message: `Hi ${ passenger }, your ride request is now with our team. We will send another update as soon as it is confirmed.${ pin ? " Share your 4-digit PIN with your driver at pickup to confirm the ride." : "" }`,
        appUrl,
        footerNote: "Keep this email for your booking reference. This request is pending until you receive a confirmation update.",
        booking: bookingContent( payload, reference, "Request received" ),
        ...( pin ? { details: [ [ "Your pickup PIN", pin ] as [ string, string ] ] } : {} ),
      };
    }
    case "booking_status": {
      const normalizedStatus = status.toLowerCase();
      if ( normalizedStatus === "confirmed" || normalizedStatus === "accepted" ) {
        return {
          subject: `Booking ${ reference } confirmed`,
          preview: "Your Goldridr booking is confirmed.",
          heading: "Booking confirmed",
          message: `Hi ${ passenger }, your chauffeur service is confirmed. Your booking details are below.`,
          appUrl,
          footerNote: "Your booking is confirmed. Keep this email handy for your booking reference and ride details.",
          booking: bookingContent( payload, reference, "Confirmed" ),
        };
      }

      return {
        subject: `Booking ${ reference } is ${ status }`,
        preview: `Your booking status changed to ${ status }.`,
        heading: `Booking ${ status }`,
        message: `Your booking ${ reference } is now ${ status }.`,
        appUrl,
        details: [ [ "Pickup", dateTime ] ],
      };
    }
    case "booking_assignment": {
      const chauffeurName = stringValue( payload.chauffeurName );
      const action = stringValue( payload.action );
      const assigned = action === "assigned" || action === "reassigned";
      return {
        subject: assigned
          ? `Chauffeur update for booking ${ reference }`
          : `Chauffeur assignment removed for ${ reference }`,
        preview: assigned
          ? "Your chauffeur assignment has been updated."
          : "Your booking is awaiting a new chauffeur.",
        heading: assigned ? "Your chauffeur is assigned" : "Chauffeur update",
        message: assigned
          ? `Hi ${ passenger }, ${ chauffeurName } is assigned to your Goldridr booking.`
          : `Hi ${ passenger }, your previous chauffeur assignment changed. Our team is arranging the next assignment.`,
        appUrl,
        booking: bookingContent( payload, reference, assigned ? "Chauffeur assigned" : "Awaiting chauffeur" ),
      };
    }
    case "booking_deleted":
      return {
        subject: `Booking ${ reference } was deleted`,
        preview: "Your Goldridr booking record was removed.",
        heading: "Booking deleted",
        message: `Hi ${ passenger }, booking ${ reference } has been removed from our system. Contact Goldridr if you believe this was unexpected.`,
        appUrl,
        details: [ [ "Scheduled pickup", dateTime ] ],
      };
    case "booking_reminder":
      return {
        subject: payload.reminderHours === "Manual"
          ? `Pickup reminder for ${ reference }`
          : `${ payload.reminderHours }-hour reminder for ${ reference }`,
        preview: "Your Goldridr pickup is approaching.",
        heading: "Your ride is coming up",
        message: `This is a reminder that your Goldridr pickup is scheduled for ${ dateTime }.`,
        appUrl,
        details: [ [ "Reference", reference ] ],
      };
    case "chauffeur_assignment":
      return {
        subject: `You were assigned booking ${ reference }`,
        preview: "A booking was assigned to you.",
        heading: "New chauffeur assignment",
        message: `You are assigned to ${ passenger }'s ride on ${ dateTime }.`,
        appUrl,
        ctaLabel: "Open dispatch",
        ctaUrl: `${ appUrl }/admin/bookings`,
      };
    case "chauffeur_unassigned":
      return {
        subject: `Assignment removed for ${ reference }`,
        preview: "A booking assignment changed.",
        heading: "Assignment removed",
        message: `You are no longer assigned to booking ${ reference }.`,
        appUrl,
      };
    case "chauffeur_reminder":
      return {
        subject: payload.reminderHours === "Manual"
          ? `Pickup reminder: ${ reference }`
          : `${ payload.reminderHours }-hour pickup reminder: ${ reference }`,
        preview: "An assigned pickup is approaching.",
        heading: "Upcoming assigned ride",
        message: `${ passenger }'s pickup is scheduled for ${ dateTime }.`,
        appUrl,
        ctaLabel: "View booking",
        ctaUrl: `${ appUrl }/admin/bookings`,
      };
    case "manual_message":
    case "broadcast":
      return {
        subject: subject || "Message from Goldridr",
        preview: message.slice( 0, 120 ),
        heading: subject || "Goldridr update",
        message,
        appUrl,
      };
    case "delivery_failure":
      return {
        subject: `Notification delivery failed`,
        preview: "A notification needs administrator attention.",
        heading: "Delivery moved to dead letter",
        message,
        appUrl,
        ctaLabel: "Review notifications",
        ctaUrl: `${ appUrl }/admin/notifications`,
      };
    default:
      return {
        subject: subject || "Goldridr notification",
        preview: message.slice( 0, 120 ),
        heading: subject || "Goldridr",
        message,
        appUrl,
      };
  }
}

const colors = {
  canvas: "#050505",
  ink: "#1a1a18",
  panel: "#22221f",
  gold: "#c29e66",
  ivory: "#f7f4ed",
  muted: "#aaa69d",
  hairline: "#3a3935",
};

function BookingCard( {
  booking,
  assetUrl,
}: {
  booking: NonNullable<EmailContent["booking"]>;
  assetUrl: string;
} ) {
  const supportingDetails = [
    booking.passengers ? [ "Passengers", booking.passengers ] : null,
    booking.flightNumber ? [ "Flight", booking.flightNumber ] : null,
    booking.duration ? [ "Duration", booking.duration ] : null,
  ].filter( Boolean ) as Array<[ string, string ]>;

  return (
    <Section style={{ border: `1px solid ${ colors.hairline }`, marginTop: 28 }}>
      <Row style={{ borderBottom: `1px solid ${ colors.hairline }` }}>
        <Column style={{ padding: "18px 20px", width: "64%" }}>
          <Text style={{ color: colors.muted, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, margin: "0 0 6px", textTransform: "uppercase" }}>
            Booking reference
          </Text>
          <Text style={{ color: colors.ivory, fontSize: 17, fontWeight: 700, letterSpacing: 0.4, margin: 0 }}>
            { booking.reference }
          </Text>
        </Column>
        <Column align="right" style={{ padding: "18px 20px", width: "36%" }}>
          <Text style={{ color: colors.gold, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, margin: 0, textTransform: "uppercase" }}>
            { booking.statusLabel }
          </Text>
        </Column>
      </Row>

      <Section style={{ padding: "22px 20px 8px" }}>
        <Text style={{ color: colors.gold, fontSize: 11, fontWeight: 700, letterSpacing: 1.4, margin: "0 0 16px", textTransform: "uppercase" }}>
          { booking.service }
        </Text>
        <Row>
          <Column style={{ paddingRight: 12, verticalAlign: "top", width: "58%" }}>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 5px", textTransform: "uppercase" }}>Date</Text>
            <Text style={{ color: colors.ivory, fontSize: 16, fontWeight: 600, lineHeight: "22px", margin: 0 }}>{ booking.date }</Text>
          </Column>
          <Column align="right" style={{ verticalAlign: "top", width: "42%" }}>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 5px", textTransform: "uppercase" }}>Pickup time</Text>
            <Text style={{ color: colors.ivory, fontSize: 16, fontWeight: 600, lineHeight: "22px", margin: 0 }}>{ booking.time }</Text>
          </Column>
        </Row>
      </Section>

      <Hr style={{ borderColor: colors.hairline, margin: "14px 20px 0" }} />

      <Section style={{ padding: "20px 20px 10px" }}>
        <Row>
          <Column style={{ paddingRight: booking.dropoff ? 18 : 0, verticalAlign: "top", width: booking.dropoff ? "50%" : "100%" }}>
            <Img
              src={ `${ assetUrl }/assets/images/email-pickup-marker.webp` }
              alt=""
              width="24"
              height="24"
              style={{ display: "block", marginBottom: 10 }}
            />
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 6px", textTransform: "uppercase" }}>Pickup location</Text>
            <Text style={{ color: colors.ivory, fontSize: 14, lineHeight: "22px", margin: 0 }}>{ booking.pickup }</Text>
          </Column>
          { booking.dropoff ? (
            <Column style={{ borderLeft: `1px solid ${ colors.hairline }`, paddingLeft: 18, verticalAlign: "top", width: "50%" }}>
              <Img
                src={ `${ assetUrl }/assets/images/email-dropoff-marker.webp` }
                alt=""
                width="24"
                height="24"
                style={{ display: "block", marginBottom: 10 }}
              />
              <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 6px", textTransform: "uppercase" }}>Dropoff location</Text>
              <Text style={{ color: colors.ivory, fontSize: 14, lineHeight: "22px", margin: 0 }}>{ booking.dropoff }</Text>
            </Column>
          ) : null }
        </Row>
      </Section>

      { supportingDetails.length ? (
        <>
          <Hr style={{ borderColor: colors.hairline, margin: "14px 20px 0" }} />
          <Section style={{ padding: "18px 20px 6px" }}>
            <Row>
              { supportingDetails.map( ( [ label, value ] ) => (
                <Column key={ label } style={{ paddingRight: 12, verticalAlign: "top" }}>
                  <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 5px", textTransform: "uppercase" }}>{ label }</Text>
                  <Text style={{ color: colors.ivory, fontSize: 14, fontWeight: 600, lineHeight: "20px", margin: 0 }}>{ value }</Text>
                </Column>
              ) ) }
            </Row>
          </Section>
        </>
      ) : null }

      { booking.notes ? (
        <>
          <Hr style={{ borderColor: colors.hairline, margin: "14px 20px 0" }} />
          <Section style={{ padding: "18px 20px 4px" }}>
            <Text style={{ color: colors.muted, fontSize: 10, letterSpacing: 1, margin: "0 0 6px", textTransform: "uppercase" }}>Special requests</Text>
            <Text style={{ color: colors.ivory, fontSize: 14, lineHeight: "22px", margin: 0 }}>{ booking.notes }</Text>
          </Section>
        </>
      ) : null }

      { booking.estimate ? (
        <Section style={{ backgroundColor: "#1b1b19", borderTop: `1px solid ${ colors.hairline }`, marginTop: 18, padding: "17px 20px" }}>
          <Row>
            <Column>
              <Text style={{ color: colors.muted, fontSize: 11, margin: 0 }}>Estimated total</Text>
            </Column>
            <Column align="right">
              <Text style={{ color: colors.gold, fontSize: 20, fontWeight: 700, margin: 0 }}>{ booking.estimate }</Text>
            </Column>
          </Row>
        </Section>
      ) : null }
    </Section>
  );
}

function RiderQrCode( {
  qr,
}: {
  qr: NonNullable<EmailContent["riderQr"]>;
} ) {
  return (
    <Section style={{ backgroundColor: "#f7f4ed", marginTop: 26, padding: "22px 20px", textAlign: "center" }}>
      <Text style={{ color: "#4d4a43", fontSize: 10, fontWeight: 700, letterSpacing: 1.4, margin: "0 0 12px", textTransform: "uppercase" }}>
        Your trip QR code
      </Text>
      <Link href={ qr.verifyUrl } style={{ display: "inline-block", textDecoration: "none" }}>
        <Img
          src={ qr.imageUrl }
          alt={ `QR code for booking ${ qr.reference }` }
          width="168"
          height="168"
          style={{ display: "block", margin: "0 auto" }}
        />
      </Link>
      <Text style={{ color: "#4d4a43", fontSize: 12, lineHeight: "18px", margin: "12px 0 0" }}>
        Present this code to your chauffeur or tap it to view your trip.
      </Text>
      <Text style={{ color: "#77746d", fontSize: 10, letterSpacing: 0.4, margin: "6px 0 0" }}>
        { qr.reference }
      </Text>
    </Section>
  );
}

function GoldridrEmail( { content }: { content: EmailContent } ) {
  const assetUrl = content.appUrl.replace( /\/$/, "" );

  return (
    <Html>
      <Head />
      <Preview>{ content.preview }</Preview>
      <Body style={{ backgroundColor: colors.canvas, fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: "40px 12px" }}>
        <Container style={{ backgroundColor: colors.ink, border: `1px solid ${ colors.hairline }`, margin: "0 auto", maxWidth: 600 }}>
          <Section style={{ borderBottom: `1px solid ${ colors.hairline }`, padding: "24px 30px" }}>
            <Img
              src={ `${ assetUrl }/assets/images/email-brand-logo.webp` }
              alt="Goldridr"
              width="173"
              height="36"
              style={{ display: "block" }}
            />
          </Section>
          <Section style={{ padding: "38px 30px 32px" }}>
            <Text style={{ color: colors.gold, fontSize: 10, fontWeight: 700, letterSpacing: 2, margin: "0 0 14px", textTransform: "uppercase" }}>
              Chauffeur service
            </Text>
            <Heading style={{ color: colors.ivory, fontSize: 30, fontWeight: 500, lineHeight: "37px", margin: "0 0 16px" }}>
            { content.heading }
            </Heading>
            <Text style={{ color: "#c7c3ba", fontSize: 15, lineHeight: "24px", margin: 0 }}>{ content.message }</Text>
            { content.booking ? <BookingCard booking={ content.booking } assetUrl={ assetUrl } /> : null }
            { content.details?.length ? (
              <Section style={{ border: `1px solid ${ colors.hairline }`, marginTop: 26, padding: "8px 18px" }}>
                { content.details.map( ( [ label, value ] ) => (
                  <Text key={ label } style={{ color: "#c7c3ba", fontSize: 14, margin: "10px 0" }}>
                    <strong style={{ color: colors.ivory }}>{ label }:</strong> { value }
                  </Text>
                ) ) }
              </Section>
            ) : null }
            { content.riderQr ? <RiderQrCode qr={ content.riderQr } /> : null }
            { content.ctaUrl ? (
              <Button href={ content.ctaUrl } style={{ backgroundColor: colors.gold, borderRadius: 0, color: colors.ink, display: "inline-block", fontSize: 12, fontWeight: 700, letterSpacing: 1.2, marginTop: 24, padding: "14px 20px", textDecoration: "none", textTransform: "uppercase" }}>
                { content.ctaLabel }
              </Button>
            ) : null }
          </Section>
          <Section style={{ backgroundColor: colors.panel, borderTop: `1px solid ${ colors.hairline }`, padding: "22px 30px" }}>
            <Text style={{ color: colors.muted, fontSize: 11, lineHeight: "18px", margin: 0 }}>
              Goldridr private chauffeur service
            </Text>
            <Text style={{ color: "#77746d", fontSize: 10, lineHeight: "17px", margin: "5px 0 0" }}>
              { content.footerNote || "This is an automated service message from Goldridr." }
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderNotificationEmail(
  template: string,
  recipient: string,
  payload: Record<string, unknown>,
  idempotencyKey: string
): Promise<RenderedEmail> {
  const config = await getEmailConfig();
  const baseContent = contentFor( template, payload );
  const reference = stringValue( payload.bookingReference );
  const passengerEmail = stringValue( payload.passengerEmail ) || recipient;
  const content = RIDER_TRIP_EMAIL_TEMPLATES.has( template ) && reference && passengerEmail
    ? {
        ...baseContent,
        riderQr: {
          reference,
          imageUrl: getBookingQrImageUrl( baseContent.appUrl, reference, passengerEmail ),
          verifyUrl: getBookingVerifyUrl( baseContent.appUrl, reference, passengerEmail ),
        },
      }
    : baseContent;
  const element = <GoldridrEmail content={ content } />;
  const [ html, text ] = await Promise.all( [
    render( element ),
    render( element, { plainText: true } ),
  ] );
  return {
    from: `${ config.fromName } <${ config.fromAddress }>`,
    replyTo: config.replyTo,
    to: [ recipient ],
    subject: content.subject,
    html,
    text,
    tags: {
      notification_id: String( payload.notificationId || "" ),
      booking_reference: String( payload.bookingReference || "" ),
    },
    idempotencyKey,
  };
}
