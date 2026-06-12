export interface Chauffeur {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface BlockedSlot {
  id: number;
  title: string;
  date: string;
  endDate?: string | null;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: "none" | "daily" | "weekly" | "weekends" | string;
  chauffeurId?: number | null;
}

export interface DriverRide {
  reference: string;
  status: string;
  tripType: string;
  date: string;
  time: string;
  duration: number;
  customerName: string;
  customerPhone: string | null;
  pickup: string | null;
  destination: string | null;
  passengers: string | null;
  flightNumber: string | null;
  estimatedPrice: string | null;
  notes: string | null;
}
