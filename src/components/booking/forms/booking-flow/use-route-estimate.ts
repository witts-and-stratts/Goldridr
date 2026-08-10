import { useEffect, useState } from 'react';

import type { BookingServiceType } from '@/lib/form-schemas';

import type { DistanceData } from './types';

type RouteEstimateOptions = {
  serviceType: BookingServiceType;
  pickupLocation: string;
  dropoffLocation: string;
};

export function useRouteEstimate({
  serviceType,
  pickupLocation,
  dropoffLocation,
}: RouteEstimateOptions) {
  const [distanceData, setDistanceData] = useState<DistanceData | null>(null);
  const [isDistanceLoading, setIsDistanceLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    if (
      serviceType === 'hourly' ||
      pickupLocation.trim().length < 5 ||
      dropoffLocation.trim().length < 5
    ) {
      const resetTimer = setTimeout(() => {
        setDistanceData(null);
        setIsDistanceLoading(false);
      }, 0);

      return () => {
        clearTimeout(resetTimer);
        controller.abort();
      };
    }

    const lookupTimer = setTimeout(async () => {
      setIsDistanceLoading(true);
      const origin = encodeURIComponent(pickupLocation);
      const destination = encodeURIComponent(dropoffLocation);

      try {
        const response = await fetch(
          `/api/distance?origin=${origin}&destination=${destination}&type=${serviceType}`,
          { signal: controller.signal },
        );
        const distance = await response.json();

        if (distance.success) setDistanceData(distance);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to fetch route details:', error);
        }
      } finally {
        if (!controller.signal.aborted) setIsDistanceLoading(false);
      }
    }, 800);

    return () => {
      clearTimeout(lookupTimer);
      controller.abort();
    };
  }, [serviceType, pickupLocation, dropoffLocation]);

  return { distanceData, isDistanceLoading };
}
