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
  terminal: string | null;
  estimatedPrice: string | null;
  notes: string | null;
}

export type ScanState = "idle" | "scanning" | "loading" | "found" | "error";
