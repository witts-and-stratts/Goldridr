export interface DashboardBooking {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  name: string;
  email: string;
  status: string;
  chauffeurId?: string | null;
  tripDetails: {
    estimatedTotal?: number;
    estimatedPrice?: number;
    pickupLocation?: string;
    pickup?: string;
  };
  createdAt: string;
}
