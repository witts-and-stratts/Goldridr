import z from "zod/v4";
import {
  findAvailableChauffeur,
  getBookingByReference,
  saveBooking,
  updateBookingStatus,
  type BookingRecord,
} from "@/lib/pocketbase/repository";
import { createPocketBaseBookingCreated, createPocketBaseBookingStatusUpdate } from "@/lib/pocketbase/notifications";
import { recordSmsConsent } from "@/lib/notifications/sms-consent";
import { smsConsentEvidenceFromRequest } from "@/lib/notifications/sms-evidence";
import { SMS_CONSENT_VERSION } from "@/lib/sms-consent-copy";
import { getAppUrl, getNotificationTimeZone, getPaymentSettings } from "@/lib/admin-settings";
import { quoteBooking } from "@/lib/payments/quote";
import { paymentToken, paymentTokenHash } from "@/lib/payments/tokens";
import { assertFutureBookingTime } from "@/lib/booking-time";
import { getAlternativeSlots, type AlternativeSlot } from "@/lib/booking-availability";
import type { BookingPricingOverride } from "@/lib/booking-pricing";

const AttendeeSchema = z.object( {
  name: z.string().min( 1, "Attendee name is required" ),
  email: z.email( "Invalid email address" ),
  phone: z.string().optional(),
  timeZone: z.string().optional(),
  language: z.string().optional(),
} );

const TripDetailsSchema = z.object( {
  pickupLocation: z.string().optional(),
  pickup: z.string().optional(),
  dropoffLocation: z.string().optional(),
  destination: z.string().optional(),
  estimatedDistance: z.union( [ z.string(), z.number() ] ).optional(),
  estimatedPrice: z.number().optional(),
  estimatedTotal: z.number().optional(),
  estimatedDuration: z.string().optional(),
  estimatedDurationMinutes: z.number().optional(),
  passengers: z.union( [ z.string(), z.number() ] ).optional(),
  flightNumber: z.string().trim().max( 24 ).optional(),
  terminal: z.string().trim().max( 80 ).optional(),
  hours: z.number().int().min( 1 ).max( 24 ).optional(),
} ).loose();

export const BookingRequestSchema = z.object( {
  date: z.iso.date( "A valid date is required" ),
  time: z.string().regex( /^(?:[01]\d|2[0-3]):[0-5]\d$/, "A valid time is required" ),
  duration: z.number().int().positive().max( 24 * 60 ).optional().default( 60 ),
  attendee: AttendeeSchema,
  notes: z.string().optional(),
  smsOptIn: z.boolean().optional().default( false ),
  marketingSmsOptIn: z.boolean().optional().default( false ),
  smsConsentVersion: z.string().optional().default( SMS_CONSENT_VERSION ),
  tripType: z.enum( [ "airport", "city", "hourly" ] ).optional().default( "airport" ),
  tripDetails: TripDetailsSchema.optional(),
  discountCode: z.string().trim().optional().default( "" ),
} ).superRefine( ( input, ctx ) => {
  if ( ( input.smsOptIn || input.marketingSmsOptIn ) && !input.attendee.phone?.trim() ) {
    ctx.addIssue( {
      code: "custom",
      path: [ "attendee", "phone" ],
      message: "A mobile phone number is required when opting in to text messages",
    } );
  }
  if ( !input.tripDetails?.pickupLocation?.trim() ) ctx.addIssue( { code: "custom", path: [ "tripDetails", "pickupLocation" ], message: "A pickup location is required" } );
  if ( input.tripType !== "hourly" && !input.tripDetails?.dropoffLocation?.trim() ) ctx.addIssue( { code: "custom", path: [ "tripDetails", "dropoffLocation" ], message: "A destination is required" } );
  if ( input.tripType === "hourly" && !input.tripDetails?.hours ) ctx.addIssue( { code: "custom", path: [ "tripDetails", "hours" ], message: "An hourly duration is required" } );
} );

export type BookingRequestInput = z.infer<typeof BookingRequestSchema>;

export type CreateBookingOutcome =
  | { status: "created"; booking: BookingRecord; message: string }
  | { status: "clash"; alternativeSlots: AlternativeSlot[] };

function generateBookingReference(): string {
  const timestamp = Date.now().toString( 36 ).toUpperCase();
  const random = Math.random().toString( 36 ).substring( 2, 6 ).toUpperCase();
  return `GR-${ timestamp.slice( -4 ) }${ random }`;
}

