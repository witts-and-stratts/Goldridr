import {
  SMS_CONSENT_DISCLOSURE,
  SMS_CONSENT_VERSION,
  SMS_MARKETING_CONSENT_DISCLOSURE,
} from "@/lib/sms-consent-copy";

export type SmsCampaignType = "transactional" | "marketing";

export type SmsConsentEvidence = {
  consentVersion: string;
  campaignType: SmsCampaignType;
  consentSource: "web_booking";
  consentText: string;
  ipAddress: string;
  userAgent: string;
};

export function smsConsentEvidenceFromRequest(
  request: Request,
  campaignType: SmsCampaignType = "transactional"
): SmsConsentEvidence {
  const forwardedFor = request.headers.get( "x-forwarded-for" )
    ?.split( "," )[ 0 ]
    ?.trim();

  return {
    consentVersion: SMS_CONSENT_VERSION,
    campaignType,
    consentSource: "web_booking",
    consentText: campaignType === "marketing"
      ? SMS_MARKETING_CONSENT_DISCLOSURE
      : SMS_CONSENT_DISCLOSURE,
    ipAddress: ( forwardedFor || request.headers.get( "x-real-ip" ) || "" ).slice( 0, 120 ),
    userAgent: ( request.headers.get( "user-agent" ) || "" ).slice( 0, 1000 ),
  };
}
