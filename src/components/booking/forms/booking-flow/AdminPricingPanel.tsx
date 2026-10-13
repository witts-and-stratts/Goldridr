'use client';

import { useEffect, useRef, useState } from 'react';

import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import type { BookingPricingOverride } from '@/lib/booking-pricing';
import type { BookingServiceType } from '@/lib/form-schemas';

import type { DistanceData, HourlyData } from './types';

type AdminPricingPanelProps = {
  serviceType: BookingServiceType;
  distanceData: DistanceData | null;
  hourlyData?: HourlyData;
  onChange: ( pricing: BookingPricingOverride ) => void;
};

type PricingField = 'total' | 'distance' | 'duration' | 'rate';

const MAX_DURATION_MINUTES = 24 * 60;

export function AdminPricingPanel( {
  serviceType,
  distanceData,
  hourlyData,
  onChange,
}: AdminPricingPanelProps ) {
  const isHourly = serviceType === 'hourly';

  const autoTotal = isHourly
    ? hourlyData
      ? hourlyData.totalPrice.toFixed( 2 )
      : ''
    : distanceData
      ? distanceData.total_price.toFixed( 2 )
      : '';
  const autoDistance = distanceData ? String( distanceData.total_miles ) : '';
  const autoDuration = isHourly
    ? hourlyData
      ? String( hourlyData.hours * 60 )
      : ''
    : distanceData
      ? String( distanceData.duration_minutes )
      : '';
  const autoRate = isHourly
    ? hourlyData
      ? String( hourlyData.rate )
      : ''
    : distanceData
      ? String( distanceData.price_per_mile )
      : '';

  const [ values, setValues ] = useState( () => ( {
    total: autoTotal,
    distance: autoDistance,
    duration: autoDuration,
    rate: autoRate,
  } ) );
  const dirty = useRef<Record<PricingField, boolean>>( {
    total: false,
    distance: false,
    duration: false,
    rate: false,
  } );

  useEffect( () => {
    setValues( ( prev ) => ( {
      total: dirty.current.total ? prev.total : autoTotal,
      distance: dirty.current.distance ? prev.distance : autoDistance,
      duration: dirty.current.duration ? prev.duration : autoDuration,
      rate: dirty.current.rate ? prev.rate : autoRate,
    } ) );
  }, [ autoTotal, autoDistance, autoDuration, autoRate ] );

  useEffect( () => {
    const pricing: BookingPricingOverride = {};
    const total = Number( values.total );
    const distance = Number( values.distance );
    const duration = Number( values.duration );
    const rate = Number( values.rate );

    if ( values.total.trim() && Number.isFinite( total ) && total >= 0 ) {
      pricing.totalCents = Math.round( total * 100 );
    }
    if ( !isHourly && values.distance.trim() && Number.isFinite( distance ) && distance >= 0 ) {
      pricing.totalMiles = distance;
    }
    if ( values.duration.trim() && Number.isFinite( duration ) && duration > 0 ) {
      pricing.durationMinutes = Math.min( MAX_DURATION_MINUTES, Math.round( duration ) );
    }
    if ( !isHourly && values.rate.trim() && Number.isFinite( rate ) && rate >= 0 ) {
      pricing.pricePerMile = rate;
    }

    onChange( pricing );
  }, [ values, isHourly, onChange ] );

  const setField = ( key: PricingField, value: string ) => {
    dirty.current[ key ] = true;
    setValues( ( prev ) => {
      const next = { ...prev, [ key ]: value };

      if ( key === 'rate' || key === 'distance' || key === 'duration' ) {
        const rate = Number( key === 'rate' ? value : next.rate );
        const basis = isHourly ? Number( next.duration ) / 60 : Number( next.distance );
        if ( Number.isFinite( rate ) && Number.isFinite( basis ) && rate > 0 && basis > 0 ) {
          next.total = ( rate * basis ).toFixed( 2 );
          dirty.current.total = true;
        }
      }

      return next;
    } );
  };

  return (
    <div className='m-4 mt-0 rounded-md border border-white/10 bg-black/40 p-4 text-white'>
      <p className='mb-3 text-[10px] uppercase tracking-[0.25em] text-white/50'>
        Manual pricing override
      </p>
      <div className='grid grid-cols-2 gap-3'>
        { !isHourly && (
          <Field>
            <FieldLabel htmlFor='admin-pricing-distance'>Distance (miles)</FieldLabel>
            <Input
              id='admin-pricing-distance'
              type='number'
              min={0}
              step='0.1'
              value={values.distance}
              onChange={( event ) => setField( 'distance', event.target.value )}
            />
          </Field>
        ) }
        <Field>
          <FieldLabel htmlFor='admin-pricing-duration'>Duration (minutes)</FieldLabel>
          <Input
            id='admin-pricing-duration'
            type='number'
            min={1}
            max={MAX_DURATION_MINUTES}
            step='1'
            value={values.duration}
            onChange={( event ) => setField( 'duration', event.target.value )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='admin-pricing-rate'>
            { isHourly ? 'Hourly rate ($)' : 'Price per mile ($)' }
          </FieldLabel>
          <Input
            id='admin-pricing-rate'
            type='number'
            min={0}
            step='0.01'
            value={values.rate}
            onChange={( event ) => setField( 'rate', event.target.value )}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor='admin-pricing-total'>Total price ($)</FieldLabel>
          <Input
            id='admin-pricing-total'
            type='number'
            min={0}
            step='0.01'
            value={values.total}
            onChange={( event ) => setField( 'total', event.target.value )}
          />
        </Field>
      </div>
    </div>
  );
}
