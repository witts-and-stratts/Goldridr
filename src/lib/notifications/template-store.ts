import type { RecordModel } from "pocketbase";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { first } from "@/lib/pocketbase/core";
import {
  getRegistryEntry,
  listRegistryEntries,
  resolveTemplateIdentity,
  type TemplateRegistryEntry,
} from "./template-registry";
import { buildTemplateContext, renderTemplate } from "./template-context";
import { validateRenderedSmsBody } from "./template-validation";
import type {
  EmailEditableContent,
  PdfContent,
  ResolvedTemplate,
  SmsContent,
  TemplateAdminView,
  TemplateChannel,
  TemplateContent,
  TemplateRevisionView,
} from "./template-types";

export type { TemplateAdminView, TemplateRevisionView } from "./template-types";

const CACHE_TTL_MS = 45_000;
const overrideCache = new Map<string, { value: RecordModel | null; expiresAt: number }>();

export class TemplateConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly actualRevision: number
  ) {
    super( `Template revision conflict: expected ${ expectedRevision }, found ${ actualRevision }` );
    this.name = "TemplateConflictError";
  }
}

export class TemplateNotFoundError extends Error {
  constructor( message: string ) {
    super( message );
    this.name = "TemplateNotFoundError";
  }
}

function cacheKey( channel: TemplateChannel, templateId: string ): string {
  return `${ channel }:${ templateId }`;
}

export function invalidateTemplateCache( channel?: TemplateChannel, templateId?: string ): void {
  if ( channel && templateId ) {
    overrideCache.delete( cacheKey( channel, templateId ) );
    return;
  }
  overrideCache.clear();
}

async function readOverrideRow(
  channel: TemplateChannel,
  templateId: string
): Promise<RecordModel | null> {
  const row = await first(
    pocketBaseCollections.templates,
    "channel = {:channel} && templateId = {:templateId}",
    { channel, templateId }
  );
  return row ?? null;
}

async function getOverrideRow(
  channel: TemplateChannel,
  templateId: string
): Promise<RecordModel | null> {
  const key = cacheKey( channel, templateId );
  const cached = overrideCache.get( key );
  if ( cached && cached.expiresAt > Date.now() ) return cached.value;
  const value = await readOverrideRow( channel, templateId );
  overrideCache.set( key, { value, expiresAt: Date.now() + CACHE_TTL_MS } );
  return value;
}

function asRecord( value: unknown ): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray( value )
    ? value as Record<string, unknown>
    : {};
}

function renderContent(
  channel: TemplateChannel,
  content: TemplateContent,
  context: ReturnType<typeof buildTemplateContext>
): TemplateContent {
  const raw = asRecord( content );
  const render = ( value: unknown ) => ( typeof value === "string" ? renderTemplate( value, context ) : value );
  if ( channel === "sms" ) {
    return { body: String( render( raw.body ?? "" ) ) } satisfies SmsContent;
  }
  if ( channel === "email" ) {
    return {
      subject: render( raw.subject ) as string | undefined,
      preview: render( raw.preview ) as string | undefined,
      heading: render( raw.heading ) as string | undefined,
      message: String( render( raw.message ?? "" ) ),
      ctaLabel: render( raw.ctaLabel ) as string | undefined,
      footerNote: render( raw.footerNote ) as string | undefined,
    } satisfies EmailEditableContent;
  }
  return {
    title: render( raw.title ) as string | undefined,
    intro: render( raw.intro ) as string | undefined,
    footer: render( raw.footer ) as string | undefined,
  } satisfies PdfContent;
}

function mergeContent( defaultContent: TemplateContent, overrideContent: TemplateContent ): TemplateContent {
  return { ...asRecord( defaultContent ), ...asRecord( overrideContent ) } as TemplateContent;
}

function ensureRenderableContent( channel: TemplateChannel, templateId: string, content: TemplateContent ): TemplateContent {
  if ( channel !== "sms" ) return content;
  const errors = validateRenderedSmsBody( templateId, String( ( content as SmsContent ).body || "" ) );
  if ( errors.length ) throw new Error( `Invalid rendered SMS template ${ templateId }: ${ errors.join( "; " ) }` );
  return content;
}

