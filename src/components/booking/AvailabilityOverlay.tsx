'use client';

import { useState } from 'react';
import { Check, Clock3, Loader2, MapPin, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SuperField } from '@/components/ui/super-field';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getDateStringInTimeZone,
  getMinimumBookingDate,
} from '@/lib/booking-time';
import { toApiDate } from './forms/booking-flow/date';
import { BOOKING_SERVICES, HOURLY_RATE } from './forms/booking-flow/constants';
import './forms/booking-flow/booking-flow.css';
import './AvailabilityOverlay.css';

type AvailabilityOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onBook: () => void;
};
type AvailabilityResult = {
  available: boolean;
  alternativeSlots?: Array<{ date: string; time: string }>;
};
const durationOptions = ['1', '2', '3', '4', '5', '6', '8'];

function formatSlot(date: string, time: string) {
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
  const [hour, minute] = time.split(':').map(Number);
  const timeLabel = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour, minute));
  return `${dateLabel} · ${timeLabel}`;
}

export function AvailabilityOverlay({
  isOpen,
  onClose,
  onBook,
}: AvailabilityOverlayProps) {
  const [minimumDate, setMinimumDate] = useState<Date>();
  const [service, setService] = useState('airport');
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('1');
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const durationMinutes = service === 'hourly' ? Number(duration) * 60 : 60;

  const ensureMinimumDate = () => {
    const today = getDateStringInTimeZone(getMinimumBookingDate());
    const minimum = new Date(`${today}T00:00:00`);
    setMinimumDate(minimum);
    setDate((current) => current || minimum);
  };

  const reset = () => {
    setResult(null);
    setError('');
  };

  const checkAvailability = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsChecking(true);
    try {
      if (!date) throw new Error('Choose a date to check availability.');
      const params = new URLSearchParams({
        date: toApiDate(date),
        time,
        duration: String(durationMinutes),
      });
      const response = await fetch(`/api/booking?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(
          data.message || data.error || 'We could not check that time.',
        );
      setResult(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'We could not check that time.',
      );
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) ensureMinimumDate();
        else onClose();
      }}
    >
      <DialogContent className='availability-overlay' showCloseButton>
        <div className='vega-form booking-flow dark availability-overlay__panel'>
          <div className='availability-overlay__intro'>
            <div>
              <DialogTitle className='availability-overlay__title'>
                Check availability
              </DialogTitle>
              <DialogDescription className='availability-overlay__description'>
                Choose a service and preferred pickup time. We’ll confirm
                whether a chauffeur is available.
              </DialogDescription>
            </div>
          </div>

          <form
            onSubmit={checkAvailability}
            className='availability-overlay__form'
          >
            <Tabs
              value={service}
              onValueChange={(value) => {
                setService(value);
                reset();
              }}
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

            <div className='availability-overlay__fields'>
              <SuperField
                type='datepicker'
                label='Date'
                minDate={minimumDate}
                value={date}
                fieldClassName='h-12'
                onChange={(value) => {
                  setDate(value);
                  reset();
                }}
                required
              />
              <SuperField
                type='timepicker'
                label='Pickup time'
                value={time}
                fieldClassName='h-12'
                onChange={(event) => {
                  setTime(event.target.value);
                  reset();
                }}
                required
              />
            </div>

            {service === 'hourly' && (
              <SuperField
                type='select'
                label='Reserved hours'
                size='lg'
                fieldClassName='h-12'
                value={duration}
                onValueChange={(value) => {
                  setDuration(value || '');
                  reset();
                }}
                options={durationOptions.map((value) => ({
                  value,
                  label: `${value} ${value === '1' ? 'hour' : 'hours'} · $${(Number(value) * HOURLY_RATE).toLocaleString()}`,
                }))}
              />
            )}
            {error && (
              <p
                className='availability-overlay__message availability-overlay__message--error'
                role='alert'
              >
                {error}
              </p>
            )}

            {result && (
              <div
                className={`availability-overlay__result ${result.available ? 'is-available' : 'is-unavailable'}`}
                role='status'
              >
                <div
                  className='availability-overlay__result-icon'
                  aria-hidden='true'
                >
                  {result.available ? (
                    <Check size={22} strokeWidth={1.5} />
                  ) : (
                    <Clock3 size={22} strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <h2>
                    {result.available
                      ? 'Your preferred time is available'
                      : 'That time is already reserved'}
                  </h2>
                  <p>
                    {result.available
                      ? 'A chauffeur can be assigned for this service. Continue to reserve your ride.'
                      : 'Try one of these nearby pickup times, or choose another date.'}
                  </p>
                </div>
                {!result.available &&
                  result.alternativeSlots &&
                  result.alternativeSlots.length > 0 && (
                    <div className='availability-overlay__alternatives'>
                      {result.alternativeSlots.map((slot) => (
                        <button
                          key={`${slot.date}-${slot.time}`}
                          type='button'
                          onClick={() => {
                            setDate(new Date(`${slot.date}T00:00:00`));
                            setTime(slot.time);
                            reset();
                          }}
                        >
                          {formatSlot(slot.date, slot.time)}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            )}

            <div className='availability-overlay__actions'>
              <Button type='submit' disabled={isChecking}>
                {isChecking && <Loader2 className='animate-spin' size={16} />}
                {isChecking ? 'Checking…' : 'Check availability'}
              </Button>
              {result?.available && (
                <Button type='button' variant='outline' onClick={onBook}>
                  Continue to booking <span aria-hidden='true'>→</span>
                </Button>
              )}
              {result && (
                <Button type='button' variant='ghost' onClick={reset}>
                  <RotateCcw size={15} /> Start over
                </Button>
              )}
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
