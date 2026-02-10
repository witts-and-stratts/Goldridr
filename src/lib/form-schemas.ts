// Shared Zod v4 schemas for booking forms
import z from "zod/v4";

// ============================================================================
// Common Field Schemas
// ============================================================================

export const LocationSchema = z.string().min( 5, "Location is required (minimum 5 characters)" );

export const DateSchema = z.date().min( 1, "Date is required" );

export const TimeSchema = z.string().regex( /^(?:[01]\d|2[0-3]):[0-5]\d$/, {
  message: "Time is required",
} );

export const PassengersSchema = z.string().min( 1, "Number of passengers is required" );

export const FlightNumberSchema = z.string().min( 2, "Flight number is required" );

export const DurationSchema = z.string().min( 1, "Duration is required" );

// ============================================================================
// Contact Form Schema (shared across all forms)
// ============================================================================

export const ContactFormSchema = z.object( {
  name: z.string().min( 2, "Name is required" ),
  email: z.email( "Valid email is required" ),
  phone: z.string().min( 10, "Phone number is required" ),
  notes: z.string(),
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
// Airport Form Schema
// ============================================================================

export const AirportFormSchema = z.object( {
  flightNumber: FlightNumberSchema,
  passengers: PassengersSchema,
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  date: DateSchema,
  time: TimeSchema,
} );

export type AirportFormData = z.infer<typeof AirportFormSchema>;

// ============================================================================
// Town (City) Form Schema
// ============================================================================

export const TownFormSchema = z.object( {
  pickupLocation: LocationSchema,
  dropoffLocation: LocationSchema,
  date: DateSchema,
  time: TimeSchema,
} );

export type TownFormData = z.infer<typeof TownFormSchema>;

// ============================================================================
// Hourly Form Schema
// ============================================================================

export const HourlyFormSchema = z.object( {
  pickupLocation: LocationSchema,
  duration: DurationSchema,
  date: DateSchema,
  time: TimeSchema,
} );

export type HourlyFormData = z.infer<typeof HourlyFormSchema>;

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
