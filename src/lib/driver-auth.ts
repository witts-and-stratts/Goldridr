import "server-only";

import { verifySessionToken, type AuthSession } from "@/lib/auth";
import { getChauffeurById } from "@/lib/db";

export type DriverSession = AuthSession & { role: "chauffeur"; chauffeurId: number };

/**
 * Reads a chauffeur session from an `Authorization: Bearer <token>` header.
 * Used by the driver mobile app, which cannot rely on browser cookies.
 */
export function getDriverSession( req: Request ): DriverSession | null {
  const header = req.headers.get( "authorization" );
  if ( !header?.startsWith( "Bearer " ) ) return null;

  const session = verifySessionToken( header.slice( "Bearer ".length ).trim() );
  if ( !session || session.role !== "chauffeur" || !session.chauffeurId ) return null;
  if ( !getChauffeurById( session.chauffeurId ) ) return null;

  return session as DriverSession;
}

export function unauthorizedResponse(): Response {
  return Response.json(
    { success: false, error: "Unauthenticated" },
    { status: 401 }
  );
}
