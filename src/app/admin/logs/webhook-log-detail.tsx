"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import type { WebhookLogDetail } from "./types";
import styles from "@/styles/webhook-logs.module.css";

function pretty( value: unknown ): string {
  if ( typeof value === "string" ) {
    try { return JSON.stringify( JSON.parse( value ), null, 2 ); } catch { return value; }
  }
  return JSON.stringify( value, null, 2 );
}

function CopyButton( { value }: { value: string } ) {
  const [ copied, setCopied ] = useState( false );
  const copy = async () => {
    await navigator.clipboard.writeText( value );
    setCopied( true );
    window.setTimeout( () => setCopied( false ), 1_500 );
  };
  return <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy to clipboard">{copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Button>;
}

function CodeBlock( { value, empty = "No data recorded." }: { value: unknown; empty?: string } ) {
  const content = pretty( value );
  if ( !content || content === "{}" ) return <p className={styles.noData}>{empty}</p>;
  return <div className={styles.codeWrap}><CopyButton value={content} /><pre>{content}</pre></div>;
}

function Fact( { label, value }: { label: string; value: string | number } ) {
  return <div className={styles.fact}><dt>{label}</dt><dd>{value || "—"}</dd></div>;
}

export function WebhookLogDetailPane( { log, loading, error, onRetry }: { log?: WebhookLogDetail; loading: boolean; error?: string; onRetry?: () => void } ) {
  if ( loading ) return <div className={styles.detailSkeleton}><div /><div /><div /></div>;
  if ( error ) return <div className={styles.detailEmpty}><div><p>{error}</p>{onRetry && <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}</div></div>;
  if ( !log ) return <div className={styles.detailEmpty}>Select a request to inspect its sanitized payload and processing result.</div>;
  return (
    <article className={styles.detailArticle}>
      <header className={styles.detailHeader}>
        <div className={styles.detailTitleRow}>
          <div className={styles.detailTitle}>
            <span className={styles.providerName}>{log.provider}</span>
            <h2>{log.eventType}</h2>
          </div>
          <Badge variant={log.processingStatus === "failed" || log.processingStatus === "rejected" ? "destructive" : "outline"}>{log.processingStatus}</Badge>
        </div>
        <p className={styles.requestId}>{log.requestId}</p>
      </header>
      <Tabs defaultValue="overview" className={styles.tabs}>
        <TabsList className={styles.tabList}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="payload">Payload</TabsTrigger>
          <TabsTrigger value="response">Response</TabsTrigger>
          <TabsTrigger value="error">Error</TabsTrigger>
        </TabsList>
        <div className={styles.tabBody}>
          <TabsContent value="overview">
            <dl className={styles.factGrid}>
              <Fact label="Received" value={new Intl.DateTimeFormat( undefined, { dateStyle: "medium", timeStyle: "long" } ).format( new Date( log.receivedAt ) )} />
              <Fact label="Provider" value={log.provider} />
              <Fact label="Endpoint" value={`${log.method} ${log.endpoint}`} />
              <Fact label="HTTP response" value={log.responseStatus} />
              <Fact label="Validation" value={log.validationStatus.replaceAll( "_", " " )} />
              <Fact label="Processing" value={log.processingStatus} />
              <Fact label="Duration" value={`${log.durationMs} ms`} />
              <Fact label="Source IP" value={log.sourceIp} />
              <Fact label="Provider event ID" value={log.providerEventId} />
              <Fact label="Provider message ID" value={log.providerMessageId} />
              <Fact label="Content type" value={log.contentType} />
              <Fact label="Expires" value={new Intl.DateTimeFormat( undefined, { dateStyle: "medium" } ).format( new Date( log.expiresAt ) )} />
            </dl>
          </TabsContent>
          <TabsContent value="headers" className={styles.stack}>
            <section><h3>Request headers</h3><CodeBlock value={log.requestHeaders} /></section>
            <section><h3>Response headers</h3><CodeBlock value={log.responseHeaders} /></section>
          </TabsContent>
          <TabsContent value="payload" className={styles.stack}>
            <section><h3>Parsed payload</h3><CodeBlock value={log.payload} /></section>
            <section><h3>Raw body</h3><CodeBlock value={log.rawBody} /></section>
          </TabsContent>
          <TabsContent value="response"><CodeBlock value={log.responseBody} empty="The webhook returned an empty response body." /></TabsContent>
          <TabsContent value="error"><CodeBlock value={log.errorMessage} empty="No processing error was recorded." /></TabsContent>
        </div>
      </Tabs>
    </article>
  );
}
