import React from "react";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

export const metadata = {
  title: "Terms of Service | Goldridr",
  description:
    "Goldridr terms of service, including the terms of our SMS messaging programme.",
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen text-white selection:bg-gold/30 relative mt-20">
        <div className="container mx-auto px-4 pt-32 pb-16">
          <h1 className="site-heading mb-4 text-center">
            Terms of <span className="text-gold">Service</span>
          </h1>
          <p className="site-copy mx-auto mb-12 text-center text-gray-400">
            Last updated: 5 August 2026
          </p>

          <div className="mx-auto max-w-3xl space-y-8 text-gray-300 leading-7">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                1. Our service
              </h2>
              <p>
                Goldridr provides pre-scheduled private chauffeur transportation in
                Houston, Texas and interstate rides within the state of Texas. By booking
                a ride you agree to these terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. Bookings, payment and cancellation
              </h2>
              <p>
                All rides are pre-scheduled and paid before service. Rides may be
                cancelled free of charge up to 2 hours before the scheduled pickup time.
                A 15 minute wait time is included with each pickup; wait times may vary
                by location and time of day.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. SMS messaging programme terms
              </h2>
              <p>
                By providing your mobile phone number and checking the SMS consent box on
                our booking or contact forms, you agree to receive automated text
                messages from Goldridr relating to your booking.
              </p>
              <ul className="mt-4 space-y-3 list-disc pl-6">
                <li>
                  <span className="font-semibold text-white">Programme description: </span>
                  Booking confirmations, pickup reminders, chauffeur arrival updates and
                  notifications of changes to your scheduled ride.
                </li>
                <li>
                  <span className="font-semibold text-white">Message frequency: </span>
                  Message frequency varies. You will receive up to 6 messages per booking.
                </li>
                <li>
                  <span className="font-semibold text-white">Cost: </span>
                  Message and data rates may apply depending on your mobile phone service
                  plan. Goldridr does not charge for these messages.
                </li>
                <li>
                  <span className="font-semibold text-white">Opting out: </span>
                  Reply STOP to any message to cancel at any time. You will receive a
                  single confirmation message and no further messages will be sent.
                </li>
                <li>
                  <span className="font-semibold text-white">Help: </span>
                  Reply HELP to any message, or contact us at{ " " }
                  <a href="mailto:support@goldridr.com" className="text-gold underline underline-offset-2">
                    support@goldridr.com
                  </a>
                  .
                </li>
                <li>
                  <span className="font-semibold text-white">Consent is optional: </span>
                  Consent to receive text messages is not a condition of booking a ride or
                  making any purchase.
                </li>
                <li>
                  <span className="font-semibold text-white">Carriers: </span>
                  Carriers are not liable for delayed or undelivered messages. Delivery is
                  not guaranteed and may be affected by your carrier or device.
                </li>
                <li>
                  <span className="font-semibold text-white">Privacy: </span>
                  Your mobile information and SMS consent are never shared with third
                  parties or affiliates for marketing purposes. See our{ " " }
                  <Link href="/privacy" className="text-gold underline underline-offset-2">
                    Privacy Policy
                  </Link>
                  .
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. Passenger conduct
              </h2>
              <p>
                Passengers must comply with all applicable laws and the reasonable
                instructions of the chauffeur. We reserve the right to end a ride where
                the safety of the chauffeur or passengers is at risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. Insurance and liability
              </h2>
              <p>
                Goldridr maintains commercial automobile liability insurance of $1,000,000
                for covered accidents, together with uninsured and underinsured motorist
                coverage as required by law. Except as required by law, our liability is
                limited to the amount paid for the affected ride.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Changes to these terms
              </h2>
              <p>
                We may update these terms from time to time. The date at the top of this
                page reflects the most recent revision. Continued use of our service after
                a change constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                7. Contact us
              </h2>
              <p>
                Goldridr — Houston, Texas.{ " " }
                <a href="mailto:support@goldridr.com" className="text-gold underline underline-offset-2">
                  support@goldridr.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
