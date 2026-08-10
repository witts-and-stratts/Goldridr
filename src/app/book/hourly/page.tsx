import { BookingPageShell } from "@/components/booking/BookingPageShell";

export const metadata = {
  title: "Book an Hourly Charter | Goldridr",
  description:
    "Reserve a GoldRidrchauffeur by the hour in Houston. Optional SMS booking updates with clear opt-in and opt-out.",
  alternates: { canonical: "/book/hourly" },
};

export default function BookHourlyPage() {
  return <BookingPageShell service="hourly" />;
}
