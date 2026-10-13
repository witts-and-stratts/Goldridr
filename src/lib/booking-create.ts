import z from "zod/v4";
import {
  deleteBooking,
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
import { getAppUrl, getNotificationTimeZone, getPaymentSettings, getRoundTripDiscountPercent } from "@/lib/admin-settings";
import { quoteBooking } from "@/lib/payments/quote";
import { paymentToken, paymentTokenHash } from "@/lib/payments/tokens";
import { assertFutureBookingTime } from "@/lib/booking-time";
import { zonedDateTimeToDate } from "@/lib/notifications/time";
import { getAlternativeSlots, type AlternativeSlot } from "@/lib/booking-availability";
import type { BookingPricingOverride } from "@/lib/booking-pricing";
import { syncReturnLeg } from "@/lib/round-trip";
import type { FlightDirection } from "@/lib/flights/types";

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

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

const RoundTripSchema = z.object( {
  date: z.iso.date( "A valid return date is required" ),
  time: z.string().regex( TIME_PATTERN, "A valid return time is required" ),
  flightNumber: z.string().trim().max( 24 ).optional(),
} );

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
  roundTrip: RoundTripSchema.optional(),
} ).superRefine( ( input, ctx ) => {
  if ( input.roundTrip && input.tripType === "hourly" ) ctx.addIssue( { code: "custom", path: [ "roundTrip" ], message: "Round trips are only available for airport and around-town rides" } );
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
  | { status: "created"; booking: BookingRecord; returnBooking?: BookingRecord; message: string }
  | { status: "clash"; leg: "outbound" | "return"; alternativeSlots: AlternativeSlot[] };

export class ReturnTimeError extends Error {}

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
      leg: "outbound",
      alternativeSlots: await getAlternativeSlots( input.date, input.time, durationMinutes ),
    };
  }

  const returnTrip = input.roundTrip ? await planReturnLeg( input, durationMinutes ) : null;
  if ( returnTrip?.status === "clash" ) return returnTrip;
  const returnLeg = returnTrip?.status === "planned" ? returnTrip : null;

  // An admin price override is the full amount charged, so it already covers both legs.
  const combinedCents = returnLeg && pricing?.totalCents === undefined ? subtotalCents + returnLeg.subtotalCents : subtotalCents;
  const roundTripDiscountCents = returnLeg && pricing?.totalCents === undefined
    ? Math.round( combinedCents * returnLeg.discountPercent / 100 )
    : 0;
  const chargedCents = combinedCents - roundTripDiscountCents;

  const bookingReference = generateBookingReference();
  const returnReference = returnLeg ? generateBookingReference() : null;
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
      estimatedPrice: chargedCents / 100,
      estimatedDistance: pricing?.totalMiles ?? quote.totalMiles,
      estimatedDuration: pricing?.durationMinutes !== undefined ? minutesToText( durationMinutes ) : quote.durationText,
      estimatedDurationMinutes: durationMinutes,
      pricePerMile: pricing?.pricePerMile ?? quote.pricePerMile,
      ...( returnLeg && returnReference ? {
        roundTrip: {
          leg: "outbound",
          pairedReference: returnReference,
          returnDate: returnLeg.date,
          returnTime: returnLeg.time,
          outboundCents: subtotalCents,
          returnCents: returnLeg.subtotalCents,
          discountPercent: pricing?.totalCents === undefined ? returnLeg.discountPercent : 0,
          discountCents: roundTripDiscountCents,
        },
      } : {} ),
    } ),
    discountCode: input.discountCode || null,
    chauffeurId: assignedChauffeur.id,
    smsConsentVersion: smsConsented ? SMS_CONSENT_VERSION : null,
    smsConsentedAt,
    paymentFlow: {
      tokenHash: paymentTokenHash( token ),
      holdExpiresAt,
      subtotalCents: chargedCents,
      currency: quote.currency,
    },
  } );

  let savedReturn: BookingRecord | undefined;
  if ( returnLeg && returnReference ) {
    try {
      savedReturn = await saveBooking( {
        reference: returnReference,
        tripType: input.tripType || "airport",
        date: returnLeg.date,
        time: returnLeg.time,
        duration: returnLeg.durationMinutes,
        name: input.attendee.name,
        email: input.attendee.email,
        phone: input.attendee.phone || "",
        notes: input.notes || "",
        status: "pending_payment",
        tripDetails: JSON.stringify( {
          pickupLocation: tripDetails.dropoffLocation,
          dropoffLocation: tripDetails.pickupLocation,
          passengers: tripDetails.passengers,
          luggage: tripDetails.luggage,
          tripDirection: reverseDirection( tripDetails.tripDirection ),
          flightNumber: input.roundTrip?.flightNumber || undefined,
          estimatedPrice: 0,
          estimatedDistance: returnLeg.totalMiles,
          estimatedDuration: returnLeg.durationText,
          estimatedDurationMinutes: returnLeg.durationMinutes,
          pricePerMile: returnLeg.pricePerMile,
          roundTrip: { leg: "return", pairedReference: bookingReference },
        } ),
        chauffeurId: returnLeg.chauffeurId,
        smsConsentVersion: smsConsented ? SMS_CONSENT_VERSION : null,
        smsConsentedAt,
        // Paid through the outbound leg's link; the hold keeps both legs expiring together.
        paymentFlow: { tokenHash: "", holdExpiresAt, subtotalCents: 0, currency: quote.currency },
      } );
    } catch ( error ) {
      await deleteBooking( savedBooking.reference ).catch( cleanupError => {
        console.error( `Unable to remove outbound leg ${ savedBooking.reference } after return leg failed`, cleanupError );
      } );
      throw error;
    }
  }

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
    const confirmedReturn = savedReturn ? await syncReturnLeg( savedBooking.reference, { status: "confirmed" } ) : undefined;
    return {
      status: "created",
      booking: confirmedBooking || savedBooking,
      returnBooking: confirmedReturn || savedReturn,
      message: "Booking confirmed. Check your email or text messages for confirmation.",
    };
  }

  const paymentUrl = `${ ( await getAppUrl() ).replace( /\/$/, "" ) }/pay/${ encodeURIComponent( token ) }`;
  await createPocketBaseBookingCreated( savedBooking, { paymentUrl, holdExpiresAt } );

  return {
    status: "created",
    booking: savedBooking,
    returnBooking: savedReturn,
    message: "Booking request received. Check your email or text messages to pay and confirm.",
  };
}

