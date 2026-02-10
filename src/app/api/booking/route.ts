import { NextResponse } from "next/server";
import z from "zod/v4";

// ============================================================================
// Configuration
// ============================================================================

const CAL_API_BASE = "https://api.cal.com/v2";
const CAL_API_VERSION = "2024-08-13";
const DEFAULT_EVENT_TYPE_SLUG = process.env.BOOKING_EVENT_TYPE_SLUG;
const DEFAULT_USERNAME = process.env.BOOKING_USERNAME;

// Cal.com allowed durations
const ALLOWED_DURATIONS = [ 5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 80, 90, 120, 150, 180, 240, 300, 360, 420, 480 ] as const;

// ============================================================================
// Zod Schemas
// ============================================================================

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
  passengers: z.union( [ z.string(), z.number() ] ).optional(),
  flightNumber: z.string().optional(),
} ).loose(); // Allow additional fields

const BookingRequestSchema = z.object( {
  // Event type identification
  eventTypeId: z.number().optional(),
  eventTypeSlug: z.string().optional(),
  username: z.string().optional(),

  // Required booking details
  date: z.string().min( 1, "Date is required" ),
  time: z.string().min( 1, "Time is required" ),
  duration: z.number().optional().default( 60 ),

  // Attendee (required)
  attendee: AttendeeSchema,

  // Optional fields
  notes: z.string().optional(),
  tripType: z.enum( [ "airport", "city", "hourly" ] ).optional().default( "airport" ),
  tripDetails: TripDetailsSchema.optional(),
} );

type BookingRequestInput = z.infer<typeof BookingRequestSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique booking reference in format GR-XXXXXXXX
 */
function generateBookingReference(): string {
  const timestamp = Date.now().toString( 36 ).toUpperCase();
  const random = Math.random().toString( 36 ).substring( 2, 6 ).toUpperCase();
  return `GR-${ timestamp.slice( -4 ) }${ random }`;
}

/**
 * Sanitize metadata to comply with Cal.com limits:
 * - Max 50 keys
 * - Each key up to 40 characters
 * - String values up to 500 characters
 */
function sanitizeMetadata( obj: Record<string, unknown> ): Record<string, string> {
  const result: Record<string, string> = {};
  let keyCount = 0;

  const flatten = ( data: Record<string, unknown>, prefix = "" ) => {
    if ( keyCount >= 50 ) return;

    for ( const key of Object.keys( data ) ) {
      if ( keyCount >= 50 ) break;

      const fullKey = prefix ? `${ prefix }_${ key }` : key;
      const truncatedKey = fullKey.slice( 0, 40 );
      const value = data[ key ];

      if ( value === null || value === undefined ) {
        continue;
      } else if ( typeof value === "object" && !Array.isArray( value ) ) {
        flatten( value as Record<string, unknown>, truncatedKey );
      } else {
        const stringValue = Array.isArray( value )
          ? value.join( ", " )
          : String( value );
        result[ truncatedKey ] = stringValue.slice( 0, 500 );
        keyCount++;
      }
    }
  };

  flatten( obj );
  return result;
}

/**
 * Format phone number to E.164 format for US numbers only
 */
function formatPhoneNumber( phone?: string ): string | undefined {
  if ( !phone ) return undefined;
  const digits = phone.replace( /\D/g, "" );
  if ( digits.length === 10 ) return `+1${ digits }`;
  if ( digits.length === 11 && digits.startsWith( "1" ) ) return `+${ digits }`;
  return undefined; // Skip non-US phone numbers
}

/**
 * Find the nearest allowed Cal.com duration
 */
function getNearestAllowedDuration( requested: number ): number {
  return ALLOWED_DURATIONS.reduce( ( prev, curr ) =>
    Math.abs( curr - requested ) < Math.abs( prev - requested ) ? curr : prev
  );
}

/**
 * Convert local date/time to UTC ISO string
 */
