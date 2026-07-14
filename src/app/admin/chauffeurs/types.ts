export interface Booking {
  id: number;
  reference: string;
  date: string;
  status: string;
  chauffeurId?: string | null;
  tripDetails: { estimatedTotal?: number; estimatedPrice?: number };
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year?: number | null;
  colour?: string | null;
  plate?: string | null;
  status: string;
}

export interface AdminChauffeur {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  avatarUrl?: string | null;
  vehicle?: Vehicle | null;
}