function reverseDirection( direction: unknown ): FlightDirection | undefined {
  if ( direction === "to_airport" ) return "from_airport";
  if ( direction === "from_airport" ) return "to_airport";
  return undefined;
}

type ReturnLegPlan =
  | {
    status: "planned";
    date: string;
    time: string;
    durationMinutes: number;
    subtotalCents: number;
    totalMiles?: number;
    durationText?: string;
    pricePerMile?: number;
    discountPercent: number;
    chauffeurId: string;
  }
  | { status: "clash"; leg: "return"; alternativeSlots: AlternativeSlot[] };

async function planReturnLeg( input: BookingRequestInput, outboundDurationMinutes: number ): Promise<ReturnLegPlan> {
  const roundTrip = input.roundTrip!;
  const tripDetails = input.tripDetails || {};
  const zone = await getNotificationTimeZone();
  assertFutureBookingTime( roundTrip.date, roundTrip.time, new Date(), zone );

  const outboundEnd = zonedDateTimeToDate( input.date, input.time, zone ).getTime() + outboundDurationMinutes * 60_000;
  if ( zonedDateTimeToDate( roundTrip.date, roundTrip.time, zone ).getTime() < outboundEnd ) {
    throw new ReturnTimeError( "The return pickup must be after the outbound ride ends" );
  }

  const quote = await quoteBooking( {
    type: input.tripType || "airport",
    pickupLocation: tripDetails.dropoffLocation!,
    dropoffLocation: tripDetails.pickupLocation,
  } );
  const durationMinutes = quote.durationMinutes || outboundDurationMinutes;
  const chauffeur = await findAvailableChauffeur( roundTrip.date, roundTrip.time, durationMinutes );
  if ( !chauffeur ) {
    return {
      status: "clash",
      leg: "return",
      alternativeSlots: await getAlternativeSlots( roundTrip.date, roundTrip.time, durationMinutes ),
    };
  }

  return {
    status: "planned",
    date: roundTrip.date,
    time: roundTrip.time,
    durationMinutes,
    subtotalCents: quote.subtotalCents,
    totalMiles: quote.totalMiles,
    durationText: quote.durationText,
    pricePerMile: quote.pricePerMile,
    discountPercent: await getRoundTripDiscountPercent(),
    chauffeurId: chauffeur.id,
  };
}
