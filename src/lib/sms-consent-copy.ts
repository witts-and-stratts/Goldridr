// A2P 10DLC reviewers compare the disclosure a customer sees at opt-in against the
// disclosure carried by the messages we actually send. Both are defined here so the two
// can never drift apart.

// Long form — shown at the point of consent on the booking form and the /book page.
export const SMS_CONSENT_FREQUENCY = "Message frequency varies, up to 6 messages per booking.";
export const SMS_CONSENT_RATES = "Message and data rates may apply.";
export const SMS_CONSENT_HELP_STOP = "Reply HELP for help. Reply STOP to cancel.";
export const SMS_CONSENT_NOT_REQUIRED = "Consent is not required to make a purchase or book a ride.";
export const SMS_CONSENT_VERSION = "2026-08";
export const SMS_PROGRAM_NAME = "GoldRidr Ride Notifications";
export const SMS_MARKETING_PROGRAM_NAME = "GoldRidr Offers";
export const SMS_SUPPORT_EMAIL = "concierge@goldridr.com";
export const SMS_CONSENT_CALL_TO_ACTION =
  "By checking this box, you agree to receive automated transactional text messages regarding account notifications, booking confirmations, and ride updates from GoldRidr.";
export const SMS_CONSENT_DISCLOSURE = [
  `${ SMS_PROGRAM_NAME }.`,
  SMS_CONSENT_CALL_TO_ACTION,
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_RATES,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_NOT_REQUIRED,
].join( " " );
export const SMS_MARKETING_CONSENT_CALL_TO_ACTION =
  "By checking this box, you agree to receive automated marketing text messages from GoldRidr.";
export const SMS_MARKETING_FREQUENCY = "Message frequency varies, up to 4 messages per month.";
export const SMS_MARKETING_CONSENT_DISCLOSURE = [
  `${ SMS_MARKETING_PROGRAM_NAME }.`,
  SMS_MARKETING_CONSENT_CALL_TO_ACTION,
  SMS_MARKETING_FREQUENCY,
  SMS_CONSENT_RATES,
  SMS_CONSENT_HELP_STOP,
  SMS_CONSENT_NOT_REQUIRED,
].join( " " );

// Condensed form — appended to outgoing message bodies, where segment count matters.
export const SMS_BODY_OPT_OUT = "Reply STOP to opt out.";
export const SMS_BODY_FULL_DISCLOSURE = "Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply HELP for help, STOP to cancel.";
export const SMS_HELP_REPLY = `${ SMS_PROGRAM_NAME }: Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply STOP to cancel. Support: ${ SMS_SUPPORT_EMAIL }`;
export const SMS_OPT_OUT_REPLY = `You have been unsubscribed from ${ SMS_PROGRAM_NAME }. No further messages will be sent. Reply START to resubscribe.`;
export const SMS_OPT_IN_REPLY = `You are subscribed to ${ SMS_PROGRAM_NAME }. Msg frequency varies, up to 6 msgs per booking. Msg & data rates may apply. Reply HELP for help, STOP to cancel.`;
