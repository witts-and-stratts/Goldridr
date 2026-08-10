import { notFound } from "next/navigation";
import { TestingDashboard } from "./testing-dashboard";

export default function TestingPage() {
  if ( process.env.NODE_ENV !== "development" ) notFound();

  return (
    <TestingDashboard
      mailpitUrl={ process.env.NEXT_PUBLIC_MAILPIT_UI_URL || process.env.MAILPIT_UI_URL || "http://localhost:8025" }
      emailTransport={ process.env.EMAIL_TRANSPORT || "smtp" }
      smsTransport={ process.env.TWILIO_TRANSPORT || "mock" }
    />
  );
}