export async function resolveTemplate(
  channel: TemplateChannel,
  key: string,
  payload: Record<string, unknown>,
  options: { appUrl?: string } = {}
): Promise<ResolvedTemplate | null> {
  const identity = resolveTemplateIdentity( channel, key, payload );
  if ( !identity ) return null;
  const { entry, variant } = identity;
  const context = buildTemplateContext( payload, { appUrl: options.appUrl } );
  const override = await getOverrideRow( channel, entry.templateId );
  const defaultContent = entry.defaultContent( payload );
  if ( override && Boolean( override.enabled ) ) {
    return {
      channel,
      templateId: entry.templateId,
      variant,
      source: "override",
      revision: Number( override.currentRevision || 1 ),
      content: ensureRenderableContent( channel, entry.templateId, renderContent( channel, mergeContent( defaultContent, override.content as TemplateContent ), context ) ),
    };
  }
  return {
    channel,
    templateId: entry.templateId,
    variant,
    source: "default",
    revision: 0,
    content: ensureRenderableContent( channel, entry.templateId, renderContent( channel, defaultContent, context ) ),
  };
}

export function renderContentForPayload(
  channel: TemplateChannel,
  content: TemplateContent,
  payload: Record<string, unknown>
): TemplateContent {
  return renderContent( channel, content, buildTemplateContext( payload ) );
}

export async function resolvePdfContent(
  templateId: string,
  payload: Record<string, unknown>,
  options: { appUrl?: string } = {}
): Promise<{ content: PdfContent; source: "default" | "override"; revision: number }> {
  const entry = getRegistryEntry( "pdf", templateId );
  if ( !entry ) throw new TemplateNotFoundError( `Unknown PDF template ${ templateId }` );
  const context = buildTemplateContext( payload, { appUrl: options.appUrl } );
  const override = await getOverrideRow( "pdf", templateId );
  const defaultContent = entry.defaultContent( payload );
  if ( override && Boolean( override.enabled ) ) {
    return {
      content: renderContent( "pdf", mergeContent( defaultContent, override.content as TemplateContent ), context ) as PdfContent,
      source: "override",
      revision: Number( override.currentRevision || 1 ),
    };
  }
  return {
    content: renderContent( "pdf", defaultContent, context ) as PdfContent,
    source: "default",
    revision: 0,
  };
}

function toView( entry: TemplateRegistryEntry, row: RecordModel | null ): TemplateAdminView {
  const enabled = Boolean( row?.enabled );
  return {
    channel: entry.channel,
    templateId: entry.templateId,
    key: entry.key,
    variant: entry.variant,
    label: entry.label,
    description: entry.description,
    adminEditable: entry.adminEditable,
    complianceManaged: entry.complianceManaged,
    fields: entry.fields,
    allowedVariables: entry.allowedVariables,
    samplePayload: entry.samplePayload,
    defaultContent: entry.defaultContent( entry.samplePayload ),
    defaultEditorContent: ( entry.defaultEditorContent || entry.defaultContent )( entry.samplePayload ),
    source: enabled ? "override" : "default",
    enabled,
    revision: row ? Number( row.currentRevision || 0 ) : 0,
    content: row ? row.content as TemplateContent : null,
    updatedBy: row?.updatedBy ? String( row.updatedBy ) : null,
    updatedAt: row?.updated ? String( row.updated ) : null,
    sourceUpdatedAt: row?.sourceUpdatedAt ? String( row.sourceUpdatedAt ) : null,
  };
}

export async function listTemplateViews(): Promise<TemplateAdminView[]> {
  let rows: RecordModel[] = [];
  try {
    rows = await getPocketBaseClient()
      .collection( pocketBaseCollections.templates )
      .getFullList( { sort: "channel,templateId" } );
  } catch {
    rows = [];
  }
  const byId = new Map( rows.map( row => [ cacheKey( row.channel as TemplateChannel, String( row.templateId ) ), row ] ) );
  return listRegistryEntries().map( entry => toView( entry, byId.get( cacheKey( entry.channel, entry.templateId ) ) || null ) );
}

export async function getTemplateView(
  channel: TemplateChannel,
  templateId: string
): Promise<TemplateAdminView | null> {
  const entry = getRegistryEntry( channel, templateId );
  if ( !entry ) return null;
  const row = await readOverrideRow( channel, templateId );
  return toView( entry, row );
}

