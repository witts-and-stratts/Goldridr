// Booking data types

export interface BookingAttendee {
  name: string;
  email: string;
  timeZone: string;
}

export interface BookingResponses {
  pickup?: string;
  destination?: string;
  booking_type?: string;
  estimated_distance?: string;
  estimated_price?: string;
  estimated_total?: string;
  passengers?: string;
  flight_number?: string;
  duration?: string;
  notes?: string;
  booking_reference?: string;
}

export interface BookingData {
  uid: string;
  reference: string;
  status: string;
  title: string;
  start: string;
  end: string;
  attendees: BookingAttendee[];
  responses: BookingResponses;
  metadata: Record<string, unknown>;
}
