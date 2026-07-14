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
  vehicle?: { id: number } | null;
}
