'use client';

import { Activity, useId, useState } from 'react';
import { useSelector } from '@tanstack/react-form';
import { toast } from 'sonner';

import { RoutePreview } from '@/components/booking/RoutePreview';
import { showBookingErrorToast } from '@/components/booking/booking-errors';
import { SMS_CONSENT_VERSION } from '@/lib/sms-consent-copy';
import type { BookingServiceType } from '@/lib/form-schemas';

import { BookingFlowActions } from './booking-flow/BookingFlowActions';
import { BookingFlowFrame } from './booking-flow/BookingFlowFrame';
import { BookingReviewStep } from './booking-flow/BookingReviewStep';
import { ContactDetailsStep } from './booking-flow/ContactDetailsStep';
import { HOURLY_RATE } from './booking-flow/constants';
import { toApiDate } from './booking-flow/date';
import { TripDetailsStep } from './booking-flow/TripDetailsStep';
import type { BookingStep } from './booking-flow/types';
import {
  useContactForm,
  useTripForm,
} from './booking-flow/use-booking-forms';
import { useFlightDetails } from './booking-flow/use-flight-details';
import { useRouteEstimate } from './booking-flow/use-route-estimate';

interface UnifiedBookingFormProps {
  service?: BookingServiceType;
  onServiceChange?: (service: BookingServiceType) => void;
  onClose?: () => void;
  onSuccess: () => void;
}

