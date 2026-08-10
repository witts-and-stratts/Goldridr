// Shared Zod v4 schemas for booking forms
import z from "zod/v4";
import { isBookingTimeInFuture } from "@/lib/booking-time";

// ============================================================================
// Common Field Schemas
// ============================================================================

export const LocationSchema = z.string().min( 5, "Location is required (minimum 5 characters)" );

export const DateSchema = z.date().min( 1, "Date is required" );

export const TimeSchema = z.string().regex( /^(?:[01]\d|2[0-3]):[0-5]\d$/, {
  message: "Time is required",
} );

export const PassengersSchema = z.string().min( 1, "Number of passengers is required" );

export const FlightNumberSchema = z.string().trim().max( 24, "Flight number is too long" );

export const TerminalSchema = z.string().trim().max( 80, "Terminal is too long" );

export const DurationSchema = z.string().min( 1, "Duration is required" );

function hasFuturePickup( data: { date: Date; time: string } ): boolean {
  if ( Number.isNaN( data.date.getTime() ) || !TimeSchema.safeParse( data.time ).success ) {
    return true;
  }

  const year = data.date.getFullYear();
  const month = String( data.date.getMonth() + 1 ).padStart( 2, "0" );
  const day = String( data.date.getDate() ).padStart( 2, "0" );
  return isBookingTimeInFuture( `${ year }-${ month }-${ day }`, data.time );
}

const FuturePickupValidation = {
  message: "Pickup date and time must be in the future",
  path: [ "time" ],
};

// ============================================================================
// Contact Form Schema (shared across all forms)
// ============================================================================

export const ContactFormSchema = z.object( {
  name: z.string().min( 2, "Name is required" ),
  email: z.email( "Valid email is required" ),
  phone: z.string().refine( value => value.trim().length === 0 || value.trim().length >= 10, "Enter a valid phone number" ),
  notes: z.string(),
  discountCode: z.string().trim().max( 32, "Discount code is too long" ),
  smsOptIn: z.boolean(),
  marketingSmsOptIn: z.boolean(),
} ).superRefine( ( input, ctx ) => {
  if ( ( input.smsOptIn || input.marketingSmsOptIn ) && !input.phone.trim() ) {
    ctx.addIssue( {
      code: "custom",
      path: [ "phone" ],
      message: "Enter a mobile phone number to receive text messages",
    } );
  }
  if ( input.phone.trim() && !input.smsOptIn && !input.marketingSmsOptIn ) {
    ctx.addIssue( {
      code: "custom",
      path: [ "smsOptIn" ],
      message: "Choose at least one text message preference or remove your phone number",
    } );
  }
} );

export type ContactFormData = z.infer<typeof ContactFormSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts TanStack Form field errors to a readable error string.
 * Handles both string errors and error objects with a `message` property.
 */
export function getFieldErrorMessage( errors: unknown ): string | undefined {
  if ( !errors ) return undefined;
  
  const errorArray = Array.isArray( errors ) ? errors : [ errors ];
  
  return errorArray
    .map( ( err ) => ( typeof err === "string" ? err : err?.message || String( err ) ) )
    .filter( Boolean )
    .join( ", " ) || undefined;
}

// ============================================================================
// Unified Booking Schema
// ============================================================================

// One form covers all three services. Every field always exists so switching
// service type never discards what the guest already typed; `serviceType`
// decides which of them are actually required.
export const bookingServiceTypes = [ "airport", "city", "hourly" ] as const;
export type BookingServiceType = typeof bookingServiceTypes[ number ];

export const UnifiedBookingSchema = z.object( {
  serviceType: z.enum( bookingServiceTypes ),
  pickupLocation: LocationSchema,
  dropoffLocation: z.string(),
  date: DateSchema,
  time: TimeSchema,
  passengers: PassengersSchema,
  luggage: z.string(),
  flightNumber: FlightNumberSchema,
  terminal: TerminalSchema,
  duration: z.string(),
} ).superRefine( ( data, ctx ) => {
  const requireWith = ( schema: z.ZodType, value: unknown, path: string ) => {
    const result = schema.safeParse( value );
    if ( !result.success ) {
      ctx.addIssue( { code: "custom", path: [ path ], message: result.error.issues[ 0 ].message } );
    }
  };

  if ( data.serviceType !== "hourly" ) {
    requireWith( LocationSchema, data.dropoffLocation, "dropoffLocation" );
  }

  if ( data.serviceType === "hourly" ) {
    requireWith( DurationSchema, data.duration.trim(), "duration" );
  }

  if ( !hasFuturePickup( data ) ) {
    ctx.addIssue( { code: "custom", path: [ "time" ], message: FuturePickupValidation.message } );
  }
} );

export type UnifiedBookingData = z.infer<typeof UnifiedBookingSchema>;

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate form data and return prettified errors
 */
export function validateFormData<T>( 
  schema: z.ZodSchema<T>, 
  data: unknown 
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse( data );
  
  if ( result.success ) {
    return { success: true, data: result.data };
  }
  
  // Convert Zod errors to a simple key-value object
  const errors: Record<string, string> = {};
  for ( const issue of result.error.issues ) {
    const key = issue.path.join( "." );
    if ( !errors[ key ] ) {
      errors[ key ] = issue.message;
    }
  }
  
  return { success: false, errors };
}

/**
 * Get first error message for a field
 */
export function getFieldError( 
  errors: Record<string, string> | undefined, 
  field: string 
): string | undefined {
  return errors?.[ field ];
}
