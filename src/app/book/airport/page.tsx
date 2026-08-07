import { BookingPageShell } from "@/components/booking/BookingPageShell";

export const metadata = {
  title: "Book an Airport Ride | Goldridr",
  description:
    "Reserve a Goldridr airport transfer in Houston. Optional SMS booking updates with clear opt-in and opt-out.",
  alternates: { canonical: "/book/airport" },
};

export default function BookAirportPage() {
  return <BookingPageShell service="airport" />;
}