function toUTCISO( date: string, time: string ): string {
  const localDateTime = new Date( `${ date }T${ time }:00` );
  return localDateTime.toISOString().replace( ".000Z", "Z" );
}

// ============================================================================
// Cal.com API Functions
// ============================================================================

interface CalBookingRequest {
  eventTypeId?: number;
  eventTypeSlug?: string;
  username?: string;
  start: string;
  lengthInMinutes: number;
  attendee: {
    name: string;
    email: string;
    timeZone: string;
    phoneNumber?: string;
    language?: string;
  };
  metadata?: Record<string, string>;
  bookingFieldsResponses?: Record<string, string>;
}

async function checkSlotAvailability(
  eventTypeId: number,
  startDate: string,
  endDate: string,
  apiKey: string
): Promise<{ available: boolean; slots: string[] }> {
  const url = new URL( `${ CAL_API_BASE }/slots` );
  url.searchParams.set( "eventTypeId", eventTypeId.toString() );
  url.searchParams.set( "start", startDate );
  url.searchParams.set( "end", endDate );
  url.searchParams.set( "timeZone", "America/Chicago" );

  const response = await fetch( url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "cal-api-version": CAL_API_VERSION,
      Authorization: `Bearer ${ apiKey }`,
    },
  } );

  const data = await response.json();

  if ( data.status === "success" && data.data?.slots ) {
    const availableSlots: string[] = [];
    for ( const date of Object.keys( data.data.slots ) ) {
      availableSlots.push( ...data.data.slots[ date ] );
    }
    return { available: availableSlots.length > 0, slots: availableSlots };
  }

  return { available: false, slots: [] };
}

