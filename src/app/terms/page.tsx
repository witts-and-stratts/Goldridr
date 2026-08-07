import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Terms of Service & SMS Terms | Goldridr",
  description:
    "Terms governing Goldridr chauffeur bookings, payments, cancellations, passenger conduct, liability, and the Goldridr Ride Notifications SMS program.",
  alternates: { canonical: "/terms" },
};

const sections = [
  [ "agreement", "Agreement to these terms" ],
  [ "eligibility", "Eligibility and accounts" ],
  [ "service", "Chauffeur services" ],
  [ "bookings", "Bookings and availability" ],
  [ "pricing", "Pricing and payment" ],
  [ "cancellations", "Cancellations and wait time" ],
  [ "passengers", "Passenger responsibilities" ],
  [ "sms", "SMS program terms" ],
  [ "communications", "Other communications" ],
  [ "third-parties", "Third-party services" ],
  [ "ownership", "Intellectual property" ],
  [ "disclaimers", "Disclaimers" ],
  [ "liability", "Limitation of liability" ],
  [ "indemnity", "Indemnification" ],
  [ "law", "Governing law and disputes" ],
  [ "changes", "Changes and termination" ],
  [ "general", "General terms" ],
  [ "contact", "Contact us" ],
] as const;

const headingClass = "mb-3 text-xl font-semibold text-white";
const sectionClass = "scroll-mt-32";
const linkClass = "text-gold underline underline-offset-2 hover:text-white";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="relative min-h-screen text-white selection:bg-gold/30">
        <div className="container mx-auto px-4 pb-24 pt-40">
          <div className="mx-auto max-w-5xl">
            <p className="site-label mb-4 text-center text-gold">Legal</p>
            <h1 className="site-heading text-center">
              Terms of <span className="text-gold">Service</span>
            </h1>
            <p className="site-copy mx-auto mt-5 max-w-2xl text-center text-gray-400">
              These terms govern use of Goldridr&apos;s website, private chauffeur services,
              and transactional ride-notification text messaging program.
            </p>
            <p className="site-copy mx-auto mt-4 text-center text-sm text-gray-500">
              Effective and last updated: 6 August 2026
            </p>

            <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-28 lg:self-start">
                <nav aria-label="Terms of Service sections" className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <p className="mb-3 text-sm font-semibold text-white">On this page</p>
                  <ol className="space-y-2 text-sm text-gray-400">
                    { sections.map( ( [ id, label ], index ) => (
                      <li key={ id }>
                        <a href={ `#${ id }` } className="transition-colors hover:text-gold">
                          { index + 1 }. { label }
                        </a>
                      </li>
                    ) ) }
                  </ol>
                </nav>
              </aside>

              <article className="min-w-0 space-y-10 text-gray-300 leading-7">
                <section id="agreement" className={ sectionClass }>
                  <h2 className={ headingClass }>1. Agreement to these terms</h2>
                  <p>
                    These Terms of Service are a binding agreement between you and Goldridr
                    Technology LLC (&quot;Goldridr,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). They apply when you
                    visit our website, request or purchase a ride, communicate with us, or use
                    any related service. By doing so, you confirm that you have read and agree
                    to these terms and our{ " " }
                    <Link href="/privacy" className={ linkClass }>Privacy Policy</Link>.
                    If you do not agree, do not use the services.
                  </p>
                  <p className="mt-4">
                    If you book for another passenger or on behalf of an organisation, you
                    represent that you are authorised to provide the booking information and
                    bind that passenger or organisation to the provisions relevant to them.
                  </p>
                </section>

                <section id="eligibility" className={ sectionClass }>
                  <h2 className={ headingClass }>2. Eligibility and accounts</h2>
                  <p>
                    You must be at least 18 years old and legally able to enter a contract to
                    make a booking. Minors may ride only when permitted by law and accompanied
                    or otherwise authorised by a responsible adult. You must provide accurate,
                    current information and promptly correct any changes. You are responsible
                    for safeguarding booking references and account credentials and for activity
                    carried out using them, except where prohibited by law.
                  </p>
                </section>

                <section id="service" className={ sectionClass }>
                  <h2 className={ headingClass }>3. Chauffeur services</h2>
                  <p>
                    Goldridr provides pre-scheduled private chauffeur transportation in Houston,
                    Texas and interstate rides within Texas. Service areas, vehicle classes,
                    routes, amenities, pickup instructions, and estimated journey times may vary.
                    Travel times are estimates and can be affected by traffic, weather, road
                    closures, security procedures, flight changes, and other circumstances beyond
                    our reasonable control.
                  </p>
                  <p className="mt-4">
                    We may use qualified employees, contractors, or transportation partners to
                    fulfil a ride. A particular chauffeur or vehicle is not guaranteed unless we
                    expressly confirm otherwise, and a comparable substitution does not by itself
                    constitute a failure to provide service.
                  </p>
                </section>

                <section id="bookings" className={ sectionClass }>
                  <h2 className={ headingClass }>4. Bookings and availability</h2>
                  <p>
                    A booking request is subject to availability and is not accepted until you
                    receive confirmation from Goldridr. You are responsible for reviewing the
                    passenger name, phone number, email, date, time, pickup and destination,
                    flight or terminal information, passenger count, luggage needs, and special
                    requests. Contact us promptly if any detail is incorrect.
                  </p>
                  <p className="mt-4">
                    Material changes may affect availability or price and may be treated as a new
                    request. We may decline or cancel a request where information is incomplete or
                    inaccurate, payment is not completed, no suitable vehicle or chauffeur is
                    available, the requested service would be unsafe or unlawful, or circumstances
                    outside our reasonable control make performance impracticable. If Goldridr
                    cancels a prepaid ride without providing a reasonable substitute, we will
                    refund the amount paid for that cancelled service.
                  </p>
                </section>

                <section id="pricing" className={ sectionClass }>
                  <h2 className={ headingClass }>5. Pricing and payment</h2>
                  <p>
                    Prices are stated in U.S. dollars unless indicated otherwise. You agree to pay
                    the fare and any taxes, tolls, parking, airport charges, approved waiting-time
                    charges, damage or cleaning charges, or other amounts clearly disclosed before
                    they are incurred. Estimates may change when you change the route, duration,
                    passenger requirements, or other booking details.
                  </p>
                  <p className="mt-4">
                    Rides must be paid before service unless Goldridr agrees otherwise in writing.
                    You authorise us and our payment service providers to process the selected
                    payment method and to take reasonable steps to prevent fraud. We do not
                    guarantee that a discount or promotional code will remain available, and such
                    offers may have separate eligibility, expiry, and non-combination rules.
                  </p>
                </section>

                <section id="cancellations" className={ sectionClass }>
                  <h2 className={ headingClass }>6. Cancellations, refunds, and wait time</h2>
                  <p>
                    You may cancel without charge up to two hours before the scheduled pickup time.
                    Cancellations received later may be non-refundable up to the full booking
                    amount, to the extent permitted by law. Refunds, when due, are returned to the
                    original payment method and processing times depend on the payment provider.
                  </p>
                  <p className="mt-4">
                    Each pickup includes 15 minutes of complimentary wait time unless we tell you
                    that a different allowance applies because of the pickup location or service.
                    If we cannot contact you and you do not meet the chauffeur within the applicable
                    wait period, the ride may be treated as a no-show. Tell us promptly about flight
                    delays or other changes; monitoring a flight does not guarantee that we can
                    accommodate a materially changed arrival time.
                  </p>
                </section>

                <section id="passengers" className={ sectionClass }>
                  <h2 className={ headingClass }>7. Passenger responsibilities and prohibited conduct</h2>
                  <p>
                    Passengers must comply with applicable law, wear seat belts, respect the vehicle
                    and chauffeur, and follow reasonable safety instructions. You must disclose
                    accessibility needs, child-seat requirements, oversized luggage, animals, or
                    other circumstances that may affect safe service early enough for us to assess
                    the request. You may not threaten or harass anyone, smoke or vape in a vehicle,
                    possess unlawful items, damage property, create an unsafe distraction, exceed
                    vehicle capacity, or use the service for an unlawful purpose.
                  </p>
                  <p className="mt-4">
                    We may refuse or end a ride when reasonably necessary to protect passengers,
                    chauffeurs, the public, or property. You are responsible for reasonable repair,
                    specialist cleaning, or replacement costs caused by you or members of your party,
                    subject to evidence and applicable law. Goldridr is not responsible for items
                    left in a vehicle, though we will make reasonable efforts to help recover them.
                  </p>
                </section>

                <section id="sms" className={ sectionClass }>
                  <h2 className={ headingClass }>8. Goldridr Ride Notifications SMS program</h2>
                  <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5 sm:p-6">
                    <p className="font-semibold text-white">At a glance</p>
                    <ul className="mt-3 list-disc space-y-2 pl-5">
                      <li><strong className="text-white">Sponsor:</strong> Goldridr Technology LLC.</li>
                      <li><strong className="text-white">Purpose:</strong> transactional booking and ride updates; the program does not send marketing texts.</li>
                      <li><strong className="text-white">Frequency:</strong> message frequency varies, up to six messages per booking.</li>
                      <li><strong className="text-white">Cost:</strong> message and data rates may apply.</li>
                      <li><strong className="text-white">Opt out:</strong> <strong>Reply STOP to cancel at any time.</strong></li>
                      <li><strong className="text-white">Help:</strong> <strong>Reply HELP for help</strong> or email <a href="mailto:support@goldridr.com" className={ linkClass }>support@goldridr.com</a>.</li>
                    </ul>
                  </div>

                  <h3 className="mb-2 mt-6 font-semibold text-white">8.1 Consent and enrollment</h3>
                  <p>
                    You enroll by providing a mobile number and affirmatively checking the SMS
                    consent box during booking. The checkbox is optional and applies only to the
                    Goldridr ride-notification campaign described here. Consent is not a condition
                    of purchase or of booking a ride. Your consent is personal to you and may not
                    be sold, transferred, or assigned. By opting in, you confirm that you are the
                    subscriber or customary user of the number and authorise Goldridr to send
                    automated texts to it. Consent is effective even if the number appears on a
                    federal or state do-not-call list, solely for the transactional messages you
                    requested and to the extent permitted by law.
                  </p>

                  <h3 className="mb-2 mt-6 font-semibold text-white">8.2 Message content and frequency</h3>
                  <p>
                    Messages may include booking acknowledgements and confirmations, pickup
                    reminders, chauffeur assignment or arrival updates, schedule or location
                    changes, cancellation notices, and service-support replies. Message frequency
                    varies with activity, but you will receive no more than six messages for a
                    booking. We may send one immediate confirmation after an opt-out. The program
                    is not a subscription to promotional or advertising messages.
                  </p>

                  <h3 className="mb-2 mt-6 font-semibold text-white">8.3 Opting out, help, and re-enrollment</h3>
                  <p>
                    <strong className="text-white">Reply STOP</strong> to any Goldridr text to opt
                    out. We also recognise STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT, REVOKE, and
                    OPTOUT when sent as a supported keyword. After an opt-out confirmation, we will
                    send no further texts under this program unless you provide fresh consent.
                    For assistance, <strong className="text-white">reply HELP</strong> or INFO, or
                    email us. If you previously opted out, reply START or UNSTOP to re-enroll; we
                    will restore messaging only where we have a prior consent record or otherwise
                    obtain valid consent. Keyword recognition is case-insensitive, but carriers may
                    require the keyword to be the entire message.
                  </p>

                  <h3 className="mb-2 mt-6 font-semibold text-white">8.4 Delivery, charges, and number changes</h3>
                  <p>
                    Message and data rates may apply under your wireless plan. Message delivery is
                    subject to effective transmission by your carrier and device. Carriers are not
                    liable for delayed or undelivered messages. Goldridr and participating carriers
                    do not guarantee availability, timing, or receipt. If you change, deactivate,
                    or transfer your mobile number, you must opt out first or notify us promptly so
                    messages are not sent to a later user of that number.
                  </p>

                  <h3 className="mb-2 mt-6 font-semibold text-white">8.5 Privacy and program changes</h3>
                  <p>
                    We record consent and opt-out events and use service providers, including our
                    messaging provider, only as needed to operate the program. Mobile information
                    and text-message opt-in data and consent are not sold or shared with third
                    parties or affiliates for their marketing or promotional purposes. See our{ " " }
                    <Link href="/privacy#sms" className={ linkClass }>Privacy Policy&apos;s SMS section</Link>.
                    We may change the sending number or suspend or terminate the program, but an
                    opt-out request remains effective for the scope required by law.
                  </p>
                </section>

                <section id="communications" className={ sectionClass }>
                  <h2 className={ headingClass }>9. Other communications</h2>
                  <p>
                    You agree that we may send non-marketing communications needed to administer a
                    booking or relationship, such as email confirmations, receipts, safety notices,
                    and responses to your requests. SMS communications remain subject to the separate
                    consent and opt-out terms above. Electronic notices satisfy written-notice
                    requirements where permitted by law.
                  </p>
                </section>

                <section id="third-parties" className={ sectionClass }>
                  <h2 className={ headingClass }>10. Third-party services and links</h2>
                  <p>
                    The services may use or link to maps, payment services, communications providers,
                    app stores, or third-party websites. Their products and privacy practices are
                    governed by their own terms. Goldridr is not responsible for third-party content
                    or services, but this provision does not limit responsibility that cannot lawfully
                    be excluded.
                  </p>
                </section>

                <section id="ownership" className={ sectionClass }>
                  <h2 className={ headingClass }>11. Intellectual property and permitted use</h2>
                  <p>
                    Goldridr and its licensors own the website, software, branding, text, graphics,
                    and other service content. We grant you a limited, revocable, non-exclusive,
                    non-transferable right to use the services for lawful personal or internal
                    business travel. You may not copy, scrape, reverse engineer, disrupt, bypass
                    security, misuse booking or pricing systems, impersonate another person, or use
                    our marks without written permission, except as permitted by law.
                  </p>
                </section>

                <section id="disclaimers" className={ sectionClass }>
                  <h2 className={ headingClass }>12. Disclaimers</h2>
                  <p>
                    To the fullest extent permitted by law, the website and services are provided
                    &quot;as is&quot; and &quot;as available.&quot; Goldridr disclaims implied warranties of
                    merchantability, fitness for a particular purpose, title, and non-infringement.
                    We do not warrant uninterrupted website or messaging availability, error-free
                    estimates, or arrival at a destination by a particular time. Nothing in these
                    terms excludes an express written commitment or a warranty that law does not
                    permit us to disclaim.
                  </p>
                </section>

                <section id="liability" className={ sectionClass }>
                  <h2 className={ headingClass }>13. Insurance and limitation of liability</h2>
                  <p>
                    Goldridr maintains commercial automobile liability insurance of $1,000,000 for
                    covered accidents, together with uninsured and underinsured motorist coverage as
                    required by law. Insurance coverage is governed by the applicable policy and law
                    and does not expand contractual liability.
                  </p>
                  <p className="mt-4">
                    To the fullest extent permitted by law, Goldridr and its owners, personnel, and
                    service providers will not be liable for indirect, incidental, special,
                    consequential, exemplary, or punitive damages, or for lost profits, data, use, or
                    opportunity, arising from the services. Goldridr&apos;s aggregate contractual liability
                    for a claim will not exceed the amount you paid for the affected ride. These limits
                    do not apply to liability that cannot legally be limited, including liability for
                    fraud, wilful misconduct, or personal injury to the extent caused by negligence and
                    made non-excludable by applicable law.
                  </p>
                </section>

                <section id="indemnity" className={ sectionClass }>
                  <h2 className={ headingClass }>14. Indemnification</h2>
                  <p>
                    To the extent permitted by law, you will defend, indemnify, and hold harmless
                    Goldridr and its owners, personnel, and service providers from third-party claims,
                    losses, and reasonable costs resulting from your unlawful use of the services,
                    your material breach of these terms, information you provide without authority,
                    or the conduct of passengers for whom you booked. This obligation does not apply
                    to the extent a claim was caused by Goldridr&apos;s own negligence or misconduct.
                  </p>
                </section>

                <section id="law" className={ sectionClass }>
                  <h2 className={ headingClass }>15. Governing law and disputes</h2>
                  <p>
                    Texas law governs these terms, without regard to conflict-of-laws principles.
                    Before filing a claim, please send a written description to
                    support@goldridr.com and allow 30 days for an informal resolution, unless urgent
                    relief or a shorter legal deadline applies. Subject to applicable consumer law,
                    courts located in Harris County, Texas will have exclusive jurisdiction. Nothing
                    here prevents either party from bringing an eligible matter in small-claims court
                    or reporting a concern to a regulator.
                  </p>
                </section>

                <section id="changes" className={ sectionClass }>
                  <h2 className={ headingClass }>16. Changes, suspension, and termination</h2>
                  <p>
                    We may modify these terms prospectively by posting an updated version and changing
                    the date above. Material changes will apply after reasonable notice when required.
                    The version accepted when you booked generally governs that booking unless a change
                    is required by law or you agree otherwise. We may suspend or terminate access for
                    material breach, fraud, abuse, safety risk, or unlawful conduct. Provisions that by
                    their nature should survive will remain effective after termination.
                  </p>
                </section>

                <section id="general" className={ sectionClass }>
                  <h2 className={ headingClass }>17. General terms</h2>
                  <p>
                    These terms, the Privacy Policy, the confirmed booking details, and any terms
                    expressly incorporated by reference form the entire agreement for the services.
                    If a provision is unenforceable, it will be limited to the minimum extent necessary
                    and the remainder will continue. A delay in enforcing a right is not a waiver. You
                    may not assign your agreement without our consent; we may assign it in connection
                    with a merger, reorganisation, sale of assets, or by operation of law, subject to
                    applicable privacy obligations. Headings are for convenience only.
                  </p>
                </section>

                <section id="contact" className={ sectionClass }>
                  <h2 className={ headingClass }>18. Contact us</h2>
                  <p>
                    Goldridr Technology LLC<br />
                    Houston, Texas, United States<br />
                    Email:{ " " }
                    <a href="mailto:support@goldridr.com" className={ linkClass }>support@goldridr.com</a>
                  </p>
                </section>
              </article>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
