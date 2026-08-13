"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  FilterX,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin-ui/select";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/admin-ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { WebhookLogDetailPane } from "./webhook-log-detail";
import type { LogProvider, ProcessingStatus, ValidationStatus, WebhookLogDetail, WebhookLogPage } from "./types";
import styles from "@/styles/webhook-logs.module.css";

const providerLinks: Array<{ value: LogProvider | "all"; label: string; href: string }> = [
  { value: "all", label: "All", href: "/admin/logs" },
  { value: "twilio", label: "Twilio", href: "/admin/logs/twilio" },
  { value: "resend", label: "Resend", href: "/admin/logs/resend" },
  { value: "ses", label: "SES", href: "/admin/logs/ses" },
  { value: "stripe", label: "Stripe", href: "/admin/logs/stripe" },
  { value: "square", label: "Square", href: "/admin/logs/square" },
  { value: "paypal", label: "PayPal", href: "/admin/logs/paypal" },
];

async function fetchJson<T>( url: string ): Promise<T> {
  const response = await fetch( url, { cache: "no-store" } );
  const data = await response.json();
  if ( !response.ok || !data.success ) throw new Error( data.error || "Unable to load webhook logs" );
  return data as T;
}

function rangeParams( range?: DateRange ): { from?: string; to?: string } {
  if ( !range?.from ) return {};
  const from = new Date( range.from );
  from.setHours( 0, 0, 0, 0 );
  const to = new Date( range.to || range.from );
  to.setHours( 23, 59, 59, 999 );
  return { from: from.toISOString(), to: to.toISOString() };
}

