import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/home/Header";
import { Footer } from "@/components/home/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy & SMS Privacy | Goldridr",
  description:
    "Learn how GoldRidrcollects, uses, discloses, retains, and protects personal information, including mobile information and SMS consent.",
  alternates: { canonical: "/privacy" },
};

const sections = [
  [ "scope", "Scope and controller" ],
  [ "collect", "Information we collect" ],
  [ "sources", "Sources of information" ],
  [ "use", "How we use information" ],
  [ "sms", "Mobile and SMS privacy" ],
  [ "disclosure", "How we disclose information" ],
  [ "choices", "Your choices and rights" ],
  [ "retention", "Retention" ],
  [ "security", "Security" ],
  [ "cookies", "Cookies and tracking" ],
  [ "children", "Children" ],
  [ "transfers", "Data location" ],
  [ "changes", "Policy changes" ],
  [ "contact", "Contact and appeals" ],
] as const;

const headingClass = "mb-3 text-xl font-semibold text-white";
const subheadingClass = "mb-2 mt-6 font-semibold text-white";
const sectionClass = "scroll-mt-32";
const linkClass = "text-gold underline underline-offset-2 hover:text-white";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="relative min-h-screen text-white selection:bg-gold/30">
        <div className="mx-auto pb-24 pt-40 px-4 md:px-6 lg:px-8">
          <div className="mx-auto">
            <p className="site-label mb-4 text-center text-gold">Legal</p>
            <h1 className="site-heading text-center">
              Privacy <span className="text-gold">Policy</span>
            </h1>
            <p className="site-copy mx-auto mt-5 max-w-2xl text-center text-gray-400">
              This policy explains what personal information GoldRidrhandles, why we use
              it, when we disclose it, and the choices available to you.
            </p>
            <p className="site-copy mx-auto mt-4 text-center text-sm text-gray-500">
              Effective and last updated: 6 August 2026
            </p>

            <div className="mt-12 grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <aside className="lg:sticky lg:top-28 lg:self-start">
                <nav aria-label="Privacy Policy sections" className="border border-white/10 bg-white/3 p-5">
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
                <section id="scope" className={ sectionClass }>
                  <h2 className={ headingClass }>1. Scope and who controls your information</h2>
                  <p>
                    This Privacy Policy applies to personal information processed by GoldRidr(&quot;Goldridr,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) through the Goldridr
                    website, booking services, chauffeur and administrative tools, customer support,
                    email, and the GoldRidr Ride Notifications SMS program. GoldRidr is responsible
                    for deciding how and why that information is used.
                  </p>
                  <p className="mt-4">
                    This policy does not govern a third party&apos;s independent services or websites.
                    Their privacy notices apply when they determine how your information is used.
                    Our{ " " }<Link href="/terms" className={ linkClass }>Terms of Service</Link>{ " " }
                    separately govern use of Goldridr&apos;s services.
                  </p>
                </section>

                <section id="collect" className={ sectionClass }>
                  <h2 className={ headingClass }>2. Information we collect</h2>

                  <h3 className={ subheadingClass }>2.1 Identity and contact information</h3>
                  <p>
                    We may collect your name, email address, mobile or other telephone number,
                    organisation, login identifiers, and the contact information of a passenger for
                    whom you make a booking.
                  </p>

                  <h3 className={ subheadingClass }>2.2 Booking, trip, and service information</h3>
                  <p>
                    We collect booking references; pickup dates, times, addresses, and destinations;
                    trip type and duration; estimated distance and price; passenger count; flight and
                    terminal details; chauffeur and vehicle assignment; discount codes; status and
                    schedule changes; notes, accessibility needs, luggage information, and other
                    requests you choose to provide. Trip locations may reveal sensitive information,
                    so please include only what is needed for the ride.
                  </p>

                  <h3 className={ subheadingClass }>2.3 Payment and transaction information</h3>
                  <p>
                    We may maintain the amount, currency, payment method type, transaction reference,
                    payment status, refund status, and related records. When a payment processor
                    handles card or bank credentials, it receives that information directly under its
                    own privacy terms; GoldRidrdoes not need the full payment-card number to maintain
                    a booking and payment ledger.
                  </p>

                  <h3 className={ subheadingClass }>2.4 Communications and consent records</h3>
                  <p>
                    We collect messages and enquiries, support correspondence, call or contact notes,
                    email delivery and open events, notification preferences, SMS consent version,
                    consent date and time, opt-out or re-enrollment date and time, inbound keyword
                    messages, delivery status, and provider event identifiers.
                  </p>

                  <h3 className={ subheadingClass }>2.5 Device, website, and security information</h3>
                  <p>
                    Our systems may automatically receive IP address, browser and device type,
                    operating system, referring page, pages or features used, timestamps, cookie or
                    session identifiers, approximate location derived from IP address, and diagnostic,
                    security, fraud-prevention, and server-log information. We do not describe a device
                    location as your ride location unless you submit or enable it for that purpose.
                  </p>

                  <h3 className={ subheadingClass }>2.6 Chauffeur and business-user information</h3>
                  <p>
                    For chauffeurs, administrators, and business contacts, we may also collect role,
                    employer, work contact details, authentication data, availability, assignments,
                    vehicle details, blocked dates, activity logs, and records needed to administer
                    access, operations, safety, and legal obligations.
                  </p>
                </section>

                <section id="sources" className={ sectionClass }>
                  <h2 className={ headingClass }>3. Sources of information</h2>
                  <p>We collect personal information from:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>you, including through booking, contact, login, payment, and communications;</li>
                    <li>a person or organisation arranging travel for you;</li>
                    <li>chauffeurs and personnel who fulfil or administer a ride;</li>
                    <li>communications, payment, mapping, email, hosting, and security providers;</li>
                    <li>your browser or device when you use our digital services; and</li>
                    <li>public, legal, fraud-prevention, or business sources where permitted by law.</li>
                  </ul>
                  <p className="mt-4">
                    If you give us information about another person, you represent that you are
                    authorised to do so and will direct them to this policy where appropriate.
                  </p>
                </section>

                <section id="use" className={ sectionClass }>
                  <h2 className={ headingClass }>4. How and why we use information</h2>
                  <p>We use personal information to:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>provide quotes, check availability, create, confirm, modify, and fulfil bookings;</li>
                    <li>dispatch chauffeurs, coordinate pickups, navigate routes, and provide customer support;</li>
                    <li>process and reconcile payments, discounts, charges, refunds, and receipts;</li>
                    <li>send requested confirmations, reminders, arrival notices, and service changes;</li>
                    <li>authenticate users, maintain preferences, and administer driver and business tools;</li>
                    <li>detect, investigate, and prevent fraud, abuse, security incidents, and unlawful activity;</li>
                    <li>measure delivery and engagement, diagnose failures, and improve service reliability;</li>
                    <li>enforce agreements, protect people and property, and resolve disputes;</li>
                    <li>comply with tax, accounting, insurance, transportation, communications, and other legal duties; and</li>
                    <li>create aggregated or de-identified information that cannot reasonably identify you.</li>
                  </ul>
                  <p className="mt-4">
                    Depending on the context and applicable law, we process information to perform a
                    contract, act on your request before entering a contract, comply with law, protect
                    vital interests, pursue legitimate operational and security interests, or based on
                    consent. Where processing is based on consent, you may withdraw it prospectively.
                  </p>
                </section>

                <section id="sms" className={ sectionClass }>
                  <h2 className={ headingClass }>5. Mobile information and SMS consent</h2>
                  <div className="rounded-2xl border border-gold/25 bg-gold/[0.06] p-5 sm:p-6">
                    <p className="font-semibold text-white">Mobile messaging privacy</p>
                    <p className="mt-3">
                      No mobile information will be shared with third parties or affiliates for
                      marketing or promotional purposes. Information sharing to subcontractors in
                      support services, such as customer service and message delivery, is permitted.
                      All other use-case categories exclude text-messaging originator opt-in data and
                      consent; this information will not be shared with any third parties. We do not
                      sell, rent, or purchase mobile numbers or SMS opt-in data or consent.
                    </p>
                  </div>

                  <h3 className={ subheadingClass }>5.1 What the programs collect</h3>
                  <p>
                    If you affirmatively opt in, we process your mobile number, booking reference,
                    the consent language and version shown to you, consent timestamp and source,
                    message content, send and delivery events, replies, HELP requests, and opt-out or
                    re-enrollment status. We keep these records to operate the program, respect your
                    choices, troubleshoot delivery, prevent unwanted messages, and demonstrate consent.
                  </p>

                  <h3 className={ subheadingClass }>5.2 What we send</h3>
                  <p>
                    GoldRidr Ride Notifications are transactional messages about booking confirmations,
                    pickup reminders, chauffeur assignments or arrivals, and changes or cancellations
                    affecting your scheduled ride. Message frequency varies, up to six messages per
                    booking. GoldRidr Offers are recurring marketing messages about special offers,
                    new services, and ride promotions. Message frequency varies, up to four messages
                    per month. Message and data rates may apply. Each program has a separate, optional,
                    unchecked consent box, and SMS consent is not a condition of purchase or booking.
                  </p>

                  <h3 className={ subheadingClass }>5.3 Your SMS choices</h3>
                  <p>
                    <strong className="text-white">Reply STOP to opt out at any time.</strong> We may
                    send one confirmation and will then stop all GoldRidr texts unless you later provide
                    valid consent. <strong className="text-white">Reply HELP for help</strong>, or
                    email{ " " }<a href="mailto:support@goldridr.com" className={ linkClass }>support@goldridr.com</a>.
                    We also recognise the supported opt-out, help, and re-enrollment keywords described
                    in the{ " " }<Link href="/terms#sms" className={ linkClass }>SMS Program Terms</Link>.
                    You may also withdraw consent through any other reasonable method required by law.
                  </p>

                  <h3 className={ subheadingClass }>5.4 Limited operational disclosure</h3>
                  <p>
                    We disclose mobile information to messaging carriers and vendors, including Twilio,
                    only as necessary to transmit messages, process replies, maintain suppression lists,
                    prevent abuse, and support the program; to authorities when legally required; or in
                    a business transaction subject to continued protection of consent data. These
                    operational disclosures do not permit recipients to use mobile information or SMS
                    consent for their own marketing. Carriers are not liable for delayed or undelivered
                    messages.
                  </p>
                </section>

                <section id="disclosure" className={ sectionClass }>
                  <h2 className={ headingClass }>6. How we disclose information</h2>
                  <p>We may disclose personal information to:</p>
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li><strong className="text-white">Chauffeurs and transportation partners</strong> to fulfil and support a requested ride;</li>
                    <li><strong className="text-white">Service providers</strong> that host data, process payments, provide maps and routing, send email or SMS, support customers, secure systems, or provide professional services;</li>
                    <li><strong className="text-white">Business customers or travel arrangers</strong> when they booked, paid for, or administer the ride and the disclosure is authorised or reasonably expected;</li>
                    <li><strong className="text-white">Authorities and affected parties</strong> when reasonably necessary to comply with law, legal process, insurance requirements, protect rights or safety, investigate misconduct, or establish or defend legal claims; and</li>
                    <li><strong className="text-white">Transaction participants</strong> in a financing, merger, acquisition, reorganisation, or sale of assets, subject to appropriate confidentiality and legal safeguards.</li>
                  </ul>
                  <p className="mt-4">
                    We do not sell personal information for money. We do not use or disclose personal
                    information for cross-context behavioural advertising. Most importantly, the SMS
                    non-sharing rule in Section 5 applies regardless of the other categories above.
                  </p>
                </section>

                <section id="choices" className={ sectionClass }>
                  <h2 className={ headingClass }>7. Your choices and privacy rights</h2>
                  <p>
                    Depending on where you live and subject to legal exceptions, you may have the right
                    to confirm whether we process your personal information; access it; correct
                    inaccuracies; delete information you provided or that we obtained about you; obtain
                    a portable copy; opt out of a sale, targeted advertising, or certain profiling; limit
                    or withdraw consent for sensitive-data processing; and appeal a denied request.
                    GoldRidr does not discriminate against you for exercising a privacy right.
                  </p>
                  <p className="mt-4">
                    To submit a request, email support@goldridr.com with the subject &quot;Privacy Request&quot;
                    and describe the right you wish to exercise. We may ask for information reasonably
                    necessary to verify your identity and protect against fraudulent requests. An
                    authorised agent may submit a request where law permits, but we may request proof
                    of authority and direct identity verification. If we deny a request, reply with
                    &quot;Privacy Appeal&quot; and explain why you believe the decision should be reconsidered.
                  </p>
                  <p className="mt-4">
                    You may update booking details by contacting us, control browser cookies through
                    browser settings, and opt out of SMS as described in Section 5. Because we do not
                    sell personal information or use it for targeted advertising, browser-based opt-out
                    preference signals such as Global Privacy Control do not currently change those
                    practices; we will process such signals where applicable law requires.
                  </p>
                </section>

                <section id="retention" className={ sectionClass }>
                  <h2 className={ headingClass }>8. Data retention</h2>
                  <p>
                    We retain each category only as long as reasonably necessary for the purposes
                    described here, including providing service, maintaining business and payment
                    records, handling complaints, enforcing agreements, preventing fraud, and meeting
                    tax, insurance, transportation, messaging, and other legal requirements. Retention
                    depends on the information&apos;s nature, sensitivity, volume, operational need, legal
                    limitation periods, and security risk.
                  </p>
                  <p className="mt-4">
                    SMS consent and revocation records are retained long enough to demonstrate consent
                    and continue honouring suppression choices. Opting out stops future program messages
                    but does not require us to erase proof of the opt-out. When information is no longer
                    required, we delete, de-identify, or securely isolate it, subject to backups and
                    lawful retention obligations.
                  </p>
                </section>

                <section id="security" className={ sectionClass }>
                  <h2 className={ headingClass }>9. Security and incident response</h2>
                  <p>
                    We use administrative, technical, and physical safeguards designed for the nature
                    of the information we process, including access controls, authentication, provider
                    controls, logging, and measures intended to protect data in transit and at rest.
                    No internet transmission or storage system is completely secure, and we cannot
                    guarantee absolute security. If a breach requires notice, we will notify affected
                    people and authorities as required by applicable law.
                  </p>
                  <p className="mt-4">
                    Protect your credentials and booking references, avoid sending unnecessary sensitive
                    information in free-text notes or replies, and contact us if you suspect unauthorised
                    access or receive a suspicious message claiming to be Goldridr.
                  </p>
                </section>

                <section id="cookies" className={ sectionClass }>
                  <h2 className={ headingClass }>10. Cookies, session tools, maps, and email measurement</h2>
                  <p>
                    We use cookies and similar local-storage or session technologies needed to maintain
                    authenticated sessions, remember interface preferences, protect the service, and
                    keep it functioning. Blocking essential technologies may prevent features from
                    working. Our booking experience may use Google Maps services for address search,
                    distance, routing, and map display; Google may receive requests and technical data
                    under its own privacy terms.
                  </p>
                  <p className="mt-4">
                    Service emails may contain a small image or unique link that records delivery or
                    opening so we can troubleshoot notifications and measure whether important booking
                    information reached its recipient. Email clients can often block remote images.
                    We do not use these technologies to sell personal information or provide targeted
                    advertising.
                  </p>
                </section>

                <section id="children" className={ sectionClass }>
                  <h2 className={ headingClass }>11. Children&apos;s privacy</h2>
                  <p>
                    Goldridr&apos;s booking services are not directed to children under 13, and a person
                    must be at least 18 to make a booking. We do not knowingly collect personal
                    information online directly from a child under 13 without legally required parental
                    consent. A booking adult may provide limited passenger information for a minor when
                    needed to arrange lawful transportation. If you believe a child submitted personal
                    information directly to us improperly, contact us so we can review and delete it as
                    appropriate.
                  </p>
                </section>

                <section id="transfers" className={ sectionClass }>
                  <h2 className={ headingClass }>12. Data location and transfers</h2>
                  <p>
                    GoldRidr operates in the United States and uses providers that may process
                    information in the United States and other countries. Privacy protections and
                    government-access rules may differ from those where you live. Where required, we
                    use appropriate contractual or other safeguards for cross-border transfers.
                  </p>
                </section>

                <section id="changes" className={ sectionClass }>
                  <h2 className={ headingClass }>13. Changes to this policy</h2>
                  <p>
                    We may update this policy to reflect changes in our services, practices, providers,
                    or legal obligations. We will post the revised policy here and update the effective
                    date. If a change materially affects how we use information already collected, we
                    will provide additional notice or obtain consent where required. Changes to the SMS
                    program do not override a prior opt-out.
                  </p>
                </section>

                <section id="contact" className={ sectionClass }>
                  <h2 className={ headingClass }>14. Contact us and appeal a decision</h2>
                  <p>
                    Direct privacy questions, requests, complaints, and appeals to:
                  </p>
                  <p className="mt-4">
                    Joy Muller LLC d.b.a GoldRidr<br />
                    Attn: Privacy<br />
                    14504 Briar Forest Dr. <br />
                    Apt. 524 <br />
                    Houston, 77077<br />
                    Texas, United States<br />
                    Email:{ " " }<a href="mailto:support@goldridr.com" className={ linkClass }>support@goldridr.com</a>
                  </p>
                  <p className="mt-4">
                    If we cannot resolve your concern, you may contact the privacy or consumer-protection
                    authority where you live, including the Texas Attorney General where applicable.
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