export function UnifiedBookingForm({
  service = 'airport',
  onServiceChange,
  onClose,
  onSuccess,
}: UnifiedBookingFormProps) {
  const instanceId = useId();
  const tripFormId = `trip-form-${instanceId}`;
  const contactFormId = `contact-form-${instanceId}`;

  const [step, setStep] = useState<BookingStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useTripForm({
    service,
    onSubmit: () => setStep(2),
  });
  const contactForm = useContactForm(() => setStep(3));
  const {
    flightDetails,
    isFlightLoading,
    tripDirection,
    selectTripDirection,
    resetFlightDetails,
    fetchFlightDetails,
  } = useFlightDetails(form);

  const serviceType = useSelector(
    form.store,
    (state) => state.values.serviceType,
  );
  const pickupLocation = useSelector(
    form.store,
    (state) => state.values.pickupLocation,
  );
  const dropoffLocation = useSelector(
    form.store,
    (state) => state.values.dropoffLocation,
  );
  const durationValue = useSelector(
    form.store,
    (state) => state.values.duration,
  );
  const terminalValue = useSelector(
    form.store,
    (state) => state.values.terminal,
  );
  const flightNumberValue = useSelector(
    form.store,
    (state) => state.values.flightNumber,
  );
  const { distanceData, isDistanceLoading } = useRouteEstimate({
    serviceType,
    pickupLocation,
    dropoffLocation,
  });

  const selectService = (next: BookingServiceType) => {
    form.setFieldValue('serviceType', next);
    onServiceChange?.(next);
  };

  const hourlyHours = durationValue ? Number.parseInt(durationValue, 10) : null;
  const hourlyData =
    serviceType === 'hourly' && hourlyHours
      ? {
          hours: hourlyHours,
          rate: HOURLY_RATE,
          totalPrice: hourlyHours * HOURLY_RATE,
        }
      : undefined;

  const submitBooking = async () => {
    const contact = contactForm.state.values;
    const values = form.state.values;
    setIsSubmitting(true);
    toast.loading('Processing your booking...');

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: toApiDate(new Date(values.date)),
          time: values.time,
          duration:
            serviceType === 'hourly'
              ? (hourlyHours ?? 1) * 60
              : distanceData?.duration_minutes || 60,
          attendee: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
          },
          notes: contact.notes,
          discountCode: contact.discountCode?.trim() || undefined,
          smsOptIn: contact.smsOptIn,
          marketingSmsOptIn: contact.marketingSmsOptIn,
          smsConsentVersion: SMS_CONSENT_VERSION,
          tripType: serviceType,
          tripDetails: {
            pickupLocation: values.pickupLocation,
            dropoffLocation:
              serviceType === 'hourly' ? undefined : values.dropoffLocation,
            passengers: values.passengers,
            luggage: values.luggage,
            flightNumber:
              serviceType === 'airport' ? values.flightNumber : undefined,
            terminal: serviceType === 'airport' ? values.terminal : undefined,
            tripDirection:
              serviceType === 'airport' ? tripDirection : undefined,
            flightDetails:
              serviceType === 'airport' && flightDetails
                ? {
                    airline: flightDetails.airline,
                    departure: flightDetails.departure,
                    arrival: flightDetails.arrival,
                    flightNumber: flightDetails.flightNumber,
                    origin: flightDetails.origin,
                    destination: flightDetails.destination,
                  }
                : undefined,
            hours:
              serviceType === 'hourly' ? (hourlyHours ?? undefined) : undefined,
            estimatedPrice: hourlyData?.totalPrice ?? distanceData?.total_price,
            estimatedDistance: distanceData?.total_miles,
            estimatedDuration: distanceData?.duration_text,
            estimatedDurationMinutes: distanceData?.duration_minutes,
          },
        }),
      });

      const data = await response.json();
      toast.dismiss();

      if (data.success) {
        toast.success('Booking confirmed!', {
          description: `Your booking reference is ${data.booking?.reference || ''}. We'll send you a confirmation email shortly.`,
        });
        onSuccess();
      } else {
        showBookingErrorToast(data, (slot) => {
          form.setFieldValue('date', new Date(`${slot.date}T00:00:00`));
          form.setFieldValue('time', slot.time);
          setStep(1);
        });
      }
    } catch {
      toast.dismiss();
      toast.error('Booking failed', {
        description: 'An unexpected error occurred. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BookingFlowFrame
      step={step}
      onBack={() =>
        setStep((current) => (current - 1) as BookingStep)
      }
      onClose={onClose}
      footer={
        <BookingFlowActions
          step={step}
          tripForm={form}
          tripFormId={tripFormId}
          contactFormId={contactFormId}
          isSubmitting={isSubmitting}
          onConfirm={submitBooking}
        />
      }
      routePreview={
        <RoutePreview
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          serviceType={serviceType}
          distanceData={distanceData}
          hourlyHours={hourlyHours}
          flightDetails={
            serviceType === 'airport' && !isFlightLoading
              ? flightDetails
              : null
          }
          terminal={terminalValue}
          isLoading={isDistanceLoading}
        />
      }
    >
      <Activity mode={step === 1 ? 'visible' : 'hidden'}>
        <TripDetailsStep
          form={form}
          formId={tripFormId}
          serviceType={serviceType}
          tripDirection={tripDirection}
          isFlightLoading={isFlightLoading}
          flightNumberValue={flightNumberValue}
          onServiceChange={selectService}
          onTripDirectionChange={selectTripDirection}
          onFlightNumberChange={resetFlightDetails}
          onDateChange={(value, currentValue) => {
            form.setFieldValue('date', value ?? currentValue);
            if (serviceType === 'airport') resetFlightDetails();
          }}
          onFlightLookup={fetchFlightDetails}
          onSubmit={() => {
            if (serviceType === 'airport' && !tripDirection) {
              toast.error('Choose airport pickup or airport drop-off.');
              return;
            }
            form.handleSubmit();
          }}
        />
      </Activity>

      <Activity mode={step === 2 ? 'visible' : 'hidden'}>
        <ContactDetailsStep form={contactForm} formId={contactFormId} />
      </Activity>

      <Activity mode={step === 3 ? 'visible' : 'hidden'}>
        <BookingReviewStep
          serviceType={serviceType}
          bookingData={form.state.values}
          distanceData={distanceData}
          hourlyData={hourlyData}
          flightDetails={flightDetails}
          isDistanceLoading={isDistanceLoading}
        />
      </Activity>
    </BookingFlowFrame>
  );
}
