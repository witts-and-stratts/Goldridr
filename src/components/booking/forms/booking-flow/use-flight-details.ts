import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { resolveHoustonAirportDirection } from '@/lib/airports';
import type { FlightDirection } from '@/lib/flights/types';

import { toApiDate } from './date';
import type { FlightDetails } from './types';
import type { TripFormApi } from './use-booking-forms';

type AirportTiming = {
  pickupOffsetMinutes: number;
  dropoffOffsetMinutes: number;
};

const DEFAULT_AIRPORT_TIMING: AirportTiming = {
  pickupOffsetMinutes: 0,
  dropoffOffsetMinutes: 120,
};

export function useFlightDetails(
  form: TripFormApi,
  travelMinutes: number | null = null,
) {
  const [flightDetails, setFlightDetails] = useState<FlightDetails | null>(null);
  const timingRef = useRef<AirportTiming>(DEFAULT_AIRPORT_TIMING);
  const [isFlightLoading, setIsFlightLoading] = useState(false);
  const [tripDirection, setTripDirection] = useState<FlightDirection | null>(
    null,
  );
  const manualTripDirectionRef = useRef<FlightDirection | null>(null);

  const setPickupDateTime = (pickupDate: Date) => {
    form.setFieldValue('date', pickupDate);
    form.setFieldValue(
      'time',
      pickupDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    );
  };

  const applyDropoffPickupTime = (scheduledDeparture: string) => {
    const leadMinutes =
      timingRef.current.dropoffOffsetMinutes + (travelMinutes ?? 0);
    setPickupDateTime(
      new Date(new Date(scheduledDeparture).getTime() - leadMinutes * 60_000),
    );
  };

  const applyFlightDirection = (
    details: FlightDetails,
    direction: FlightDirection,
  ) => {
    if (direction === 'from_airport') {
      if (
        details.originAirport &&
        form.state.values.dropoffLocation === details.originAirport
      ) {
        form.setFieldValue('dropoffLocation', '');
      }
      if (details.destinationAirport) {
        form.setFieldValue('pickupLocation', details.destinationAirport);
      }
      if (details.terminal !== '-') {
        form.setFieldValue('terminal', details.terminal);
      }
      if (details.scheduledArrival) {
        setPickupDateTime(
          new Date(
            new Date(details.scheduledArrival).getTime() +
              timingRef.current.pickupOffsetMinutes * 60_000,
          ),
        );
      }
      return;
    }

    if (
      details.destinationAirport &&
      form.state.values.pickupLocation === details.destinationAirport
    ) {
      form.setFieldValue('pickupLocation', '');
    }
    if (details.originAirport) {
      form.setFieldValue('dropoffLocation', details.originAirport);
    }
    if (details.departureTerminal !== '-') {
      form.setFieldValue('terminal', details.departureTerminal);
    }
    if (details.scheduledDeparture) {
      applyDropoffPickupTime(details.scheduledDeparture);
    }
  };

  const scheduledDeparture =
    tripDirection === 'to_airport' ? flightDetails?.scheduledDeparture : null;

  // Travel time arrives after the airport is filled in as the drop-off, so re-derive the pickup once the route estimate lands.
  useEffect(() => {
    if (scheduledDeparture && travelMinutes !== null) {
      applyDropoffPickupTime(scheduledDeparture);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelMinutes, scheduledDeparture]);

  const selectTripDirection = (direction: FlightDirection) => {
    manualTripDirectionRef.current = direction;
    setTripDirection(direction);
    if (flightDetails) applyFlightDirection(flightDetails, direction);
  };

  const resetFlightDetails = () => {
    setFlightDetails(null);
    if (!manualTripDirectionRef.current) setTripDirection(null);
  };

  const fetchFlightDetails = async () => {
    const flightNumber = form.state.values.flightNumber
      .replaceAll(' ', '')
      .toUpperCase();
    if (flightNumber.length < 3) {
      setFlightDetails(null);
      toast.error('Enter a valid flight number first.');
      return;
    }
    if (!manualTripDirectionRef.current) setTripDirection(null);
    setIsFlightLoading(true);

    try {
      const response = await fetch('/api/flights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flightIata: flightNumber,
          flightDate: toApiDate(new Date(form.state.values.date)),
          direction: manualTripDirectionRef.current,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.flight) {
        setFlightDetails(null);
        toast.info(
          result.error ||
            'Flight details are unavailable. Enter the terminal manually.',
        );
        return;
      }

      const data = result.flight;
      if (result.timing) timingRef.current = result.timing;
      const resolvedDirection = resolveHoustonAirportDirection(
        manualTripDirectionRef.current,
        data.origin?.iata,
        data.destination?.iata,
      );

      if (!manualTripDirectionRef.current) {
        setTripDirection(resolvedDirection);
      }

      let departureTime = '--:--';
      let arrivalTime = '--:--';
      let displayFlightDate = '';

      if (data.scheduled?.departure) {
        const departureDate = new Date(data.scheduled.departure);
        departureTime = departureDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        displayFlightDate = departureDate.toLocaleDateString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      if (data.scheduled?.arrival) {
        arrivalTime = new Date(data.scheduled.arrival).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
      }

      const nextFlightDetails: FlightDetails = {
        airline: data.airline || 'Unknown Airline',
        departure: departureTime,
        arrival: arrivalTime,
        status: data.status
          ? data.status.charAt(0).toUpperCase() + data.status.slice(1)
          : 'Scheduled',
        flightNumber: data.flightIata || flightNumber,
        terminal: data.terminal?.arrival || '-',
        departureTerminal: data.terminal?.departure || '-',
        gate: data.gate?.arrival || '-',
        origin: data.origin?.iata || 'UNK',
        destination: data.destination?.iata || 'UNK',
        originAirport: data.origin?.name || '',
        destinationAirport: data.destination?.name || '',
        flightDate: displayFlightDate,
        scheduledDeparture: data.scheduled?.departure || null,
        scheduledArrival: data.scheduled?.arrival || null,
      };
      setFlightDetails(nextFlightDetails);

      if (resolvedDirection) {
        applyFlightDirection(nextFlightDetails, resolvedDirection);
      } else {
        toast.info(
          "We found the flight, but couldn't determine whether your Houston journey is a pickup or drop-off. Choose one to continue.",
        );
      }
    } catch {
      setFlightDetails(null);
      toast.info(
        'Flight details are unavailable. Enter the terminal manually.',
      );
    } finally {
      setIsFlightLoading(false);
    }
  };

  return {
    flightDetails,
    isFlightLoading,
    tripDirection,
    selectTripDirection,
    resetFlightDetails,
    fetchFlightDetails,
  };
}
