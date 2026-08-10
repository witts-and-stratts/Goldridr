import { BookingSummary } from '@/components/booking/BookingSummary';
import type {
  BookingServiceType,
  UnifiedBookingData,
} from '@/lib/form-schemas';

import type { DistanceData, FlightDetails, HourlyData } from './types';

type BookingReviewStepProps = {
  serviceType: BookingServiceType;
  bookingData: UnifiedBookingData;
  distanceData: DistanceData | null;
  hourlyData?: HourlyData;
  flightDetails: FlightDetails | null;
  isDistanceLoading: boolean;
};

export function BookingReviewStep({
  serviceType,
  bookingData,
  distanceData,
  hourlyData,
  flightDetails,
  isDistanceLoading,
}: BookingReviewStepProps) {
  return (
    <BookingSummary
      bookingType={serviceType === 'city' ? 'town' : serviceType}
      bookingData={bookingData}
      distanceData={distanceData}
      hourlyData={hourlyData}
      flightDetails={serviceType === 'airport' ? flightDetails : null}
      isDistanceLoading={isDistanceLoading}
    />
  );
}
