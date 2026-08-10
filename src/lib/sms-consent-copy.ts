// A2P 10DLC reviewers compare the disclosure a customer sees at opt-in against the
// disclosure carried by the messages we actually send. Both are defined here so the two
// can never drift apart.

// Long form — shown at the point of consent on the booking form and the /book page.
export const SMS_CONSENT_FREQUENCY = "Message frequency may vary.";
export const SMS_CONSENT_RATES = "Message and data rates may apply.";
export const SMS_CONSENT_HELP_STOP = "Reply HELP for help. STOP to opt out.";
export const SMS_CONSENT_VERSION = "2026-08";
export const SMS_PROGRAM_NAME = "GoldRidrRide Notifications";
export const SMS_MARKETING_PROGRAM_NAME = "GoldRidrOffers";
export const SMS_SUPPORT_EMAIL = "concierge@goldridr.com";
export const SMS_CONSENT_CALL_TO_ACTION =
  "By checking this box you agree to receive Transactional SMS communication regarding account notifications, booking confirmations, and ride updates from Goldridr.";
export const SMS_CONSENT_DISCLOSURE = [
  `${ SMS_PROGRAM_NAME }.`,
  SMS_CONSENT_CALL_TO_ACTION,
  SMS_CONSENT_FREQUENCY,
  SMS_CONSENT_RATES,
  SMS_CONSENT_HELP_STOP,
].join( " " );
export const SMS_MARKETING_CONSENT_CALL_TO_ACTION =
  "By checking this box you agree to receive Marketing SMS from Goldridr.";
export const SMS_MARKETING_FREQUENCY = "Message frequency varies.";
export const SMS_MARKETING_CONSENT_DISCLOSURE = [
  `${ SMS_MARKETING_PROGRAM_NAME }.`,
  SMS_MARKETING_CONSENT_CALL_TO_ACTION,
  SMS_MARKETING_FREQUENCY,
  SMS_CONSENT_RATES,
  SMS_CONSENT_HELP_STOP,
].join( " " );

// Condensed form — appended to outgoing message bodies, where segment count matters.
export const SMS_BODY_OPT_OUT = "Reply STOP to opt out.";
export const SMS_BODY_FULL_DISCLOSURE = "Message frequency varies. Message & data rates may apply. Reply HELP for help, STOP to cancel.";
export const SMS_HELP_REPLY = `Message frequency varies. Message & data rates may apply. Reply STOP to cancel. Support: ${ SMS_SUPPORT_EMAIL }`;
export const SMS_OPT_OUT_REPLY = `You have been unsubscribed from ${ SMS_PROGRAM_NAME }. No further messages will be sent. Reply START to resubscribe.`;
export const SMS_OPT_IN_REPLY = `You are subscribed to ${ SMS_PROGRAM_NAME }. Message frequency varies. Message & data rates may apply. Reply HELP for help, STOP to cancel.`;
