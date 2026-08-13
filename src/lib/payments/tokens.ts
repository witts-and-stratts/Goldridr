import { createHash, randomBytes } from "crypto";

export function paymentToken(): string {
  return randomBytes( 32 ).toString( "base64url" );
}

export function paymentTokenHash( token: string ): string {
  return createHash( "sha256" ).update( token ).digest( "hex" );
}
