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
  return useForm({
    defaultValues: {
      serviceType: service,
      pickupLocation: '',
      dropoffLocation: '',
      date: new Date(),
      time: '',
      passengers: '2',
      luggage: '2',
      flightNumber: '',
      terminal: '',
      duration: '',
    } as UnifiedBookingData,
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
