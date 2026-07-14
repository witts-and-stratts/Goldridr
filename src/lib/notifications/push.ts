import type { DatabaseLike } from "@/lib/db-client";
import { deletePocketBasePushToken, syncPocketBasePushToken } from "./pocketbase-sync";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
const EXPO_PUSH_BATCH = 100;
const EXPO_RECEIPT_BATCH = 100;

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

interface PushReceipt {
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export async function savePushToken(
  db: DatabaseLike,
  userId: string,
  token: string,
  platform: string
): Promise<void> {
  await db.prepare( `
    INSERT INTO push_tokens (token, userId, platform, updatedAt)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(token) DO UPDATE SET
      userId = excluded.userId,
      platform = excluded.platform,
      updatedAt = CURRENT_TIMESTAMP
  ` ).run( token, userId, platform );
  await syncPocketBasePushToken( token, userId, platform );
}

export async function deletePushToken( db: DatabaseLike, token: string, userId?: string ): Promise<void> {
  if ( userId ) {
    await db.prepare( "DELETE FROM push_tokens WHERE token = ? AND userId = ?" ).run( token, userId );
  } else {
    await db.prepare( "DELETE FROM push_tokens WHERE token = ?" ).run( token );
  }
  await deletePocketBasePushToken( token );
}

export async function sendPushToUsers(
  db: DatabaseLike,
  userIds: string[],
  message: PushMessage
): Promise<void> {
  if ( userIds.length === 0 ) return;
  const placeholders = userIds.map( () => "?" ).join( "," );
  const tokens = ( await db.prepare(
    `SELECT token FROM push_tokens WHERE userId IN (${ placeholders })`
  ).all( ...userIds ) as Array<{ token: string }> ).map( ( row ) => row.token );
  if ( tokens.length === 0 ) return;

  for ( let start = 0; start < tokens.length; start += EXPO_PUSH_BATCH ) {
    const chunk = tokens.slice( start, start + EXPO_PUSH_BATCH );
    try {
      const response = await fetch( EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( chunk.map( ( token ) => ( {
          to: token,
          title: message.title,
          body: message.body,
          data: message.data || {},
          sound: "default",
          channelId: "default",
        } ) ) ),
      } );
      if ( !response.ok ) throw new Error( `Expo push request failed with ${ response.status }` );
      const result = await response.json().catch( () => null ) as { data?: PushTicket[] } | null;
      for ( const [ index, ticket ] of ( result?.data || [] ).entries() ) {
        if ( ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered" ) {
          await deletePushToken( db, chunk[ index ] );
        } else if ( ticket.status === "ok" && ticket.id ) {
          await db.prepare( `
            INSERT INTO push_receipts (ticketId, token, nextCheckAt)
            VALUES (?, ?, datetime('now', '+15 minutes'))
            ON CONFLICT(ticketId) DO NOTHING
          ` ).run( ticket.id, chunk[ index ] );
        }
      }
    } catch ( err ) {
      console.error( "Expo push send failed", err );
    }
  }
}

export async function processPushReceipts( db: DatabaseLike ): Promise<{ checked: number; delivered: number; failed: number }> {
  const pending = await db.prepare( `
    SELECT ticketId, token, attempts
    FROM push_receipts
    WHERE status = 'pending' AND datetime(nextCheckAt) <= datetime('now')
    ORDER BY nextCheckAt, createdAt
    LIMIT ?
  ` ).all( EXPO_RECEIPT_BATCH ) as Array<{ ticketId: string; token: string; attempts: number }>;
  if ( pending.length === 0 ) return { checked: 0, delivered: 0, failed: 0 };

  const response = await fetch( EXPO_RECEIPTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( { ids: pending.map( item => item.ticketId ) } ),
  } );
  if ( !response.ok ) throw new Error( `Expo receipt request failed with ${ response.status }` );
  const result = await response.json() as { data?: Record<string, PushReceipt> };
  let delivered = 0;
  let failed = 0;

  for ( const item of pending ) {
    const receipt = result.data?.[ item.ticketId ];
    if ( !receipt ) {
      const attempts = item.attempts + 1;
      const expired = attempts >= 8;
      await db.prepare( `
        UPDATE push_receipts
        SET status = ?, attempts = ?, nextCheckAt = datetime('now', '+15 minutes'),
            lastError = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE ticketId = ?
      ` ).run( expired ? "expired" : "pending", attempts, expired ? "Receipt was not returned by Expo" : null, item.ticketId );
      if ( expired ) failed++;
      continue;
    }

    if ( receipt.status === "ok" ) {
      await db.prepare( `
        UPDATE push_receipts
        SET status = 'delivered', attempts = attempts + 1, receipt = ?, lastError = NULL,
            updatedAt = CURRENT_TIMESTAMP
        WHERE ticketId = ?
      ` ).run( JSON.stringify( receipt ), item.ticketId );
      delivered++;
      continue;
    }

    if ( receipt.details?.error === "DeviceNotRegistered" ) {
      await deletePushToken( db, item.token );
    }
    await db.prepare( `
      UPDATE push_receipts
      SET status = 'failed', attempts = attempts + 1, receipt = ?, lastError = ?,
          updatedAt = CURRENT_TIMESTAMP
      WHERE ticketId = ?
    ` ).run( JSON.stringify( receipt ), receipt.message || receipt.details?.error || "Expo rejected the push", item.ticketId );
    failed++;
  }

  return { checked: pending.length, delivered, failed };
}
