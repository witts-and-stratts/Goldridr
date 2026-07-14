import PocketBase from "pocketbase";
import { EventSource } from "eventsource";
import { getPocketBaseSuperuserToken, getPocketBaseUrl } from "./config";

if ( typeof globalThis.EventSource === "undefined" ) {
  globalThis.EventSource = EventSource as unknown as typeof globalThis.EventSource;
}

let client: PocketBase | null = null;

export function getPocketBaseClient(): PocketBase {
  if ( client ) return client;

  client = new PocketBase( getPocketBaseUrl() );
  client.autoCancellation( false );
  client.authStore.save( getPocketBaseSuperuserToken() );
  return client;
}

export function resetPocketBaseClient(): void {
  client?.authStore.clear();
  client = null;
}
