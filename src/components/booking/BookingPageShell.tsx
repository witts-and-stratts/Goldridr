import { Suspense } from "react";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";
import { BookingPageFlow } from "@/components/booking/BookingPageFlow";
import type { BookingServiceSlug } from "@/components/booking/booking-services";
import {
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_NOT_REQUIRED,
  SMS_CONSENT_RATES,
} from "@/lib/sms-consent-copy";

export function BookingPageShell( { service }: { service?: BookingServiceSlug } ) {
  return (
    <>
      <Header />
      <main className="min-h-screen text-white selection:bg-gold/30">
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4 pt-32 pb-16">
          { /* The forms seed their date field from `new Date()`, which cannot be
               prerendered under Cache Components — stream them instead. */ }
          <Suspense fallback={ <p className="site-copy text-gray-400">Loading booking form…</p> }>
            <BookingPageFlow service={ service } />
          </Suspense>
        </div>

        {/* <SmsProgramTerms /> */}
      </main>
      <Footer />
    </>
  );
}

// Rendered statically, outside the Suspense boundary, so the messaging disclosure is in
// the initial HTML for anyone reviewing this URL — including with JavaScript disabled.
function SmsProgramTerms() {
  return (
    <section
      id="sms-terms"
      aria-labelledby="sms-terms-heading"
      className="container mx-auto max-w-3xl px-4 pb-24"
    >
      <h2 id="sms-terms-heading" className="text-lg font-semibold text-white mb-3">
        SMS booking notifications
      </h2>
      <p className="text-sm leading-6 text-gray-400">
        Providing a phone number is optional, and the booking form submits without one.
        If you tick the SMS box above, Goldridr sends automated text messages about your
        booking confirmation, pickup reminders, chauffeur assignment and any changes to
        your ride. We never send marketing texts.
      </p>
      <dl className="mt-4 space-y-2 text-sm leading-6 text-gray-400">
        <div>
          <dt className="inline font-semibold text-white">Message Frequency: </dt>
          <dd className="inline">{ SMS_CONSENT_FREQUENCY }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Standard Rates: </dt>
          <dd className="inline">{ SMS_CONSENT_RATES }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Help &amp; Stop: </dt>
          <dd className="inline">{ SMS_CONSENT_HELP_STOP }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Consent: </dt>
          <dd className="inline">{ SMS_CONSENT_NOT_REQUIRED }</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-6 text-gray-400">
        <Link href="/terms" className="text-gold underline underline-offset-2">Terms of Service</Link>
        <span> | </span>
        <Link href="/privacy" className="text-gold underline underline-offset-2">Privacy Policy</Link>
      </p>
    </section>
  );
}
