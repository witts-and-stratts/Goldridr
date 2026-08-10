# Twilio A2P 10DLC implementation plan

Prepared 9 August 2026 from:

- [Twilio: A2P 10DLC Campaign Onboarding Guide](https://help.twilio.com/articles/11847054539547-A2P-10DLC-Campaign-Onboarding-Guide)
- [Twilio: A2P 10DLC Campaign with Twilio — First Time Success](https://www.youtube.com/watch?v=IUXJbMD7Qz4)
- The local GoldRidrsource tree and the public site at `https://goldridr.com`

## Goal

Submit two internally consistent campaigns—transactional GoldRidrRide Notifications and
marketing GoldRidrOffers—with separate public evidence of voluntary consent, compliant
policies, accurate company details, working STOP/HELP handling, and matching samples.

## Current position

The application already has most of the required foundation:

- a separate, unchecked booking-form SMS checkbox;
- consent-specific frequency, rate, HELP, STOP, and no-purchase-required disclosures;
- `/privacy` and `/terms` pages with SMS provisions;
- consent timestamp/version/source storage and an `sms_consents` ledger;
- send-time consent suppression;
- signed Twilio inbound-webhook validation;
- STOP, START, and HELP classification;
- branded transactional message templates; and
- a campaign-registration draft in `docs/a2p-10dlc-compliance.md`.

Implementation completed locally:

1. `/book` and its service routes exist and render successfully in the local production code; production still needs the new image deployed.
2. The fake public phone fallback was removed. `NEXT_PUBLIC_CONTACT_PHONE` now controls the real number, and the phone block is omitted when it is blank.
3. All consent surfaces use **Rates** and the required “Message and data rates may apply” wording.
4. Public/legal pages and HELP replies consistently use `concierge@goldridr.com`.
5. The registration packet now uses `goldridr.com` URLs and the bundled evidence asset at `/assets/a2p-sms-consent.png`.
6. The server-rendered SMS terms block is visible on every `/book` route.
7. Regression tests cover required copy, recurring confirmation content, all operational template opt-outs, request evidence, webhook URL reconstruction, and public-surface invariants.

Do not submit until the production deployment and real-handset verification steps are complete.

## Phase 1 — Freeze the campaign definition

Owner: product/compliance

- Campaign/program name: **GoldRidrRide Notifications**.
- Sender/brand: **GoldRidrTechnology LLC**, with `goldridr.com` and an email on that domain.
- Transactional recipients: passengers who separately select GoldRidrRide Notifications.
- Transactional content: booking confirmations, pickup reminders, chauffeur assignment/arrival, and ride changes/cancellations only.
- Marketing recipients: customers who separately select GoldRidrOffers.
- Marketing content: special offers, new-service announcements, and ride promotions only. Exclude cold outreach.
- Register the two programs separately: `LOW_VOLUME` or the matching transactional standard use case for Ride Notifications, and `MARKETING` for GoldRidrOffers. Do not infer either consent from the other.
- Record whether production messages contain links or phone numbers and set `has_embedded_links` and `has_embedded_phone` truthfully. Current templates appear to contain neither.

Exit criterion: each campaign's description, use case, message flow, policies, and samples describe only that program.

## Phase 2 — Remove public consistency blockers

Owner: web

1. Replace all placeholder telephone numbers in `src/app/contact/page.tsx` with the real business number. Update its vCard data and visible copy together.
2. Choose one monitored support address and use it everywhere:
   - `src/app/contact/page.tsx`
   - `src/app/privacy/page.tsx`
   - `src/app/terms/page.tsx`
   - `src/app/api/webhooks/twilio/route.ts`
   - `docs/a2p-10dlc-compliance.md`
3. Change the `SmsConsent.tsx` heading from **Standard Rates** to **Rates**. Keep the disclosure itself exactly: “Message and data rates may apply.”
4. Keep the checkbox separate, optional, and off by default. Do not combine it with general Terms or Privacy acceptance.
5. Confirm the phone field and booking remain usable without SMS opt-in. If the phone number is operationally required for the ride, say that clearly while keeping the SMS checkbox optional; do not claim the phone field is optional unless production behaves that way.
6. Deploy the local `/book`, `/book/airport`, `/book/city`, and `/book/hourly` routes, or change the registration flow to the actual public homepage overlay. Never submit a 404 URL.
7. Render `SmsProgramTerms` publicly on booking pages, or add a dedicated public `/sms` disclosure page. A reviewer should be able to verify the call-to-action without completing unrelated fields.

Exit criterion: brand name, legal entity, domain, phone number, support email, policies, and visible consent language match on every public surface.

## Phase 3 — Make consent evidence reviewable

Owner: web/compliance

- Capture a screenshot that includes, in one frame:
  - the phone field context;
  - the unchecked checkbox;
  - GoldRidrRide Notifications/service description;
  - “Message and data rates may apply”;
  - frequency (“up to 6 messages per booking”);
  - “Reply HELP for help”;
  - “Reply STOP to opt out/cancel”;
  - the no-purchase-required statement; and
  - visible Privacy Policy and Terms links.
- Host the screenshot at a stable, publicly accessible URL with no login, expiry, or access request.
- In the Twilio `message_flow` field, include the live booking URL, click path if a multi-step overlay remains, and screenshot URL.
- Describe every opt-in method actually used. Do not list verbal, paper, QR, or keyword enrollment unless GoldRidrreally supports it and can provide the required public proof.

Exit criterion: an unauthenticated reviewer can reproduce or inspect opt-in from the submitted URLs.

## Phase 4 — Align recurring-message and keyword behavior

Owner: backend/Twilio administrator

1. Ensure the first post-opt-in message is sent immediately and includes:
   - GoldRidror GoldRidrRide Notifications;
   - enrollment/booking confirmation;
   - message frequency;
   - “Message and data rates may apply”;
   - HELP contact; and
   - STOP instructions.
2. Decide on exactly one reply owner:
   - preferred: enable Twilio Advanced Opt-Out and keep `TWILIO_INBOUND_AUTO_REPLY=false`; or
   - disable Advanced Opt-Out and set `TWILIO_INBOUND_AUTO_REPLY=true` so GoldRidrsends the configured TwiML replies.
3. Configure the Messaging Service inbound webhook as `POST https://goldridr.com/api/webhooks/twilio` and set `TWILIO_WEBHOOK_URL` to that exact URL for signature validation behind the proxy.
4. Verify HELP supplies the same monitored support contact published on the site.
5. Verify STOP acknowledges the request, names Goldridr, and confirms no further messages.
6. Keep START/UNSTOP restoration limited to numbers with a prior consent record; do not treat an unsolicited START as sufficient consent for a never-enrolled number.

Exit criterion: one real US test number can opt in, receive the immediate confirmation, request HELP, opt out, remain suppressed, and re-enroll without duplicate replies.

## Phase 5 — Complete the Twilio registration packet

Owner: compliance/Twilio administrator

Update `docs/a2p-10dlc-compliance.md` so it is paste-ready:

- remove all placeholders;
- use the exact public URLs;
- identify who sends, who receives, and why in the campaign description;
- keep PII out of descriptions and samples; use `[Passenger Name]`, `[Booking Reference]`, and `[Date]` placeholders;
- provide 2–5 samples that mirror production templates;
- brand every sample;
- include “Reply STOP to opt out” in at least one sample (preferably every recurring operational sample, matching production);
- supply Privacy and Terms URLs in their dedicated fields;
- select link/phone-number flags truthfully; and
- enter opt-in, opt-out, and HELP keywords/messages only for the response model actually configured.

Recommended campaign description:

> GoldRidrTechnology LLC sends transactional GoldRidrRide Notifications to passengers who book chauffeured transportation and voluntarily opt in on the GoldRidrbooking form. Messages include booking confirmations, pickup reminders, chauffeur assignment or arrival updates, and changes or cancellations affecting the passenger's scheduled ride. This campaign does not send marketing or promotional content.

## Phase 6 — Verification and release gate

Owner: engineering/compliance

Add automated coverage for:

- checkbox default-off behavior and exact disclosure copy;
- booking with no SMS consent;
- consent timestamp/version/source persistence after opt-in;
- suppression for no-consent and revoked numbers;
- first-message full disclosure;
- branded HELP, STOP, and opt-in confirmation bodies;
- valid and invalid Twilio signatures;
- forwarded-host/protocol webhook URL reconstruction; and
- prevention of duplicate Advanced Opt-Out/application replies.

Run:

```text
npm test
npm run lint
npm run build
```

Then verify production URLs and perform the handset flow before submission. Archive screenshots, submitted field values, policy versions, and the successful test transcript with the campaign record.

## Submission gate

Submit only when every item below is true:

- [ ] `/book` or the submitted alternative loads publicly.
- [ ] Privacy and Terms URLs load publicly and contain the required SMS provisions.
- [ ] No public placeholder phone numbers or conflicting support contacts remain.
- [ ] Consent screenshot is public and matches production exactly.
- [ ] Checkbox is separate, voluntary, and unchecked by default.
- [ ] Immediate opt-in confirmation contains all five Twilio-required elements.
- [ ] HELP and STOP work from a real handset without duplicate replies.
- [ ] Campaign description, use case, samples, website, and brand registration are consistent.
- [ ] No consumer PII appears in registration fields.
- [ ] Tests, lint, and production build pass.

Twilio currently warns that campaign review may take about five business days during high submission volume; schedule submission only after the release and evidence package are complete.
