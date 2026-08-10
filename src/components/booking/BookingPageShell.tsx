import { BookingPageFlow } from "@/components/booking/BookingPageFlow";
import type { BookingServiceSlug } from "@/components/booking/booking-services";
import { Footer } from "@/components/home/Footer";
import { Header } from "@/components/home/Header";
import {
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_NOT_REQUIRED,
  SMS_CONSENT_RATES,
  SMS_MARKETING_FREQUENCY,
} from "@/lib/sms-consent-copy";
import Link from "next/link";
import { Suspense } from "react";

export function BookingPageShell( { service }: { service?: BookingServiceSlug } ) {
  return (
    <>
      <Header />
      <main className="min-h-screen text-white selection:bg-gold/30">
        <div className="container mx-auto flex min-h-[80vh] items-center justify-center pb-16 w-full">
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

function SmsProgramTerms() {
  return (
    <section
      id="sms-terms"
      aria-labelledby="sms-terms-heading"
      className="container mx-auto max-w-3xl px-4 pb-24"
    >
      <h2 id="sms-terms-heading" className="mb-3 text-lg font-semibold text-white">
        SMS program terms
      </h2>
      <p className="text-sm leading-6 text-gray-400">
        Providing a phone number is optional. If you select an SMS option during booking,
        GoldRidr may send automated texts for the program you selected. Ride Notifications
        cover booking and ride updates; Offers cover promotions and new services.
      </p>
      <dl className="mt-4 space-y-2 text-sm leading-6 text-gray-400">
        <div>
          <dt className="inline font-semibold text-white">Ride notification frequency: </dt>
          <dd className="inline">{ SMS_CONSENT_FREQUENCY }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Offer frequency: </dt>
          <dd className="inline">{ SMS_MARKETING_FREQUENCY }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Charges: </dt>
          <dd className="inline">{ SMS_CONSENT_RATES }</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-white">Help and opt-out: </dt>
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
