import { BookingPageShell } from "@/components/booking/BookingPageShell";

export const metadata = {
  title: "Book a Ride | Goldridr",
  description:
    "Reserve a Goldridr chauffeured ride in Houston. Optional SMS booking updates with clear opt-in and opt-out.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return <BookingPageShell />;
}
