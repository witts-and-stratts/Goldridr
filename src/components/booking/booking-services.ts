// Shared by both server components (route metadata, static params) and client
// components, so this module must stay free of "use client" — otherwise the server
// receives client reference proxies instead of these values.

// The URL segment for the "around town" flow is "city" so that booking URLs line up
// with the tripType stored on the booking record.
export const bookingServiceSlugs = [ "airport", "city", "hourly" ] as const;
export type BookingServiceSlug = typeof bookingServiceSlugs[ number ];
export type BookingView = "options" | BookingServiceSlug;

export function isBookingServiceSlug( value: string | undefined ): value is BookingServiceSlug {
  return bookingServiceSlugs.includes( value as BookingServiceSlug );
}
