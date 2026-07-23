export interface Booking {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: string;
  chauffeurId?: string | null;
  pin?: string | null;
  tripDetails: {
    pickupLocation?: string;
    dropoffLocation?: string;
    pickup?: string;
    destination?: string;
    flightNumber?: string;
    terminal?: string;
    passengers?: string | number;
    estimatedTotal?: number;
    estimatedPrice?: number;
    durationHours?: number;
    hourlyRate?: number;
    estimatedDistance?: string | number;
  };
  createdAt: string;
}
