import "server-only";

import { getSession, verifySessionToken, type AuthSession } from "@/lib/auth";
import { getChauffeurById } from "@/lib/db";

export type DriverSession = AuthSession & { role: "chauffeur"; chauffeurId: number };

/**
 * Reads a chauffeur session from an `Authorization: Bearer <token>` header.
 * Used by the driver mobile app, which cannot rely on browser cookies.
 */
export function getDriverSession( req: Request ): DriverSession | null {
  const session = getAppSession( req );
  if ( !session || session.role !== "chauffeur" ) return null;
  return session as DriverSession;
}

/**
 * Reads an admin or chauffeur session from the `Authorization: Bearer` header.
 * Admin tokens come from /api/auth/token, letting the mobile app operate the
 * driver routes with dispatcher-wide visibility.
 */
export function getAppSession( req: Request ): AuthSession | null {
  const header = req.headers.get( "authorization" );
  if ( !header?.startsWith( "Bearer " ) ) return null;

  const session = verifySessionToken( header.slice( "Bearer ".length ).trim() );
  if ( !session ) return null;
  if ( session.role === "chauffeur" ) {
    if ( !session.chauffeurId || !getChauffeurById( session.chauffeurId ) ) return null;
  }
  return session;
}

export async function getRequestSession( req: Request ): Promise<AuthSession | null> {
  return getAppSession( req ) ?? await getSession();
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { success: false, error: "Unauthenticated" },
    { status: 401 }
  );
}