export async function listTemplateRevisions(
  channel: TemplateChannel,
  templateId: string
): Promise<TemplateRevisionView[]> {
  const rows = await getPocketBaseClient()
    .collection( pocketBaseCollections.templateRevisions )
    .getFullList( {
      filter: getPocketBaseClient().filter( "channel = {:channel} && templateId = {:templateId}", { channel, templateId } ),
      sort: "-revision",
    } )
    .catch( () => [] as RecordModel[] );
  return rows.map( row => ( {
    revision: Number( row.revision || 0 ),
    action: String( row.action || "updated" ),
    previousContent: ( row.previousContent as TemplateContent ) ?? null,
    content: ( row.content as TemplateContent ) ?? null,
    createdBy: row.createdBy ? String( row.createdBy ) : null,
    note: row.note ? String( row.note ) : null,
    createdAt: row.created ? String( row.created ) : null,
  } ) );
}

function revisionData( input: {
  channel: TemplateChannel;
  templateId: string;
  revision: number;
  action: string;
  previousContent: TemplateContent | null;
  content: TemplateContent | null;
  createdBy?: string;
  note?: string;
} ): Record<string, unknown> {
  return {
    channel: input.channel,
    templateId: input.templateId,
    revision: input.revision,
    action: input.action,
    previousContent: input.previousContent ?? null,
    content: input.content ?? null,
    createdBy: input.createdBy || "",
    note: input.note || "",
  };
}

async function commitTemplateMutation(
  current: RecordModel | null,
  pointerData: Record<string, unknown>,
  revision: Parameters<typeof revisionData>[ 0 ]
): Promise<void> {
  const pb = getPocketBaseClient();
  let revisionRecord: RecordModel;
  try {
    revisionRecord = await pb.collection( pocketBaseCollections.templateRevisions ).create( revisionData( revision ) );
  } catch ( error ) {
    const latest = await readOverrideRow( revision.channel, revision.templateId ).catch( () => null );
    const actualRevision = latest ? Number( latest.currentRevision || 0 ) : 0;
    const expectedRevision = revision.revision - 1;
    if ( actualRevision > expectedRevision ) throw new TemplateConflictError( expectedRevision, actualRevision );
    throw error;
  }
  try {
    if ( current ) await pb.collection( pocketBaseCollections.templates ).update( current.id, pointerData );
    else await pb.collection( pocketBaseCollections.templates ).create( pointerData );
  } catch ( error ) {
    await pb.collection( pocketBaseCollections.templateRevisions ).delete( revisionRecord.id ).catch( cleanupError => {
      console.error( "Unable to remove uncommitted template revision", cleanupError );
    } );
    throw error;
  }
}

export interface SaveTemplateInput {
  channel: TemplateChannel;
  templateId: string;
  content: TemplateContent;
  expectedRevision: number;
  userId?: string;
  note?: string;
}

export async function saveTemplate( input: SaveTemplateInput ): Promise<TemplateAdminView> {
  const entry = getRegistryEntry( input.channel, input.templateId );
  if ( !entry ) throw new TemplateNotFoundError( `Unknown template ${ input.channel }:${ input.templateId }` );
  if ( !entry.adminEditable ) throw new TemplateNotFoundError( `Template ${ input.channel }:${ input.templateId } is developer-owned` );
  const current = await readOverrideRow( input.channel, input.templateId );
  const actualRevision = current ? Number( current.currentRevision || 0 ) : 0;
  if ( actualRevision !== input.expectedRevision ) throw new TemplateConflictError( input.expectedRevision, actualRevision );

  const revision = actualRevision + 1;
  const action = current ? ( Boolean( current.enabled ) ? "updated" : "enabled" ) : "created";
  const data = {
    channel: input.channel,
    templateId: input.templateId,
    enabled: true,
    currentRevision: revision,
    content: input.content,
    updatedBy: input.userId || "",
    sourceUpdatedAt: new Date().toISOString(),
  };
  await commitTemplateMutation( current, data, {
    channel: input.channel,
    templateId: input.templateId,
    revision,
    action,
    previousContent: current ? current.content as TemplateContent : null,
    content: input.content,
    createdBy: input.userId,
    note: input.note,
  } );
  invalidateTemplateCache( input.channel, input.templateId );
  return ( await getTemplateView( input.channel, input.templateId ) )!;
}

