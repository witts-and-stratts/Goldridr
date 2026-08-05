import React from "react";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

export const metadata = {
  title: "Privacy Policy | Goldridr",
  description:
    "How Goldridr collects, uses and protects your personal information, including mobile phone numbers and SMS consent.",
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen text-white selection:bg-gold/30 relative mt-20">
        <div className="container mx-auto px-4 pt-32 pb-16">
          <h1 className="site-heading mb-4 text-center">
            Privacy <span className="text-gold">Policy</span>
          </h1>
          <p className="site-copy mx-auto mb-12 text-center text-gray-400">
            Last updated: 5 August 2026
          </p>

          <div className="mx-auto max-w-3xl space-y-8 text-gray-300 leading-7">
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                1. Information we collect
              </h2>
              <p>
                When you book a ride or contact us we collect the information you
                provide directly: your name, email address, mobile phone number, pickup
                and drop-off locations, flight details where applicable, and any special
                requests you add to your booking. We also collect payment information
                through our payment processor, and basic technical data such as your IP
                address and browser type.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                2. How we use your information
              </h2>
              <p>
                We use your information to schedule and fulfil your ride, dispatch a
                chauffeur, process payment, send you booking confirmations and service
                updates, respond to your enquiries, and meet our legal and insurance
                obligations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                3. Mobile phone numbers and SMS
              </h2>
              <p>
                If you check the SMS consent box when booking, we use your mobile phone
                number to send you automated text messages about your booking:
                confirmations, pickup reminders, chauffeur arrival updates and changes to
                your scheduled ride. Message frequency varies; you will receive up to 6
                messages per booking. Message and data rates may apply. Reply HELP for
                help or STOP to cancel at any time.
              </p>
              <p className="mt-4 font-semibold text-white">
                No mobile information will be shared with third parties or affiliates for
                marketing or promotional purposes. All other categories exclude text
                messaging originator opt-in data and consent; this information will not
                be shared with any third parties.
              </p>
              <p className="mt-4">
                SMS consent is never a condition of booking a ride or making a purchase.
                You can withdraw consent at any time by replying STOP to any message or by
                contacting us at{ " " }
                <a href="mailto:support@goldridr.com" className="text-gold underline underline-offset-2">
                  support@goldridr.com
                </a>
                . We retain a record of your consent, including the date and time it was
                given, in order to demonstrate compliance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                4. Sharing your information
              </h2>
              <p>
                We share information only with the service providers needed to deliver
                your ride — our chauffeurs, our payment processor, our messaging provider
                (Twilio) and our email provider — and only to the extent required to
                perform that service. We do not sell your personal information. As stated
                above, mobile opt-in data and consent are never shared with third parties
                for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                5. Data retention and security
              </h2>
              <p>
                We retain booking records for as long as necessary to provide our service
                and to comply with tax, insurance and legal requirements. We use industry
                standard technical and organisational measures to protect your data, but
                no method of transmission over the internet is completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">
                6. Your rights
              </h2>
              <p>
                You may request access to, correction of, or deletion of the personal
                information we hold about you by emailing{ " " }
                <a href="mailto:support@goldridr.com" className="text-gold underline underline-offset-2">
                  support@goldridr.com
                </a>
                .
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
                . See also our{ " " }
                <Link href="/terms" className="text-gold underline underline-offset-2">
                  Terms of Service
                </Link>
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
