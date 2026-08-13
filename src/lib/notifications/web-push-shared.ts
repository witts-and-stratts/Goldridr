import { z } from "zod";

export const webPushSubscriptionSchema = z.object( {
  endpoint: z.string().url().max( 4096 ).refine( value => value.startsWith( "https://" ), "Push endpoint must use HTTPS" ),
  expirationTime: z.number().int().nonnegative().nullable().optional(),
  keys: z.object( {
    p256dh: z.string().min( 16 ).max( 500 ),
    auth: z.string().min( 8 ).max( 500 ),
  } ),
} );

export type SerializableWebPushSubscription = z.infer<typeof webPushSubscriptionSchema>;

export interface WebPushPayload {
  title: string;
  body: string;
  recipientId: number;
  url: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

export interface WebPushSendResult {
  provider: "web-push";
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
  metadata: Record<string, unknown>;
}

export interface WebPushSender {
  sendNotification(
    subscription: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } },
    payload: string,
  ): Promise<{ statusCode: number; body: string; headers: Record<string, string> }>;
}

export async function transmitWebPush(
  subscription: { endpoint: string; expirationTime?: number | null; keys: { p256dh: string; auth: string } },
  payload: WebPushPayload,
  sender: WebPushSender,
  messageKey = "web-push",
): Promise<WebPushSendResult> {
  const response = await sender.sendNotification( subscription, JSON.stringify( payload ) );
  return {
    provider: "web-push",
    messageId: `${ messageKey }:${ Date.now() }`,
    accepted: [ subscription.endpoint ],
    rejected: [],
    response: response.body || String( response.statusCode ),
    metadata: { statusCode: response.statusCode, headers: response.headers },
  };
}

function statusCode( error: unknown ): number | undefined {
  const candidate = error as { statusCode?: unknown; responseCode?: unknown };
  const value = Number( candidate.statusCode || candidate.responseCode );
  return Number.isInteger( value ) ? value : undefined;
}

export function isStaleWebPushError( error: unknown ): boolean {
  return [ 404, 410 ].includes( statusCode( error ) || 0 );
}

export function isTransientWebPushError( error: unknown ): boolean {
  const status = statusCode( error );
  if ( status === 429 || ( status !== undefined && status >= 500 ) ) return true;
  const code = ( error as { code?: unknown } ).code;
  return typeof code === "string" && [ "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EAI_AGAIN" ].includes( code );
}
