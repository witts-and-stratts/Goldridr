export type EmailTransportName = "smtp" | "ses_api" | "ses_smtp" | "resend" | "mailpit";
export type SmsTransportName = "twilio" | "mock";

type CommonEmailConfig = {
  fromName: string;
  fromAddress: string;
  replyTo?: string;
};

export type EmailConfig =
  | ( CommonEmailConfig & { transport: "smtp"; host: string; port: number; secure: boolean; user: string; password: string } )
  | ( CommonEmailConfig & { transport: "ses_smtp"; host: string; port: number; secure: boolean; user: string; password: string } )
  | ( CommonEmailConfig & { transport: "ses_api"; region: string; configurationSet?: string } )
  | ( CommonEmailConfig & { transport: "mailpit"; host: string; port: number; secure: boolean } )
  | ( CommonEmailConfig & { transport: "resend"; apiKey: string } );

export type SmsConfig =
  | { transport: "twilio"; accountSid: string; authToken: string; from: string; }
  | { transport: "mock"; from: string; };

export function getConfiguredSmsTransport(): SmsTransportName {
  return ( process.env.TWILIO_TRANSPORT || ( process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? "twilio" : "mock" ) ) as SmsTransportName;
}

function required( name: string ): string {
  const value = process.env[ name ]?.trim();
  if ( !value ) throw new Error( `${ name } is required` );
  return value;
}

function port( name: string, fallback: number ): number {
  const value = Number( process.env[ name ] || fallback );
  if ( !Number.isInteger( value ) || value <= 0 ) throw new Error( `${ name } must be a valid port` );
  return value;
}

function bool( name: string, fallback = false ): boolean {
  const value = process.env[ name ];
  if ( value === undefined ) return fallback;
  if ( value !== "true" && value !== "false" ) throw new Error( `${ name } must be true or false` );
  return value === "true";
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const transport = ( process.env.EMAIL_TRANSPORT || "smtp" ) as EmailTransportName;
  if ( ![ "smtp", "ses_api", "ses_smtp", "resend", "mailpit" ].includes( transport ) ) {
    throw new Error( `Unsupported EMAIL_TRANSPORT: ${ transport }` );
  }

  if ( transport === "mailpit" ) {
    const fromName = await getEmailFromName();
    const fromAddress = await getEmailFromAddress();
    return {
      fromName,
      fromAddress,
      replyTo: await getEmailReplyTo(),
      transport: "mailpit",
      host: process.env.MAILPIT_HOST?.trim() || "127.0.0.1",
      port: port( "MAILPIT_PORT", 1025 ),
      secure: bool( "MAILPIT_SECURE" ),
    };
  }

  const common: CommonEmailConfig = {
    fromName: await getEmailFromName(),
    fromAddress: await getEmailFromAddress(),
    replyTo: await getEmailReplyTo(),
  };

  if ( transport === "smtp" ) {
    return {
      ...common,
      transport: "smtp",
      host: required( "SMTP_HOST" ),
      port: port( "SMTP_PORT", 587 ),
      secure: bool( "SMTP_SECURE" ),
      user: required( "SMTP_USER" ),
      password: required( "SMTP_PASSWORD" ),
    };
  }
  if ( transport === "ses_smtp" ) {
    return {
      ...common,
      transport: "ses_smtp",
      host: required( "SES_SMTP_HOST" ),
      port: port( "SES_SMTP_PORT", 587 ),
      secure: bool( "SES_SMTP_SECURE" ),
      user: required( "SES_SMTP_USER" ),
      password: required( "SES_SMTP_PASSWORD" ),
    };
  }
  if ( transport === "ses_api" ) {
    return {
      ...common,
      transport: "ses_api",
      region: required( "AWS_REGION" ),
      configurationSet: process.env.SES_CONFIGURATION_SET?.trim() || undefined,
    };
  }
  return { ...common, transport: "resend", apiKey: required( "RESEND_API_KEY" ) };
}

export async function getSmsConfig() {
  const transport = getConfiguredSmsTransport();
  if ( transport === "mock" ) {
    return {
      transport: "mock" as const,
      from: await getTwilioFromNumber(),
    };
  }

  return {
    transport: "twilio" as const,
    accountSid: required( "TWILIO_ACCOUNT_SID" ),
    authToken: required( "TWILIO_AUTH_TOKEN" ),
    from: await getTwilioFromNumber(),
  };
}
import {
  getEmailFromAddress,
  getEmailFromName,
  getEmailReplyTo,
  getTwilioFromNumber,
} from "@/lib/admin-settings";
