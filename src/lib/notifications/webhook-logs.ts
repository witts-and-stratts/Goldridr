import { randomUUID } from "crypto";
import type { RecordModel } from "pocketbase";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";

export type WebhookProvider = "twilio" | "resend" | "ses";
export type WebhookValidationStatus = "valid" | "invalid" | "not_configured" | "not_applicable";
export type WebhookProcessingStatus = "processed" | "ignored" | "rejected" | "failed";

export interface WebhookAuditOutcome {
  validationStatus: WebhookValidationStatus;
  processingStatus: WebhookProcessingStatus;
  eventType?: string;
  providerEventId?: string;
  providerMessageId?: string;
  errorMessage?: string;
}

export interface WebhookAuditContext {
  rawBody: string;
  payload: unknown;
}

export interface WebhookHandlerResult {
  response: Response;
  audit: WebhookAuditOutcome;
}

const MAX_BODY_BYTES = 1_000_000;
const MAX_SEARCH_LENGTH = 50_000;
const RETENTION_DAYS = 90;
const SENSITIVE_KEY = /(authorization|cookie|password|secret|signature|token|api[-_]?key|credential)/i;

function truncateUtf8( value: string, maxBytes = MAX_BODY_BYTES ): string {
  if ( Buffer.byteLength( value, "utf8" ) <= maxBytes ) return value;
  return Buffer.from( value, "utf8" ).subarray( 0, maxBytes ).toString( "utf8" );
}

export function sanitizeWebhookValue( value: unknown, key = "", depth = 0 ): unknown {
  if ( SENSITIVE_KEY.test( key ) ) return "[REDACTED]";
  if ( depth > 12 ) return "[TRUNCATED]";
  if ( Array.isArray( value ) ) return value.map( item => sanitizeWebhookValue( item, "", depth + 1 ) );
  if ( value && typeof value === "object" ) {
    return Object.fromEntries(
      Object.entries( value as Record<string, unknown> ).map( ( [ childKey, childValue ] ) => [
        childKey,
        sanitizeWebhookValue( childValue, childKey, depth + 1 ),
      ] )
    );
  }
  if ( typeof value === "string" ) return truncateUtf8( value );
  return value;
}

export function sanitizeWebhookRawBody( value: string ): string {
  return truncateUtf8( value )
    .replace( /((?:authorization|password|secret|signature|token|api[-_]?key|credential)["']?\s*[:=]\s*["']?)[^&,"'\s}]+/gi, "$1[REDACTED]" );
}

function headerRecord( headers: Headers ): Record<string, string> {
  return Object.fromEntries( [ ...headers.entries() ].map( ( [ key, value ] ) => [
    key,
    SENSITIVE_KEY.test( key ) ? "[REDACTED]" : truncateUtf8( value, 10_000 ),
  ] ) );
}

function parsePayload( rawBody: string, contentType: string ): unknown {
  if ( !rawBody ) return {};
  try {
    if ( contentType.includes( "application/json" ) ) return JSON.parse( rawBody );
    if ( contentType.includes( "application/x-www-form-urlencoded" ) ) {
      return Object.fromEntries( new URLSearchParams( rawBody ) );
    }
  } catch {
    return sanitizeWebhookRawBody( rawBody );
  }
  return sanitizeWebhookRawBody( rawBody );
}

function sourceIp( request: Request ): string {
  return ( request.headers.get( "x-forwarded-for" )?.split( "," )[ 0 ]
    || request.headers.get( "x-real-ip" )
    || "" ).trim();
}

function searchableText( input: {
  provider: WebhookProvider;
  endpoint: string;
  outcome: WebhookAuditOutcome;
  payload: unknown;
  rawBody: string;
} ): string {
  return [
    input.provider,
    input.endpoint,
    input.outcome.eventType,
    input.outcome.providerEventId,
    input.outcome.providerMessageId,
    input.outcome.validationStatus,
    input.outcome.processingStatus,
    input.outcome.errorMessage,
    JSON.stringify( input.payload ),
    input.rawBody,
  ].filter( Boolean ).join( "\n" ).slice( 0, MAX_SEARCH_LENGTH ).toLowerCase();
}

