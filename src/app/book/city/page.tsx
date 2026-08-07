import { BookingPageShell } from "@/components/booking/BookingPageShell";

export const metadata = {
  title: "Book an Around Town Ride | Goldridr",
  description:
    "Reserve a Goldridr ride around Houston. Optional SMS booking updates with clear opt-in and opt-out.",
  alternates: { canonical: "/book/city" },
};

export default function BookCityPage() {
  return <BookingPageShell service="city" />;
}