function minutesToText( minutes: number ): string {
  if ( minutes < 60 ) return `${ minutes } mins`;
  const hours = Math.floor( minutes / 60 );
  const remainder = minutes % 60;
  return remainder ? `${ hours } hr ${ remainder } min` : `${ hours } hr`;
}

export async function createBookingRequest( req: Request, input: BookingRequestInput, options?: { pricing?: BookingPricingOverride } ): Promise<CreateBookingOutcome> {
  const tripDetails = input.tripDetails || {};
  assertFutureBookingTime( input.date, input.time, new Date(), await getNotificationTimeZone() );
  const quote = await quoteBooking( {
    type: input.tripType || "airport",
    pickupLocation: tripDetails.pickupLocation!,
    dropoffLocation: tripDetails.dropoffLocation,
    hours: tripDetails.hours,
  } );
  const pricing = options?.pricing;
  const autoDurationMinutes = input.tripType === "hourly"
    ? ( tripDetails.hours || 1 ) * 60
    : quote.durationMinutes || input.duration || 60;
  const durationMinutes = pricing?.durationMinutes ?? autoDurationMinutes;
  const subtotalCents = pricing?.totalCents ?? quote.subtotalCents;
  const assignedChauffeur = await findAvailableChauffeur( input.date, input.time, durationMinutes );

  if ( !assignedChauffeur ) {
    return {
      status: "clash",
      alternativeSlots: await getAlternativeSlots( input.date, input.time, durationMinutes ),
    };
  }

  const bookingReference = generateBookingReference();
  const token = paymentToken();
  const paymentSettings = await getPaymentSettings();
  const holdExpiresAt = new Date( Date.now() + paymentSettings.holdMinutes * 60_000 ).toISOString();
  const smsConsented = Boolean( input.smsOptIn && input.attendee.phone );
  const marketingSmsConsented = Boolean( input.marketingSmsOptIn && input.attendee.phone );
  const smsConsentedAt = smsConsented ? new Date().toISOString() : null;
  const savedBooking = await saveBooking( {
    reference: bookingReference,
    tripType: input.tripType || "airport",
    date: input.date,
    time: input.time,
    duration: durationMinutes,
    name: input.attendee.name,
    email: input.attendee.email,
    phone: input.attendee.phone || "",
    notes: input.notes || "",
    status: "pending_payment",
    tripDetails: JSON.stringify( {
      ...tripDetails,
      estimatedPrice: subtotalCents / 100,
      estimatedDistance: pricing?.totalMiles ?? quote.totalMiles,
      estimatedDuration: pricing?.durationMinutes !== undefined ? minutesToText( durationMinutes ) : quote.durationText,
      estimatedDurationMinutes: durationMinutes,
      pricePerMile: pricing?.pricePerMile ?? quote.pricePerMile,
    } ),
    discountCode: input.discountCode || null,
    chauffeurId: assignedChauffeur.id,
    smsConsentVersion: smsConsented ? SMS_CONSENT_VERSION : null,
    smsConsentedAt,
    paymentFlow: {
      tokenHash: paymentTokenHash( token ),
      holdExpiresAt,
      subtotalCents,
      currency: quote.currency,
    },
  } );

  if ( smsConsented ) {
    const evidence = smsConsentEvidenceFromRequest( req, "transactional" );
    await recordSmsConsent( {
      customerEmail: input.attendee.email,
      phone: input.attendee.phone!,
      ...evidence,
      consentedAt: smsConsentedAt!,
    } );
  }

  if ( marketingSmsConsented ) {
    const evidence = smsConsentEvidenceFromRequest( req, "marketing" );
    await recordSmsConsent( {
      customerEmail: input.attendee.email,
      phone: input.attendee.phone!,
      ...evidence,
      consentedAt: smsConsentedAt || new Date().toISOString(),
    } );
  }

  if ( savedBooking.quoteTotalCents === 0 ) {
    await updateBookingStatus( savedBooking.reference, "confirmed" );
    const confirmedBooking = await getBookingByReference( savedBooking.reference );
    if ( confirmedBooking ) await createPocketBaseBookingStatusUpdate( confirmedBooking );
    return {
      status: "created",
      booking: confirmedBooking || savedBooking,
      message: "Booking confirmed. Check your email or text messages for confirmation.",
    };
  }

  const paymentUrl = `${ ( await getAppUrl() ).replace( /\/$/, "" ) }/pay/${ encodeURIComponent( token ) }`;
  await createPocketBaseBookingCreated( savedBooking, { paymentUrl, holdExpiresAt } );

  return {
    status: "created",
    booking: savedBooking,
    message: "Booking request received. Check your email or text messages to pay and confirm.",
  };
}
