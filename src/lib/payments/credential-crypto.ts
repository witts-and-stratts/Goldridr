import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key( secret: string ): Buffer {
  return createHash( "sha256" ).update( secret ).digest();
}

export function encryptPaymentCredential( value: string, secret: string ): string {
  const iv = randomBytes( 12 );
  const cipher = createCipheriv( "aes-256-gcm", key( secret ), iv );
  const encrypted = Buffer.concat( [ cipher.update( value, "utf8" ), cipher.final() ] );
  return `v1:${ iv.toString( "base64url" ) }:${ cipher.getAuthTag().toString( "base64url" ) }:${ encrypted.toString( "base64url" ) }`;
}

export function decryptPaymentCredential( value: string, secret: string ): string {
  const [ version, ivValue, tagValue, encryptedValue ] = value.split( ":" );
  if ( version !== "v1" || !ivValue || !tagValue || !encryptedValue ) throw new Error( "Stored payment credential is invalid" );
  const decipher = createDecipheriv( "aes-256-gcm", key( secret ), Buffer.from( ivValue, "base64url" ) );
  decipher.setAuthTag( Buffer.from( tagValue, "base64url" ) );
  return Buffer.concat( [ decipher.update( Buffer.from( encryptedValue, "base64url" ) ), decipher.final() ] ).toString( "utf8" );
}