export function WebhookLogsPage( { provider }: { provider?: LogProvider } ) {
  const [ search, setSearch ] = useState( "" );
  const deferredSearch = useDeferredValue( search );
  const [ validation, setValidation ] = useState<ValidationStatus | "all">( "all" );
  const [ status, setStatus ] = useState<ProcessingStatus | "all">( "all" );
  const [ eventType, setEventType ] = useState( "" );
  const deferredEventType = useDeferredValue( eventType );
  const [ dateRange, setDateRange ] = useState<DateRange>();
  const [ page, setPage ] = useState( 1 );
  const [ paused, setPaused ] = useState( false );
  const [ selectedId, setSelectedId ] = useState<string | null>( null );
  const [ mobileDetailOpen, setMobileDetailOpen ] = useState( false );

  const queryString = useMemo( () => {
    const params = new URLSearchParams( { page: String( page ), perPage: "50" } );
    if ( provider ) params.set( "provider", provider );
    if ( deferredSearch.trim() ) params.set( "q", deferredSearch.trim() );
    if ( validation !== "all" ) params.set( "validation", validation );
    if ( status !== "all" ) params.set( "status", status );
    if ( deferredEventType.trim() ) params.set( "eventType", deferredEventType.trim() );
    const range = rangeParams( dateRange );
    if ( range.from ) params.set( "from", range.from );
    if ( range.to ) params.set( "to", range.to );
    return params.toString();
  }, [ dateRange, deferredEventType, deferredSearch, page, provider, status, validation ] );

  const logsQuery = useQuery( {
    queryKey: [ "webhook-logs", queryString ],
    queryFn: () => fetchJson<WebhookLogPage & { success: true }>( `/api/admin/webhook-logs?${ queryString }` ),
    refetchInterval: paused ? false : 10_000,
    refetchIntervalInBackground: false,
  } );
  const data = logsQuery.data;

  const effectiveSelectedId = data?.items.some( item => item.id === selectedId )
    ? selectedId
    : data?.items[ 0 ]?.id || null;

  const detailQuery = useQuery( {
    queryKey: [ "webhook-log", effectiveSelectedId ],
    queryFn: () => fetchJson<{ success: true; log: WebhookLogDetail }>( `/api/admin/webhook-logs/${ effectiveSelectedId }` ),
    enabled: Boolean( effectiveSelectedId ),
  } );

  const clearFilters = () => {
    setSearch( "" );
    setValidation( "all" );
    setStatus( "all" );
    setEventType( "" );
    setDateRange( undefined );
    setPage( 1 );
  };
  const hasFilters = Boolean( search || eventType || dateRange?.from || validation !== "all" || status !== "all" );
  const selectLog = ( id: string ) => {
    setSelectedId( id );
    if ( window.matchMedia( "(max-width: 1023px)" ).matches ) setMobileDetailOpen( true );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Webhook logs</h1>
            <p className={styles.subtitle}>A 90-day request trail for messaging and payment providers.</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="outline" size="sm" onClick={() => setPaused( value => !value )}>
              {paused ? <CirclePlay className="size-3.5" /> : <CirclePause className="size-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()} disabled={logsQuery.isFetching}>
              <RefreshCw className={cn( "size-3.5", logsQuery.isFetching && "animate-spin" )} />Refresh
            </Button>
          </div>
        </div>
        <nav className={styles.providerNav} aria-label="Webhook providers">
          {providerLinks.map( item => (
            <Link key={item.value} href={item.href} className={cn( styles.providerLink, ( provider || "all" ) === item.value && styles.providerLinkActive )}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.filters}>
          <div className={styles.searchField}>
            <Search className={styles.searchIcon} />
            <Input aria-label="Search webhook logs" value={search} onChange={event => { setSearch( event.target.value ); setPage( 1 ); }} placeholder="Search IDs, sender, body, or errors" className="pl-9" />
          </div>
          <Select value={status} onValueChange={value => { setStatus( value as ProcessingStatus | "all" ); setPage( 1 ); }}>
            <SelectTrigger aria-label="Processing outcome" className={styles.filterControl}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="ignored">Ignored</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={validation} onValueChange={value => { setValidation( value as ValidationStatus | "all" ); setPage( 1 ); }}>
            <SelectTrigger aria-label="Validation status" className={styles.filterControl}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All validation</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="invalid">Invalid</SelectItem>
              <SelectItem value="not_configured">Not configured</SelectItem>
              <SelectItem value="not_applicable">Not applicable</SelectItem>
            </SelectContent>
          </Select>
          <Input aria-label="Event type" value={eventType} onChange={event => { setEventType( event.target.value ); setPage( 1 ); }} placeholder="Event type" className={styles.filterControl} />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn( styles.dateControl, !dateRange?.from && "text-muted-foreground" )}>
                <CalendarIcon className="size-3.5" />
                {dateRange?.from ? dateRange.to ? `${ format( dateRange.from, "MMM d" ) } – ${ format( dateRange.to, "MMM d, yyyy" ) }` : format( dateRange.from, "MMM d, yyyy" ) : "Date range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar mode="range" selected={dateRange} onSelect={value => { setDateRange( value ); setPage( 1 ); }} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><FilterX className="size-3.5" />Clear</Button>}
        </div>
      </header>

      <div className={styles.shell}>
        <section className={styles.listPane} aria-label="Webhook requests">
          <div className={styles.listMeta}>
            <span>{data ? `${ data.totalItems.toLocaleString() } request${ data.totalItems === 1 ? "" : "s" }` : "Loading requests"}</span>
            <span>{paused ? "Auto-refresh paused" : "Updates every 10 seconds"}</span>
          </div>
          {logsQuery.isPending ? (
            <div className={styles.skeletonList}>{Array.from( { length: 8 }, ( _, index ) => <div key={index} className={styles.skeletonRow} /> )}</div>
          ) : logsQuery.isError ? (
            <div className={styles.emptyState}><p>Logs could not be loaded.</p><Button variant="outline" size="sm" onClick={() => void logsQuery.refetch()}>Try again</Button></div>
          ) : data?.items.length ? (
            <div className={styles.logList}>
              {data.items.map( item => (
                <button key={item.id} type="button" className={cn( styles.logRow, effectiveSelectedId === item.id && styles.logRowSelected )} onClick={() => selectLog( item.id )}>
                  <span className={cn( styles.statusDot, styles[ `status_${ item.processingStatus }` ] )} aria-hidden />
                  <span className={styles.logMain}>
                    <span className={styles.logTopline}><strong>{item.eventType}</strong><time dateTime={item.receivedAt}>{new Intl.DateTimeFormat( undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" } ).format( new Date( item.receivedAt ) )}</time></span>
                    <span className={styles.logPreview}>{item.preview || item.providerEventId || item.requestId}</span>
                    <span className={styles.logMetadata}><span className={styles.outcomeLabel}>{item.processingStatus}</span><span>{item.provider}</span><span>HTTP {item.responseStatus}</span><span>{item.durationMs} ms</span></span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}><p>No webhook requests match these filters.</p>{hasFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}</div>
          )}
          {data && data.totalPages > 1 && (
            <div className={styles.pagination}>
              <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage( value => value - 1 )} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
              <span>Page {data.page} of {data.totalPages}</span>
              <Button variant="outline" size="icon" disabled={page >= data.totalPages} onClick={() => setPage( value => value + 1 )} aria-label="Next page"><ChevronRight className="size-4" /></Button>
            </div>
          )}
        </section>
        <section className={styles.detailPane} aria-label="Webhook request detail">
          <WebhookLogDetailPane
            log={detailQuery.data?.log}
            loading={detailQuery.isPending && Boolean( effectiveSelectedId )}
            error={detailQuery.isError ? ( detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load request details" ) : undefined}
            onRetry={() => void detailQuery.refetch()}
          />
        </section>
      </div>

      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className={styles.mobileSheet}>
          <SheetTitle className="sr-only">Webhook request detail</SheetTitle>
          <SheetDescription className="sr-only">Sanitized request and response information.</SheetDescription>
          <WebhookLogDetailPane
            log={detailQuery.data?.log}
            loading={detailQuery.isPending}
            error={detailQuery.isError ? ( detailQuery.error instanceof Error ? detailQuery.error.message : "Unable to load request details" ) : undefined}
            onRetry={() => void detailQuery.refetch()}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
