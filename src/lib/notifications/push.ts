import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_PUSH_BATCH = 100;
const EXPO_RECEIPT_BATCH = 100;

export interface PushMessage { title: string; body: string; data?: Record<string, unknown>; }
interface PushTicket { status: "ok" | "error"; id?: string; details?: { error?: string }; }
interface PushReceipt { status: "ok" | "error"; message?: string; details?: { error?: string }; }

export async function savePushToken( _store: unknown, userId: string, token: string, platform: string ): Promise<void> {
  const pb = getPocketBaseClient();
  const existing = await first( pocketBaseCollections.pushTokens, "token = {:token}", { token } );
  const data = { token, userId, platform, sourceUpdatedAt: new Date().toISOString() };
  if ( existing ) await pb.collection( pocketBaseCollections.pushTokens ).update( existing.id, data );
  else await pb.collection( pocketBaseCollections.pushTokens ).create( { ...data, sourceCreatedAt: new Date().toISOString() } );
}

export async function deletePushToken( _store: unknown, token: string, userId?: string ): Promise<void> {
  const pb = getPocketBaseClient();
  const filter = userId ? pb.filter( "token = {:token} && userId = {:userId}", { token, userId } ) : pb.filter( "token = {:token}", { token } );
  const records = await pb.collection( pocketBaseCollections.pushTokens ).getFullList( { filter, fields: "id" } );
  await Promise.all( records.map( record => pb.collection( pocketBaseCollections.pushTokens ).delete( record.id ) ) );
}

export async function sendPushToUsers( _store: unknown, userIds: string[], message: PushMessage ): Promise<void> {
  if ( userIds.length === 0 ) return;
  const pb = getPocketBaseClient();
  const filter = `(${ userIds.map( userId => pb.filter( "userId = {:userId}", { userId } ) ).join( " || " ) })`;
  const tokens = ( await pb.collection( pocketBaseCollections.pushTokens ).getFullList( { filter, fields: "token" } ) ).map( record => String( record.token ) );
  for ( let start = 0; start < tokens.length; start += EXPO_PUSH_BATCH ) {
    const chunk = tokens.slice( start, start + EXPO_PUSH_BATCH );
    try {
      const response = await fetch( EXPO_PUSH_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify( chunk.map( to => ( { to, title: message.title, body: message.body, data: message.data || {}, sound: "default", channelId: "default" } ) ) ),
      } );
      if ( !response.ok ) throw new Error( `Expo push request failed with ${ response.status }` );
      const result = await response.json().catch( () => null ) as { data?: PushTicket[] } | null;
      await Promise.all( ( result?.data || [] ).map( async ( ticket, index ) => {
        if ( ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ) return deletePushToken( undefined, chunk[ index ] );
        if ( ticket.status === "ok" && ticket.id ) {
          const existing = await first( pocketBaseCollections.pushReceipts, "ticketId = {:ticketId}", { ticketId: ticket.id } );
          if ( !existing ) await pb.collection( pocketBaseCollections.pushReceipts ).create( {
            ticketId: ticket.id, token: chunk[ index ], status: "pending", attempts: 0,
            nextCheckAt: new Date( Date.now() + 15 * 60_000 ).toISOString(), receipt: {}, lastError: "",
          } );
        }
      } ) );
    } catch ( error ) { console.error( "Expo push send failed", error ); }
  }
}

export async function processPushReceipts( _store: unknown ): Promise<{ checked: number; delivered: number; failed: number }> {
  const pb = getPocketBaseClient();
  const now = new Date().toISOString();
  const pending = await pb.collection( pocketBaseCollections.pushReceipts ).getList( 1, EXPO_RECEIPT_BATCH, {
    filter: pb.filter( "status = 'pending' && nextCheckAt <= {:now}", { now } ), sort: "nextCheckAt,created",
  } );
  if ( pending.items.length === 0 ) return { checked: 0, delivered: 0, failed: 0 };
  const response = await fetch( EXPO_RECEIPTS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { ids: pending.items.map( item => item.ticketId ) } ) } );
  if ( !response.ok ) throw new Error( `Expo receipt request failed with ${ response.status }` );
  const result = await response.json() as { data?: Record<string, PushReceipt> };
  let delivered = 0, failed = 0;
  await Promise.all( pending.items.map( async item => {
    const receipt = result.data?.[ String( item.ticketId ) ];
    const attempts = Number( item.attempts || 0 ) + 1;
    if ( !receipt ) {
      const expired = attempts >= 8;
      await pb.collection( pocketBaseCollections.pushReceipts ).update( item.id, { status: expired ? "expired" : "pending", attempts, nextCheckAt: new Date( Date.now() + 15 * 60_000 ).toISOString(), lastError: expired ? "Receipt was not returned by Expo" : "" } );
      if ( expired ) failed++;
    } else if ( receipt.status === "ok" ) {
      await pb.collection( pocketBaseCollections.pushReceipts ).update( item.id, { status: "delivered", attempts, receipt, lastError: "" } ); delivered++;
    } else {
      if ( receipt.details?.error === "DeviceNotRegistered" ) await deletePushToken( undefined, String( item.token ) );
      await pb.collection( pocketBaseCollections.pushReceipts ).update( item.id, { status: "failed", attempts, receipt, lastError: receipt.message || receipt.details?.error || "Expo rejected the push" } ); failed++;
    }
  } ) );
  return { checked: pending.items.length, delivered, failed };
}
