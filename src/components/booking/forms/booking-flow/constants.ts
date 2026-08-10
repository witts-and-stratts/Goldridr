import type { BookingServiceType } from '@/lib/form-schemas';

export const BOOKING_SERVICES: {
  value: BookingServiceType;
  label: string;
}[] = [
  { value: 'airport', label: 'Airport Transfer' },
  { value: 'city', label: 'Around Town' },
  { value: 'hourly', label: 'By the Hour' },
];

export const HOURLY_RATE = 75;

export const BOOKING_STEP_TITLES = {
  1: 'Reserve Your Chauffeur',
  2: 'Your Details',
  3: 'Review & Confirm',
} as const;
