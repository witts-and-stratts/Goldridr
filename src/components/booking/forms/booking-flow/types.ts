export type FlightDetails = {
  airline: string;
  departure: string;
  arrival: string;
  status: string;
  flightNumber: string;
  terminal: string;
  departureTerminal: string;
  gate: string;
  origin: string;
  destination: string;
  originAirport: string;
  destinationAirport: string;
  flightDate: string;
  scheduledDeparture: string | null;
  scheduledArrival: string | null;
};

export type DistanceData = {
  total_miles: number;
  duration_minutes: number;
  duration_text: string;
  price_per_mile: number;
  total_price: number;
};

export type HourlyData = {
  hours: number;
  rate: number;
  totalPrice: number;
};

export type BookingStep = 1 | 2 | 3;