async function responseBody( response: Response ): Promise<string> {
  try {
    return sanitizeWebhookRawBody( await response.clone().text() );
  } catch {
    return "";
  }
}

async function persistWebhookLog( input: {
  requestId: string;
  provider: WebhookProvider;
  request: Request;
  rawBody: string;
  payload: unknown;
  response: Response;
  outcome: WebhookAuditOutcome;
  receivedAt: Date;
  durationMs: number;
} ): Promise<void> {
  const url = new URL( input.request.url );
  const safePayload = sanitizeWebhookValue( input.payload );
  const safeRawBody = sanitizeWebhookRawBody( input.rawBody );
  const expiresAt = new Date( input.receivedAt.getTime() + RETENTION_DAYS * 86_400_000 );
  await getPocketBaseClient().collection( pocketBaseCollections.webhookLogs ).create( {
    requestId: input.requestId,
    provider: input.provider,
    endpoint: url.pathname,
    method: input.request.method,
    contentType: input.request.headers.get( "content-type" ) || "",
    sourceIp: sourceIp( input.request ),
    validationStatus: input.outcome.validationStatus,
    processingStatus: input.outcome.processingStatus,
    eventType: input.outcome.eventType || "",
    providerEventId: input.outcome.providerEventId || "",
    providerMessageId: input.outcome.providerMessageId || "",
    responseStatus: input.response.status,
    durationMs: Math.max( 0, Math.round( input.durationMs ) ),
    requestHeaders: headerRecord( input.request.headers ),
    payload: safePayload,
    rawBody: safeRawBody,
    responseHeaders: headerRecord( input.response.headers ),
    responseBody: await responseBody( input.response ),
    errorMessage: truncateUtf8( input.outcome.errorMessage || "", 10_000 ),
    searchText: searchableText( {
      provider: input.provider,
      endpoint: url.pathname,
      outcome: input.outcome,
      payload: safePayload,
      rawBody: safeRawBody,
    } ),
    receivedAt: input.receivedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  } );
}

function auditFailure( requestId: string, provider: WebhookProvider, error: unknown ): void {
  console.error( JSON.stringify( {
    timestamp: new Date().toISOString(),
    level: "error",
    event: "webhook.audit_failed",
    requestId,
    provider,
    error: error instanceof Error ? error.message : String( error ),
  } ) );
}

export async function withWebhookAudit(
  provider: WebhookProvider,
  request: Request,
  handler: ( context: WebhookAuditContext ) => Promise<WebhookHandlerResult>
): Promise<Response> {
  const requestId = randomUUID();
  const receivedAt = new Date();
  const startedAt = performance.now();
  let rawBody = "";
  let payload: unknown = {};
  let result: WebhookHandlerResult;

  try {
    rawBody = await request.text();
    payload = parsePayload( rawBody, request.headers.get( "content-type" ) || "" );
    result = await handler( { rawBody, payload } );
  } catch ( error ) {
    result = {
      response: new Response( "Webhook processing failed", { status: 500 } ),
      audit: {
        validationStatus: "not_applicable",
        processingStatus: "failed",
        errorMessage: error instanceof Error ? error.message : String( error ),
      },
    };
  }

  try {
    await persistWebhookLog( {
      requestId,
      provider,
      request,
      rawBody,
      payload,
      response: result.response,
      outcome: result.audit,
      receivedAt,
      durationMs: performance.now() - startedAt,
    } );
  } catch ( error ) {
    auditFailure( requestId, provider, error );
  }

  return result.response;
}

export interface WebhookLogFilters {
  provider?: WebhookProvider;
  validationStatus?: WebhookValidationStatus;
  processingStatus?: WebhookProcessingStatus;
  eventType?: string;
  query?: string;
  from?: string;
  to?: string;
  page?: number;
  perPage?: number;
}