export async function setTemplateEnabled( input: {
  channel: TemplateChannel;
  templateId: string;
  enabled: boolean;
  expectedRevision: number;
  userId?: string;
  note?: string;
} ): Promise<TemplateAdminView> {
  const entry = getRegistryEntry( input.channel, input.templateId );
  if ( !entry ) throw new TemplateNotFoundError( `Unknown template ${ input.channel }:${ input.templateId }` );
  if ( !entry.adminEditable ) throw new TemplateNotFoundError( `Template ${ input.channel }:${ input.templateId } is developer-owned` );
  const current = await readOverrideRow( input.channel, input.templateId );
  if ( !current ) throw new TemplateNotFoundError( "Template has no saved override to toggle" );
  const actualRevision = Number( current.currentRevision || 0 );
  if ( actualRevision !== input.expectedRevision ) throw new TemplateConflictError( input.expectedRevision, actualRevision );

  const revision = actualRevision + 1;
  await commitTemplateMutation( current, {
    enabled: input.enabled,
    currentRevision: revision,
    updatedBy: input.userId || "",
    sourceUpdatedAt: new Date().toISOString(),
  }, {
    channel: input.channel,
    templateId: input.templateId,
    revision,
    action: input.enabled ? "enabled" : "disabled",
    previousContent: current.content as TemplateContent,
    content: current.content as TemplateContent,
    createdBy: input.userId,
    note: input.note,
  } );
  invalidateTemplateCache( input.channel, input.templateId );
  return ( await getTemplateView( input.channel, input.templateId ) )!;
}

export async function resetTemplate( input: {
  channel: TemplateChannel;
  templateId: string;
  expectedRevision: number;
  userId?: string;
  note?: string;
} ): Promise<TemplateAdminView> {
  const entry = getRegistryEntry( input.channel, input.templateId );
  if ( !entry ) throw new TemplateNotFoundError( `Unknown template ${ input.channel }:${ input.templateId }` );
  if ( !entry.adminEditable ) throw new TemplateNotFoundError( `Template ${ input.channel }:${ input.templateId } is developer-owned` );
  const current = await readOverrideRow( input.channel, input.templateId );
  if ( !current ) throw new TemplateNotFoundError( "Template has no override to reset" );
  const actualRevision = Number( current.currentRevision || 0 );
  if ( actualRevision !== input.expectedRevision ) throw new TemplateConflictError( input.expectedRevision, actualRevision );

  const revision = actualRevision + 1;
  await commitTemplateMutation( current, {
    enabled: false,
    currentRevision: revision,
    content: {},
    updatedBy: input.userId || "",
    sourceUpdatedAt: new Date().toISOString(),
  }, {
    channel: input.channel,
    templateId: input.templateId,
    revision,
    action: "reset",
    previousContent: current.content as TemplateContent,
    content: null,
    createdBy: input.userId,
    note: input.note,
  } );
  invalidateTemplateCache( input.channel, input.templateId );
  return ( await getTemplateView( input.channel, input.templateId ) )!;
}

export async function revertTemplate( input: {
  channel: TemplateChannel;
  templateId: string;
  revision: number;
  expectedRevision: number;
  userId?: string;
  note?: string;
} ): Promise<TemplateAdminView> {
  const entry = getRegistryEntry( input.channel, input.templateId );
  if ( !entry ) throw new TemplateNotFoundError( `Unknown template ${ input.channel }:${ input.templateId }` );
  if ( !entry.adminEditable ) throw new TemplateNotFoundError( `Template ${ input.channel }:${ input.templateId } is developer-owned` );
  const target = await first(
    pocketBaseCollections.templateRevisions,
    "channel = {:channel} && templateId = {:templateId} && revision = {:revision}",
    { channel: input.channel, templateId: input.templateId, revision: input.revision }
  );
  if ( !target || !target.content ) throw new TemplateNotFoundError( `Revision ${ input.revision } is not revertable` );

  const current = await readOverrideRow( input.channel, input.templateId );
  const actualRevision = current ? Number( current.currentRevision || 0 ) : 0;
  if ( actualRevision !== input.expectedRevision ) throw new TemplateConflictError( input.expectedRevision, actualRevision );

  const revision = actualRevision + 1;
  const data = {
    channel: input.channel,
    templateId: input.templateId,
    enabled: true,
    currentRevision: revision,
    content: target.content as TemplateContent,
    updatedBy: input.userId || "",
    sourceUpdatedAt: new Date().toISOString(),
  };
  await commitTemplateMutation( current, data, {
    channel: input.channel,
    templateId: input.templateId,
    revision,
    action: "reverted",
    previousContent: current ? current.content as TemplateContent : null,
    content: target.content as TemplateContent,
    createdBy: input.userId,
    note: input.note || `Reverted to revision ${ input.revision }`,
  } );
  invalidateTemplateCache( input.channel, input.templateId );
  return ( await getTemplateView( input.channel, input.templateId ) )!;
}
