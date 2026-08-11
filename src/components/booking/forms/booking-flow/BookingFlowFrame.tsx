import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BOOKING_STEP_TITLES } from './constants';
import type { BookingStep } from './types';
import './booking-flow.css';

type BookingFlowFrameProps = {
  step: BookingStep;
  onBack: () => void;
  onClose?: () => void;
  children: ReactNode;
  footer: ReactNode;
  routePreview: ReactNode;
};

export function BookingFlowFrame({
  step,
  onBack,
  onClose,
  children,
  footer,
  routePreview,
}: BookingFlowFrameProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className='vega-form booking-flow dark'
    >
      <div className='booking-flow__main'>
        <header className='booking-flow__header'>
          <div className='booking-flow__heading-row'>
            {step > 1 && (
              <Button
                type='button'
                size='icon-sm'
                onClick={onBack}
                aria-label='Return to the previous booking step'
                className='booking-flow__back'
              >
                <ChevronLeft strokeWidth={1} />
              </Button>
            )}

            <h2 className='booking-flow__title'>
              {BOOKING_STEP_TITLES[step]}
            </h2>
          </div>

          <div className='booking-flow__progress' aria-hidden>
            {([1, 2, 3] as const).map((index) => (
              <span
                key={index}
                className={cn(
                  'booking-flow__progress-segment',
                  index <= step && 'booking-flow__progress-segment--active',
                )}
              />
            ))}
          </div>
        </header>

        <div className={ cn( 'booking-flow__scroll-area', {'border': step == 3})}>{children}</div>
        <div className='booking-flow__footer'>{footer}</div>
      </div>

      {routePreview}
    </motion.div>
  );
}
