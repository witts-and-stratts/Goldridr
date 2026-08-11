import { Activity } from 'react';
import { Loader2, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SuperField } from '@/components/ui/super-field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getMinimumBookingDate } from '@/lib/booking-time';
import {
  getFieldErrorMessage,
  type BookingServiceType,
} from '@/lib/form-schemas';
import type { FlightDirection } from '@/lib/flights/types';

import { BOOKING_SERVICES, HOURLY_RATE } from './constants';
import type { TripFormApi } from './use-booking-forms';

type TripDetailsStepProps = {
  form: TripFormApi;
  formId: string;
  serviceType: BookingServiceType;
  tripDirection: FlightDirection | null;
  isFlightLoading: boolean;
  flightNumberValue: string;
  onServiceChange: (service: BookingServiceType) => void;
  onTripDirectionChange: (direction: FlightDirection) => void;
  onFlightNumberChange: (value: string) => void;
  onDateChange: (value: Date | null | undefined, currentValue: Date) => void;
  onFlightLookup: () => void;
  onSubmit: () => void;
};

export function TripDetailsStep({
  form,
  formId,
  serviceType,
  tripDirection,
  isFlightLoading,
  flightNumberValue,
  onServiceChange,
  onTripDirectionChange,
  onFlightNumberChange,
  onDateChange,
  onFlightLookup,
  onSubmit,
}: TripDetailsStepProps) {
  return (
    <form
      id={formId}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSubmit();
      }}
      className='booking-flow__trip-form'
    >
      <Tabs
        value={serviceType}
        onValueChange={(value) =>
          onServiceChange(value as BookingServiceType)
        }
        className='booking-flow__service-tabs-sticky'
      >
        <TabsList activateOnFocus className='booking-flow__service-tabs'>
          {BOOKING_SERVICES.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className='booking-flow__service-tab'
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Activity mode={serviceType === 'airport' ? 'visible' : 'hidden'}>
        <div className='booking-flow__airport-section'>
          <fieldset className='booking-flow__airport-fieldset'>
            <legend className='booking-flow__airport-legend'>
              Airport journey
            </legend>
            <div className='booking-flow__direction-grid'>
              <Button
                type='button'
                variant={tripDirection === 'from_airport' ? 'default' : 'outline'}
                onClick={() => onTripDirectionChange('from_airport')}
                className='booking-flow__direction-button'
              >
                Airport pickup
              </Button>
              <Button
                type='button'
                variant={tripDirection === 'to_airport' ? 'default' : 'outline'}
                onClick={() => onTripDirectionChange('to_airport')}
                className='booking-flow__direction-button'
              >
                Airport drop-off
              </Button>
            </div>
          </fieldset>

          <div className='booking-flow__flight-grid'>
            <form.Field name='flightNumber'>
              {(field) => {
                const error = getFieldErrorMessage(field.state.meta.errors);

                return (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Flight No. (Optional)
                    </FieldLabel>
                    <Input
                      id={field.name}
                      placeholder='UA 1476'
                      value={field.state.value}
                      onChange={(event) => {
                        const value = event.target.value.replaceAll(' ', '');
                        field.handleChange(value);
                        onFlightNumberChange(value);
                      }}
                      onBlur={field.handleBlur}
                      className={
                        error ? 'booking-flow__field--error' : undefined
                      }
                    />
                    {error && (
                      <FieldError className='booking-flow__field-error'>
                        {error}
                      </FieldError>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name='terminal'>
              {(field) => (
                <SuperField
                  type='text'
                  id={field.name}
                  label='Terminal (Optional)'
                  placeholder='IAH — Terminal C'
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  error={getFieldErrorMessage(field.state.meta.errors)}
                />
              )}
            </form.Field>

            <div className='booking-flow__flight-lookup'>
              <Button
                type='button'
                variant='outline'
                className='booking-flow__full-width'
                disabled={
                  isFlightLoading ||
                  flightNumberValue.replaceAll(' ', '').length < 3
                }
                onClick={onFlightLookup}
              >
                {isFlightLoading && (
                  <Loader2 className='booking-flow__spinner' />
                )}
                {isFlightLoading ? 'Looking up flight' : 'Look up flight'}
              </Button>
            </div>
          </div>
          <Separator />
        </div>
      </Activity>

      <form.Field name='pickupLocation'>
        {(field) => (
          <SuperField
            type='location'
            id={field.name}
            label='Pickup'
            placeholder='Address, hotel or airport'
            value={field.state.value}
            onChange={field.handleChange}
            onBlur={field.handleBlur}
            error={getFieldErrorMessage(field.state.meta.errors)}
            suffix={<MapPin strokeWidth={1} />}
          />
        )}
      </form.Field>

      <Activity mode={serviceType !== 'hourly' ? 'visible' : 'hidden'}>
        <form.Field name='dropoffLocation'>
          {(field) => (
            <SuperField
              type='location'
              id={field.name}
              label='Drop-off'
              placeholder='Where are we taking you?'
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={getFieldErrorMessage(field.state.meta.errors)}
              suffix={<MapPin strokeWidth={1} />}
            />
          )}
        </form.Field>
      </Activity>

      <div className='booking-flow__two-column-grid'>
        <form.Field name='date'>
          {(field) => (
            <SuperField
              type='datepicker'
              id={field.name}
              label='Date'
              minDate={getMinimumBookingDate()}
              value={field.state.value}
              onChange={(value) => onDateChange(value, field.state.value)}
              onBlur={field.handleBlur}
              error={getFieldErrorMessage(field.state.meta.errors)}
              className='booking-flow__field--compact'
              fieldClassName='booking-flow__date-field'
            />
          )}
        </form.Field>

        <form.Field name='time'>
          {(field) => (
            <SuperField
              type='timepicker'
              label='Time'
              name={field.name}
              value={field.state.value}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                field.handleChange(event.target.value)
              }
              onBlur={field.handleBlur}
              placeholder='HH:MM'
              error={getFieldErrorMessage(field.state.meta.errors)}
              className='booking-flow__field--compact'
            />
          )}
        </form.Field>
      </div>

      <Activity mode={serviceType === 'hourly' ? 'visible' : 'hidden'}>
        <form.Field name='duration'>
          {(field) => (
            <SuperField
              type='select'
              id={field.name}
              label='Duration'
              size='lg'
              placeholder='Select duration'
              value={field.state.value}
              onValueChange={(value: string | null) =>
                field.handleChange(value || '')
              }
              onBlur={field.handleBlur}
              error={getFieldErrorMessage(field.state.meta.errors)}
              options={[2, 3, 4, 5, 6, 8, 10, 12].map((hours) => ({
                value: hours.toString(),
                label: `${hours} hours — $${hours * HOURLY_RATE}`,
              }))}
            />
          )}
        </form.Field>
      </Activity>

      <div className='booking-flow__two-column-grid'>
        <form.Field name='passengers'>
          {(field) => (
            <SuperField
              type='number'
              id={field.name}
              label='Passengers'
              min={1}
              max={12}
              inputMode='numeric'
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              error={getFieldErrorMessage(field.state.meta.errors)}
              className='booking-flow__field--compact'
            />
          )}
        </form.Field>

        <form.Field name='luggage'>
          {(field) => (
            <SuperField
              type='number'
              id={field.name}
              label='Luggage'
              min={0}
              max={12}
              inputMode='numeric'
              value={field.state.value}
              onChange={(event) => field.handleChange(event.target.value)}
              onBlur={field.handleBlur}
              error={getFieldErrorMessage(field.state.meta.errors)}
              className='booking-flow__field--compact'
            />
          )}
        </form.Field>
      </div>
    </form>
  );
}
