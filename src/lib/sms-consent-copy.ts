// A2P 10DLC reviewers compare the disclosure a customer sees at opt-in against the
// disclosure carried by the messages we actually send. Both are defined here so the two
// can never drift apart.

// Long form — shown at the point of consent on the booking form and the /book page.
export const SMS_CONSENT_FREQUENCY = "Message frequency varies. You will receive up to 6 messages per booking.";
export const SMS_CONSENT_RATES = "Message and data rates may apply depending on your mobile phone service plan.";
export const SMS_CONSENT_HELP_STOP = "Reply HELP for help or STOP to cancel at any time.";
export const SMS_CONSENT_NOT_REQUIRED = "Consent is not required to make a purchase or book a ride.";

// Condensed form — appended to outgoing message bodies, where segment count matters.
export const SMS_BODY_OPT_OUT = "Reply STOP to opt out.";
export const SMS_BODY_FULL_DISCLOSURE = "Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply HELP for help, STOP to cancel.";