function logFilter( filters: WebhookLogFilters ): string {
  const pb = getPocketBaseClient();
  const parts: string[] = [];
  if ( filters.provider ) parts.push( pb.filter( "provider = {:provider}", { provider: filters.provider } ) );
  if ( filters.validationStatus ) parts.push( pb.filter( "validationStatus = {:validation}", { validation: filters.validationStatus } ) );
  if ( filters.processingStatus ) parts.push( pb.filter( "processingStatus = {:processing}", { processing: filters.processingStatus } ) );
  if ( filters.eventType?.trim() ) parts.push( pb.filter( "eventType ~ {:eventType}", { eventType: filters.eventType.trim() } ) );
  if ( filters.query?.trim() ) parts.push( pb.filter( "searchText ~ {:query}", { query: filters.query.trim().toLowerCase() } ) );
  if ( filters.from ) parts.push( pb.filter( "receivedAt >= {:from}", { from: filters.from } ) );
  if ( filters.to ) parts.push( pb.filter( "receivedAt <= {:to}", { to: filters.to } ) );
  return parts.join( " && " );
}

function mapSummary( record: RecordModel ) {
  const payload = record.payload && typeof record.payload === "object" ? record.payload as Record<string, unknown> : {};
  const preview = String( payload.Body || payload.body || payload.type || record.errorMessage || "" ).slice( 0, 180 );
  return {
    id: record.id,
    requestId: String( record.requestId ),
    provider: record.provider as WebhookProvider,
    endpoint: String( record.endpoint ),
    method: String( record.method ),
    validationStatus: record.validationStatus as WebhookValidationStatus,
    processingStatus: record.processingStatus as WebhookProcessingStatus,
    eventType: String( record.eventType || "Unknown event" ),
    providerEventId: String( record.providerEventId || "" ),
    providerMessageId: String( record.providerMessageId || "" ),
    responseStatus: Number( record.responseStatus ),
    durationMs: Number( record.durationMs ),
    preview,
    receivedAt: String( record.receivedAt ),
  };
}

export async function listWebhookLogs( filters: WebhookLogFilters ) {
  const page = Math.max( 1, Math.floor( filters.page || 1 ) );
  const perPage = Math.min( 100, Math.max( 10, Math.floor( filters.perPage || 50 ) ) );
  const result = await getPocketBaseClient().collection( pocketBaseCollections.webhookLogs ).getList( page, perPage, {
    filter: logFilter( filters ),
    sort: "-receivedAt",
  } );
  return {
    items: result.items.map( mapSummary ),
    page: result.page,
    perPage: result.perPage,
    totalItems: result.totalItems,
    totalPages: result.totalPages,
  };
}

export async function getWebhookLog( id: string ) {
  const record = await getPocketBaseClient().collection( pocketBaseCollections.webhookLogs ).getOne( id );
  return {
    ...mapSummary( record ),
    contentType: String( record.contentType || "" ),
    sourceIp: String( record.sourceIp || "" ),
    requestHeaders: record.requestHeaders || {},
    payload: record.payload ?? {},
    rawBody: String( record.rawBody || "" ),
    responseHeaders: record.responseHeaders || {},
    responseBody: String( record.responseBody || "" ),
    errorMessage: String( record.errorMessage || "" ),
    expiresAt: String( record.expiresAt ),
  };
}

export async function purgeExpiredWebhookLogs( now = new Date() ): Promise<number> {
  const pb = getPocketBaseClient();
  let deleted = 0;
  while ( true ) {
    const result = await pb.collection( pocketBaseCollections.webhookLogs ).getList( 1, 100, {
      filter: pb.filter( "expiresAt <= {:now}", { now: now.toISOString() } ),
      fields: "id",
    } );
    if ( result.items.length === 0 ) return deleted;
    await Promise.all( result.items.map( record => pb.collection( pocketBaseCollections.webhookLogs ).delete( record.id ) ) );
    deleted += result.items.length;
  }
}
