import { Button } from '@/components/ui/button';

import type { BookingStep } from './types';
import type { TripFormApi } from './use-booking-forms';

type BookingFlowActionsProps = {
  step: BookingStep;
  tripForm: TripFormApi;
  tripFormId: string;
  contactFormId: string;
  isSubmitting: boolean;
  onConfirm: () => void;
};

export function BookingFlowActions({
  step,
  tripForm,
  tripFormId,
  contactFormId,
  isSubmitting,
  onConfirm,
}: BookingFlowActionsProps) {
  if (step === 1) {
    return (
      <tripForm.Subscribe selector={(state) => state.isSubmitting}>
        {(submitting) => (
          <Button
            type='submit'
            form={tripFormId}
            disabled={submitting}
            className='booking-flow__footer-action'
          >
            Continue
          </Button>
        )}
      </tripForm.Subscribe>
    );
  }

  if (step === 2) {
    return (
      <Button
        type='submit'
        form={contactFormId}
        className='booking-flow__footer-action'
      >
        Continue
      </Button>
    );
  }

  return (
    <Button
      type='button'
      disabled={isSubmitting}
      onClick={onConfirm}
      className='booking-flow__footer-action'
    >
      {isSubmitting ? 'Processing booking…' : 'Confirm Booking'}
    </Button>
  );
}
