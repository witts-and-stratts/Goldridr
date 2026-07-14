import PocketBase, { ClientResponseError } from "pocketbase";
import type { AuthSession } from "@/lib/auth";
import { pocketBaseCollections } from "./collections";
import { getPocketBaseUrl } from "./config";

export async function authenticatePocketBaseUser(
  email: string,
  password: string
): Promise<Omit<AuthSession, "expiresAt"> | null> {
  const pb = new PocketBase( getPocketBaseUrl() );
  try {
    const result = await pb.collection( pocketBaseCollections.users ).authWithPassword( email, password );
    const record = result.record;
    if ( record.status !== "active" ) return null;
    if ( record.role === "admin" ) {
      return {
        role: "admin",
        userId: String( record.legacyUserId ),
        name: String( record.name ),
        email: String( record.email ),
      };
    }
    if ( record.role === "chauffeur" && record.chauffeurId ) {
      return {
        role: "chauffeur",
        userId: String( record.legacyUserId ),
        chauffeurId: String( record.chauffeurId ),
        name: String( record.name ),
        email: String( record.email ),
      };
    }
    return null;
  } catch ( error ) {
    if ( error instanceof ClientResponseError && [ 400, 401, 404 ].includes( error.status ) ) return null;
    throw error;
  }
}