async function createCalBooking(
  request: CalBookingRequest,
  apiKey: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  console.log( "Cal.com request body:", JSON.stringify( request, null, 2 ) );

  const response = await fetch( `${ CAL_API_BASE }/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "cal-api-version": CAL_API_VERSION,
      Authorization: `Bearer ${ apiKey }`,
    },
    body: JSON.stringify( request ),
  } );

  const data = await response.json();

  if ( data.status === "success" ) {
    return { success: true, data: data.data };
  }

  return {
    success: false,
    error: data.error?.message || "Failed to create booking",
  };
}

// ============================================================================
// Request Builders
// ============================================================================

function buildCalBookingRequest(
  input: BookingRequestInput,
  bookingReference: string
): CalBookingRequest {
  const tripDetails = input.tripDetails || {};
  const pickupLocation = tripDetails.pickupLocation || tripDetails.pickup || "";
  const dropoffLocation = tripDetails.dropoffLocation || tripDetails.destination || "";

  const estimatedPrice = tripDetails.estimatedPrice ?? tripDetails.estimatedTotal ?? 0;
  const formattedTotal = Intl.NumberFormat( "en-US", {
    style: "currency",
    currency: "USD",
  } ).format( estimatedPrice );

  return {
    eventTypeId: input.eventTypeId,
    eventTypeSlug: input.eventTypeSlug || DEFAULT_EVENT_TYPE_SLUG,
    username: input.username || DEFAULT_USERNAME,
    start: toUTCISO( input.date, input.time ),
    lengthInMinutes: getNearestAllowedDuration( input.duration ?? 60 ),
    attendee: {
      name: input.attendee.name,
      email: input.attendee.email,
      timeZone: "America/Chicago",
      phoneNumber: formatPhoneNumber( input.attendee.phone ),
      language: "en",
    },
    metadata: sanitizeMetadata( {
      tripType: input.tripType,
      ...tripDetails,
      bookingReference,
      source: "goldridr_website",
    } ),
    bookingFieldsResponses: {
      pickup: pickupLocation,
      destination: dropoffLocation,
      booking_type: input.tripType || "airport",
      estimated_distance: `${ tripDetails.estimatedDistance ?? "0" } miles`,
      estimated_price: String( tripDetails.estimatedPrice ?? "0" ),
      estimated_total: formattedTotal,
      passengers: String( tripDetails.passengers ?? "1" ),
      flight_number: tripDetails.flightNumber || "",
      duration: tripDetails.estimatedDuration || ( input.duration ? `${ input.duration } mins` : "" ),
      booking_reference: bookingReference,
    },
  };
}

// ============================================================================
// API Route Handlers
// ============================================================================

export async function POST( req: Request ) {
  const apiKey = process.env.CAL_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json(
      { success: false, error: "Cal.com API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();

    // Validate request with Zod
    const parseResult = BookingRequestSchema.safeParse( body );

    if ( !parseResult.success ) {
      const errors = z.prettifyError( parseResult.error );
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: errors,
        },
        { status: 400 }
      );
    }

    const input = parseResult.data;

    // Check availability if eventTypeId provided
    if ( input.eventTypeId ) {
      const localDateTime = new Date( `${ input.date }T${ input.time }:00` );
      const startDateStr = localDateTime.toISOString().split( "T" )[ 0 ];
      const endDate = new Date( localDateTime );
      endDate.setDate( endDate.getDate() + 1 );
      const endDateStr = endDate.toISOString().split( "T" )[ 0 ];

      const availability = await checkSlotAvailability(
        input.eventTypeId,
        startDateStr,
        endDateStr,
        apiKey
      );

      const requestedSlot = toUTCISO( input.date, input.time );
      const isSlotAvailable = availability.slots.some(
        ( slot ) => new Date( slot ).getTime() === new Date( requestedSlot ).getTime()
      );

      if ( !isSlotAvailable ) {
        return NextResponse.json(
          {
            success: false,
            available: false,
            error: "Requested time slot is not available",
            availableSlots: availability.slots.slice( 0, 10 ),
          },
          { status: 409 }
        );
      }
    }

    // Generate booking reference and build request
    const bookingReference = generateBookingReference();
    const calRequest = buildCalBookingRequest( input, bookingReference );

    // Debug logging
    console.log( "Booking request:", JSON.stringify( {
      attendee: calRequest.attendee,
      bookingFieldsResponses: calRequest.bookingFieldsResponses,
    }, null, 2 ) );

    // Create the booking
    const result = await createCalBooking( calRequest, apiKey );

    if ( result.success ) {
      return NextResponse.json( {
        success: true,
        booking: {
          id: result.data.id,
          uid: result.data.uid,
          reference: bookingReference,
          status: result.data.status,
          start: result.data.start,
          end: result.data.end,
          title: result.data.title,
        },
        message: "Booking confirmed successfully",
      } );
    }

    return NextResponse.json(
      { success: false, error: result.error },
      { status: 400 }
    );
  } catch ( error: unknown ) {
    console.error( "Booking error:", error );
    const message = error instanceof Error ? error.message : "Failed to process booking";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// GET endpoint to check availability
export async function GET( req: Request ) {
  const apiKey = process.env.CAL_API_KEY;

  if ( !apiKey ) {
    return NextResponse.json(
      { success: false, error: "Cal.com API key is not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL( req.url );
  const eventTypeId = searchParams.get( "eventTypeId" );
  const startDate = searchParams.get( "start" );
  const endDate = searchParams.get( "end" );

  if ( !eventTypeId || !startDate || !endDate ) {
    return NextResponse.json(
      { success: false, error: "Missing required params: eventTypeId, start, end" },
      { status: 400 }
    );
  }

  try {
    const availability = await checkSlotAvailability(
      parseInt( eventTypeId ),
      startDate,
      endDate,
      apiKey
    );

    return NextResponse.json( {
      success: true,
      available: availability.available,
      slots: availability.slots,
    } );
  } catch ( error: unknown ) {
    console.error( "Availability check error:", error );
    const message = error instanceof Error ? error.message : "Failed to check availability";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
