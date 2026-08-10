import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { resolveHoustonAirportDirection } from '@/lib/airports';
import type { FlightDirection } from '@/lib/flights/types';

import { toApiDate } from './date';
import type { FlightDetails } from './types';
import type { TripFormApi } from './use-booking-forms';

export function useFlightDetails(form: TripFormApi) {
  const [flightDetails, setFlightDetails] = useState<FlightDetails | null>(null);
  const [isFlightLoading, setIsFlightLoading] = useState(false);
  const [tripDirection, setTripDirection] = useState<FlightDirection | null>(
    null,
  );
  const manualTripDirectionRef = useRef<FlightDirection | null>(null);

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
        const arrivalDate = new Date(details.scheduledArrival);
        form.setFieldValue('date', arrivalDate);
        form.setFieldValue(
          'time',
          arrivalDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
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
      const pickupDate = new Date(details.scheduledDeparture);
      pickupDate.setHours(pickupDate.getHours() - 2);
      form.setFieldValue('date', pickupDate);
      form.setFieldValue(
        'time',
        pickupDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
      );
    }
  };

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
