# A2P 10DLC Compliance

How GoldRidrcollects SMS consent, what it sends, and what to paste into the Twilio
campaign registration form.

Source of the requirements: Twilio, *A2P 10DLC Campaign with Twilio – First Time
Success* (<https://www.youtube.com/watch?v=IUXJbMD7Qz4>), plus
<https://www.twilio.com/docs/sms/a2p-10dlc> and
<https://help.twilio.com/articles/11847054539547>.

---

## 1. Where consent is collected

GoldRidrhas exactly **one** opt-in method: a web form with two separate program choices.
There is no verbal script, no
paper form and no SMS keyword opt-in. If any of those are ever added, every one of them
must be documented in the registration — missing a single flow is an automatic
rejection.

The opt-in lives on the booking form, step 2 (passenger contact details), rendered by
`src/components/booking/SmsConsent.tsx`.

Directly reachable URLs:

| URL | Flow |
|---|---|
| `/book` | Service picker |
| `/book/airport` | Airport transfer |
| `/book/city` | Around town |
| `/book/hourly` | Hourly charter |

The same flow is also reachable as an overlay on any page via the `#book`,
`#book-airport`, `#book-city` and `#book-hourly` hashes.

### Why the form passes review

| Rule | Implementation |
|---|---|
| Checkbox is not pre-checked | `SmsConsent.tsx` — `checked={ field.state.value === true }`, default `false` in each form's `defaultValues` |
| Consent is not bundled | Two separate optional checkboxes: GoldRidrOffers (marketing) and GoldRidrRide Notifications (transactional). Selecting one never selects the other |
| Consent is not required to transact | Phone field is labelled "Phone (optional)"; `phone: z.string().optional()` in `src/app/api/booking/route.ts`. The form submits with the field blank |
| Disclosure shown at opt-in | Frequency, rates and HELP/STOP, from `src/lib/sms-consent-copy.ts` |
| Privacy policy linked at opt-in | `/terms` and `/privacy` links inside the consent block |

### Evidence to attach to the submission

The checkbox is on step 2 of a multi-step form, so a reviewer given only a URL may not
reach it. **Attach a screenshot** of the consent block, hosted publicly (Google Drive,
link sharing on), alongside the URL.

There is also a server-rendered `SmsProgramTerms` block in
`src/components/booking/BookingPageShell.tsx`. It puts the same disclosure in the initial
HTML of every `/book` page, where a reviewer sees it without JavaScript or completing
step 1. The hosted screenshot remains the clearest evidence of the actual unchecked box.

---

## 2. Privacy policy

`src/app/privacy/page.tsx` carries the clause carriers scan for, verbatim:

> No mobile information will be shared with third parties or affiliates for marketing or
> promotional purposes.

`src/app/terms/page.tsx` repeats the commitment and describes the messaging programme.
Do not reword either without re-checking this requirement — its absence is a guaranteed
rejection.

---

## 3. What we send

All message bodies are built in `smsBody()` in `src/lib/notifications/worker.ts`. Every
message carries an opt-out instruction; the first message of a booking carries the full
disclosure.

| Template | Trigger |
|---|---|
| `booking_created` | Booking request received — **first message**, full disclosure |
| `booking_reminder` | Ahead of pickup |
| `booking_assignment` | Chauffeur assigned or awaiting assignment |
| `booking_deleted` | Booking removed |
| `booking_status` (default) | Status change |
| `manual_message` / `broadcast` | Admin-composed from the admin UI |

Wording lives in `src/lib/sms-consent-copy.ts` and is shared by the consent checkbox and
the message bodies, so the two cannot drift apart. That shared module is what keeps us
honest against the rule *what the customer sees is what Twilio sees*.

Sending is gated on consent: `src/app/api/admin/messages/route.ts` and
`src/app/api/admin/reminders/route.ts` both refuse an SMS channel unless the booking has
both a phone number and `smsConsentedAt`.

---

## 4. Opt-out and HELP handling

`POST /api/webhooks/twilio` (`src/app/api/webhooks/twilio/route.ts`).

- Validates `x-twilio-signature` with `twilio.validateRequest`. Rejects with 403 on
  mismatch and 503 in production when Twilio is unconfigured. Unsigned requests are
  accepted only under the local mock transport.
- `STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`, `REVOKE`, `OPTOUT` → revoke.
- `START`, `UNSTOP`, `YES`, `OPTIN` → restore, but only for a number that previously
  consented.
- `HELP`, `INFO` → help response.
- Anything else is logged as an ordinary inbound message and ignored.

Keyword matching is exact after normalisation, so "please stop the car at gate 3" is not
an opt-out (`tests/sms-consent.test.ts`).

Revoking clears `smsConsentedAt` on **every** booking for that number and sets
`revokedAt` on the `sms_consents` ledger, so the send gates above stop firing
immediately.

The endpoint returns empty TwiML by default, because Twilio Advanced Opt-Out already
sends the carrier-mandated replies — returning our own as well would send the passenger
two messages. Set `TWILIO_INBOUND_AUTO_REPLY=true` only if Advanced Opt-Out is disabled
on the Messaging Service. It always returns 200; a non-200 on a STOP would only trigger
Twilio retries.

### Consent ledger

`sms_consents` (PocketBase) is the audit trail: `customerEmail`, `phone`,
`consentVersion`, `consentedAt`, `revokedAt`. Written on opt-in by
`src/app/api/booking/route.ts` and on opt-out by the webhook, both via
`src/lib/notifications/sms-consent.ts`. Phone numbers are normalised to their last 10
digits, because booking phones are free text while Twilio always sends E.164.

The current consent wording is version `2026-08`. **Bump `smsConsentVersion` in
`src/app/api/booking/route.ts` whenever the copy in `sms-consent-copy.ts` changes**, so
each stored consent points at the exact language the customer agreed to.

---

## 5. Configuration

| Variable | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | Credentials; the auth token also validates inbound webhook signatures |
| `TWILIO_WEBHOOK_URL` | Public URL Twilio posts to. Required for signature validation behind a proxy |
| `TWILIO_INBOUND_AUTO_REPLY` | `false` while Advanced Opt-Out is enabled |

In the Twilio Console, set the Messaging Service **"A message comes in"** webhook to
`https://goldridr.com/api/webhooks/twilio` (HTTP POST).

---

## 6. Pre-submission checklist

- [ ] Deploy and verify every URL in the submission. A 404 is an immediate rejection.
- [ ] Verify `https://goldridr.com/assets/a2p-sms-consent.png` loads publicly after deployment.
- [x] Brand name, website domain and support email match in source.
- [ ] Set the repository variable `NEXT_PUBLIC_CONTACT_PHONE` to the real public business
      number before the production image is built. When it is blank, the contact page omits
      phone contact instead of displaying placeholder data.
- [ ] Select **Low Volume** when eligible, otherwise the single standard transactional use
      case that Twilio confirms matches the production content (most likely Customer Care).
      Do not select Marketing or Mixed for the current message set.
- [x] Sample messages cover every production template in §3.
- [x] Every sample names the brand and ends with opt-out instructions.

---

## 7. Text for the Twilio campaign registration

Replace `<…>` placeholders before submitting. Everything else is ready to paste.

### Campaign description

```
GoldRidris a chauffeured car service operating in Houston, Texas. This campaign sends
transactional notifications to passengers about rides they have booked with us:
booking confirmation, pickup reminders, chauffeur assignment, and changes to a
scheduled ride. We do not send marketing, promotional or sales messages on this
campaign. Only passengers who have booked a ride and explicitly ticked the SMS consent
box on our booking form receive messages, and only about their own booking.
```

### How do end users consent to receive messages?

```
End users opt in through a checkbox on the booking form at https://goldridr.com/book
(also reachable at /book/airport, /book/city and /book/hourly). Consent is collected on
step 2 of the form, alongside passenger contact details. A screenshot of the consent
step is available here: https://goldridr.com/assets/a2p-sms-consent.png

The phone number field is optional and the booking form submits successfully without a
phone number, so consent to receive text messages is never a condition of booking a
ride. Both checkboxes are optional, are not pre-checked, and must be selected manually.

The transactional checkbox reads:
"Yes, I would like to receive automated transactional text messages from GoldRidrabout my booking
confirmations, pickup reminders, chauffeur arrival updates and changes to my scheduled
ride."

Displayed inside the same transactional opt-in message, before submission:
- Message Frequency: Message frequency varies. You will receive up to 6 messages per
  booking.
- Rates: Message and data rates may apply depending on your mobile phone
  service plan.
- Help & Stop: Reply HELP for help. Reply STOP to cancel at any time.
- Consent is not required to make a purchase or book a ride.

Links to our Terms of Service (https://goldridr.com/terms) and Privacy Policy
(https://goldridr.com/privacy) are shown next to the checkbox at the point of consent.

This web form is our only opt-in method. We do not collect consent verbally, on paper,
or by SMS keyword.
```

### Opt-in message (first message received)

```
Goldridr: we received booking GR-1A2BCD for 2026-08-14 at 14:30. Terminal: C. We will
notify you when it is confirmed. Msg frequency varies, up to 6 msgs per booking. Msg &
data rates may apply. Reply HELP for help, STOP to cancel.
```

### Opt-out message

```
You have been unsubscribed from GoldRidrmessages. No further messages will be sent.
Reply START to resubscribe.
```

### Help message

```
GoldRidrride notifications. Msg frequency varies, up to 6 msgs per booking. Msg & data
rates may apply. Reply STOP to cancel. Support: concierge@goldridr.com
```

### Sample messages

```
1. Goldridr: we received booking GR-1A2BCD for 2026-08-14 at 14:30. Terminal: C. We
   will notify you when it is confirmed. Msg frequency varies, up to 6 msgs per
   booking. Msg & data rates may apply. Reply HELP for help, STOP to cancel.

2. GoldRidrupdate: booking GR-1A2BCD is now confirmed. Terminal: C. Reply STOP to opt
   out.

3. GoldRidrupdate: James O. is assigned to booking GR-1A2BCD. Terminal: C. Reply STOP
   to opt out.

4. GoldRidrreminder: booking GR-1A2BCD is scheduled for 2026-08-14 at 14:30. Terminal:
   C. Reply STOP to opt out.

5. GoldRidrupdate: booking GR-1A2BCD was deleted. Terminal: C. Contact us if this was
   unexpected. Reply STOP to opt out.
```

### Opt-out handling (if asked to describe it)

```
Passengers may reply STOP, STOPALL, UNSUBSCRIBE, CANCEL, END or QUIT to any message.
Twilio Advanced Opt-Out blocks the number at the carrier level, and our inbound webhook
records the revocation against the phone number in our consent ledger and clears the
consent flag on every booking held for that number, so no further messages can be
queued. Replying START, UNSTOP or YES restores consent for a number that previously
opted in. Replying HELP returns our programme name, message frequency, rate disclosure
and support contact.
```

### Privacy policy language (already live at `/privacy`)

```
No mobile information will be shared with third parties or affiliates for marketing or
promotional purposes.
```

---

## 8. Separate GoldRidrOffers campaign

The marketing checkbox does not expand the transactional campaign above. Register and
approve **GoldRidrOffers** as a separate marketing campaign before sending promotional
texts. Do not import the marketing consent into GoldRidrRide Notifications or treat a
transactional opt-in as marketing consent.

### Marketing campaign description

```
GoldRidrTechnology LLC sends recurring GoldRidrOffers messages to customers who
separately and voluntarily opt in on the GoldRidrbooking form. Messages include special
offers, new-service announcements, and ride promotions. Customers may book without
joining this program. GoldRidrRide Notifications use a different checkbox and campaign.
```

### Marketing message flow

```
End users opt in through the unchecked GoldRidrOffers checkbox on step 2 of the booking
form at https://goldridr.com/book. Evidence is available at
https://goldridr.com/assets/a2p-sms-consent.png. The phone field and both SMS choices are
optional. The GoldRidrOffers checkbox states that messages are recurring automated
marketing texts about special offers, new services and ride promotions; frequency varies,
up to 4 messages per month; message and data rates may apply; reply HELP for help and
STOP to cancel; and consent is not required to purchase or book. Terms and Privacy links
are displayed beside both choices. Selecting GoldRidrOffers does not select Goldridr
Ride Notifications, and selecting Ride Notifications does not select GoldRidrOffers.
```

### Marketing opt-in confirmation

```
Welcome to GoldRidrOffers! Up to 4 msgs/month. Msg & data rates may apply. Reply HELP
for help, STOP to cancel.
```

### Marketing sample messages

```
GoldRidrOffers: Save [Discount] on your next chauffeured ride with code [Code] through
[Expiry Date]. Reply STOP to opt out.

GoldRidrOffers: [New Service] is now available for Houston-area reservations. Learn more
at [GoldRidrURL]. Reply STOP to opt out.
```
