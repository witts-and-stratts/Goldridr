import PocketBase from "pocketbase";
import { EventSource } from "eventsource";
import { getPocketBaseSuperuserCredentials, getPocketBaseUrl } from "./config";

if ( typeof globalThis.EventSource === "undefined" ) {
  globalThis.EventSource = EventSource as unknown as typeof globalThis.EventSource;
}

let client: PocketBase | null = null;
let authPromise: Promise<void> | null = null;

async function ensureSuperuserAuth( pb: PocketBase ): Promise<void> {
  if ( pb.authStore.isValid ) return;
  if ( !authPromise ) {
    const { email, password } = getPocketBaseSuperuserCredentials();
    authPromise = pb.collection( "_superusers" ).authWithPassword( email, password )
      .then( () => undefined )
      .finally( () => { authPromise = null; } );
  }
  await authPromise;
}

export function getPocketBaseClient(): PocketBase {
  if ( client ) return client;

  client = new PocketBase( getPocketBaseUrl() );
  client.autoCancellation( false );
  client.beforeSend = async ( url, options ) => {
    if ( !url.includes( "/collections/_superusers/auth-with-password" ) ) {
      await ensureSuperuserAuth( client! );
      options.headers = Object.assign( {}, options.headers, { Authorization: client!.authStore.token } );
    }
    return { url, options };
  };
  return client;
}

export function resetPocketBaseClient(): void {
  client?.authStore.clear();
  client = null;
}
