import { TestingDashboard } from "./testing-dashboard";

export default function TestingPage() {
  return (
    <TestingDashboard
      mailpitUrl={ process.env.NEXT_PUBLIC_MAILPIT_UI_URL || process.env.MAILPIT_UI_URL || "http://localhost:8025" }
      emailTransport={ process.env.EMAIL_TRANSPORT || "smtp" }
      smsTransport={ process.env.TWILIO_TRANSPORT || "mock" }
    />
  );
}
