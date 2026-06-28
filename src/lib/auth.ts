import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { getChauffeurById } from "@/lib/db";

export const SESSION_COOKIE = "goldridr_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export interface AuthSession {
  role: "admin" | "chauffeur";
  userId: string;
  chauffeurId?: number;
  name: string;
  email: string;
  expiresAt: number;
}

function getSessionSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if ( !secret ) throw new Error( "AUTH_SECRET is not configured" );
  return secret;
}

function encode( value: string ): string {
  return Buffer.from( value ).toString( "base64url" );
}

function decode( value: string ): string {
  return Buffer.from( value, "base64url" ).toString( "utf8" );
}

function sign( payload: string ): string {
  return createHmac( "sha256", getSessionSecret() ).update( payload ).digest( "base64url" );
}

export function createSessionToken(
  session: Omit<AuthSession, "expiresAt">
): string {
  const payload = encode( JSON.stringify( {
    ...session,
    expiresAt: Math.floor( Date.now() / 1000 ) + SESSION_DURATION_SECONDS,
  } satisfies AuthSession ) );
  return `${ payload }.${ sign( payload ) }`;
}

export function verifySessionToken( token?: string | null ): AuthSession | null {
  if ( !token ) return null;
  const [ payload, signature ] = token.split( "." );
  if ( !payload || !signature ) return null;

  const expected = Buffer.from( sign( payload ) );
  const actual = Buffer.from( signature );
  if ( expected.length !== actual.length || !timingSafeEqual( expected, actual ) ) return null;

  try {
    const session = JSON.parse( decode( payload ) ) as AuthSession;
    if ( session.expiresAt <= Math.floor( Date.now() / 1000 ) ) return null;
    if ( session.role === "chauffeur" && !session.chauffeurId ) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  let session = verifySessionToken( cookieStore.get( SESSION_COOKIE )?.value );

  // The mobile app cannot send browser cookies — it authenticates with an
  // `Authorization: Bearer <token>` header carrying the same signed payload.
  if ( !session ) {
    const header = ( await headers() ).get( "authorization" );
    if ( header?.startsWith( "Bearer " ) ) {
      session = verifySessionToken( header.slice( "Bearer ".length ).trim() );
    }
  }

  if ( session?.role === "chauffeur" && !getChauffeurById( session.chauffeurId! ) ) {
    return null;
  }
  return session;
}

export async function setSession( session: Omit<AuthSession, "expiresAt"> ): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set( SESSION_COOKIE, createSessionToken( session ), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  } );
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete( SESSION_COOKIE );
}

export function isAdmin( session: AuthSession | null ): session is AuthSession & { role: "admin" } {
  return session?.role === "admin";
}
