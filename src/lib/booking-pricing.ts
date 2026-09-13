import z from "zod/v4";

export const BookingPricingSchema = z.object( {
  totalCents: z.number().int().nonnegative().optional(),
  totalMiles: z.number().nonnegative().optional(),
  durationMinutes: z.number().int().positive().max( 24 * 60 ).optional(),
  pricePerMile: z.number().nonnegative().optional(),
} );

export type BookingPricingOverride = z.infer<typeof BookingPricingSchema>;
