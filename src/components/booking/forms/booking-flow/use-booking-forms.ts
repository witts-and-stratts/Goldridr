import { useMemo, useState } from 'react';
import { useForm } from '@tanstack/react-form';

import {
  ContactFormSchema,
  UnifiedBookingSchema,
  type BookingServiceType,
  type UnifiedBookingData,
} from '@/lib/form-schemas';

type UseTripFormOptions = {
  service: BookingServiceType;
  onSubmit: () => void;
};

export function useTripForm({ service, onSubmit }: UseTripFormOptions) {
  // useForm re-applies its options whenever defaultValues changes identity, so
  // fresh Date objects on every render would update the store in a loop.
  const [today] = useState(() => new Date());
  const defaultValues = useMemo(
    () =>
      ({
        serviceType: service,
        pickupLocation: '',
        dropoffLocation: '',
        date: today,
        time: '',
        passengers: '2',
        luggage: '2',
        flightNumber: '',
        terminal: '',
        duration: '',
        roundTrip: false,
        returnDate: today,
        returnTime: '',
        returnFlightNumber: '',
      }) as UnifiedBookingData,
    [service, today],
  );

  return useForm({
    defaultValues,
    validators: {
      onSubmit: UnifiedBookingSchema,
    },
    onSubmit: async () => onSubmit(),
  });
}

export function useContactForm(onSubmit: () => void) {
  return useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      notes: '',
      discountCode: '',
      smsOptIn: false,
      marketingSmsOptIn: false,
    },
    validators: {
      onSubmit: ContactFormSchema,
    },
    onSubmit: async () => onSubmit(),
  });
}

export type TripFormApi = ReturnType<typeof useTripForm>;
export type ContactFormApi = ReturnType<typeof useContactForm>;
