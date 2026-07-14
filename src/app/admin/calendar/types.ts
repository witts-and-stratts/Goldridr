export interface BlockedSlot {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: string;
  chauffeurId?: string | null;
}
