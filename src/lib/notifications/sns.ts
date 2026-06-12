import { createVerify } from "crypto";

interface SnsMessage {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: "1" | "2";
  Signature: string;
  SigningCertURL: string;
  Subject?: string;
  Token?: string;
  SubscribeURL?: string;
}

function canonicalMessage( message: SnsMessage ): string {
  const fields = message.Type === "Notification"
    ? [ "Message", "MessageId", ...( message.Subject ? [ "Subject" ] : [] ), "Timestamp", "TopicArn", "Type" ]
    : [ "Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type" ];
  return fields.map( field => `${ field }\n${ String( message[ field as keyof SnsMessage ] || "" ) }\n` ).join( "" );
}

function validCertificateUrl( value: string ): boolean {
  try {
    const url = new URL( value );
    return url.protocol === "https:"
      && /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test( url.hostname )
      && /^\/SimpleNotificationService-[A-Za-z0-9_-]+\.pem$/.test( url.pathname );
  } catch {
    return false;
  }
}

export async function verifySnsMessage( message: SnsMessage ): Promise<boolean> {
  if ( !validCertificateUrl( message.SigningCertURL ) ) return false;
  if ( message.SignatureVersion !== "1" && message.SignatureVersion !== "2" ) return false;
  const response = await fetch( message.SigningCertURL, { cache: "force-cache" } );
  if ( !response.ok ) return false;
  const certificate = await response.text();
  const verifier = createVerify( message.SignatureVersion === "1" ? "RSA-SHA1" : "RSA-SHA256" );
  verifier.update( canonicalMessage( message ), "utf8" );
  verifier.end();
  return verifier.verify( certificate, message.Signature, "base64" );
}

export type { SnsMessage };
