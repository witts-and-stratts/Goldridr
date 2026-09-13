"use client";

import { useMemo, useState } from "react";
import { FileText, Mail, MessageSquareText, Search } from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/admin-ui/sheet";
import { cn } from "@/lib/utils";
import styles from "@/styles/templates.module.css";

interface SmsPreview {
  id: string;
  name: string;
  label: string;
  description: string;
  body: string;
}

interface EmailPreview {
  id: string;
  name: string;
  label: string;
  description: string;
  subject: string;
  preview: string;
  html: string;
  text: string;
}

interface PdfPreview {
  id: string;
  label: string;
  description: string;
}

interface TemplatesDashboardProps {
  sms: SmsPreview[];
  emails: EmailPreview[];
  pdfs: PdfPreview[];
}

type Channel = "email" | "sms" | "pdf";

interface TemplateItem {
  id: string;
  channel: Channel;
  name: string;
  label: string;
  description: string;
  body?: string;
  subject?: string;
  preview?: string;
  html?: string;
}

const CHANNELS: Array<{ value: Channel; label: string; icon: typeof Mail }> = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquareText },
  { value: "pdf", label: "PDF", icon: FileText },
];

function smsStats( body: string ) {
  const segments = Math.max( 1, Math.ceil( body.length / 160 ) );
  return `${ body.length } chars · ${ segments } segment${ segments === 1 ? "" : "s" }`;
}

function channelOf( item: TemplateItem ) {
  return CHANNELS.find( channel => channel.value === item.channel )!;
}

function TemplateDetail( { item }: { item: TemplateItem | undefined } ) {
  if ( !item ) {
    return <div className={styles.emptyDetail}>Select a template to preview it.</div>;
  }

  const channel = channelOf( item );

  return (
    <>
      <div className={styles.detailHeader}>
        <div className={styles.detailHeaderRow}>
          <h2 className={styles.detailTitle}>{ item.label }</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-[10px]">{ item.name }</Badge>
            { item.channel === "pdf" ? (
              <Button asChild size="sm" variant="outline">
                <a href={ `/api/admin/templates/pdf?template=${ item.id }` } target="_blank" rel="noreferrer">
                  Open
                </a>
              </Button>
            ) : null }
          </div>
        </div>
        <p className={styles.detailMeta}>{ channel.label } template</p>
        <p className={styles.detailDescription}>{ item.description }</p>
        { item.subject ? (
          <div className={styles.detailSubject}>
            <p className={styles.detailLabel}>Subject</p>
            <p className="mt-1 font-medium">{ item.subject }</p>
            { item.preview ? <p className="mt-2 text-xs text-muted-foreground">Preview: { item.preview }</p> : null }
          </div>
        ) : null }
      </div>

      { item.channel === "email" ? (
        <iframe title={ `Email preview: ${ item.label }` } srcDoc={ item.html } sandbox="" className={styles.frame} />
      ) : item.channel === "sms" ? (
        <div className={styles.detailBody}>
          <pre className={styles.smsBody}>{ item.body }</pre>
          <p className={styles.smsStats}>{ item.body ? smsStats( item.body ) : "" }</p>
        </div>
      ) : (
        <iframe title={ `PDF preview: ${ item.label }` } src={ `/api/admin/templates/pdf?template=${ item.id }` } className={styles.frame} />
      ) }
    </>
  );
}

export function TemplatesDashboard( { sms, emails, pdfs }: TemplatesDashboardProps ) {
  const [ channel, setChannel ] = useState<Channel>( "email" );
  const [ selectedId, setSelectedId ] = useState<string | null>( null );
  const [ search, setSearch ] = useState( "" );
  const [ mobileDetailOpen, setMobileDetailOpen ] = useState( false );

  const items = useMemo<TemplateItem[]>( () => [
    ...emails.map( email => ( { ...email, channel: "email" as const } ) ),
    ...sms.map( message => ( { ...message, channel: "sms" as const } ) ),
    ...pdfs.map( pdf => ( { id: pdf.id, channel: "pdf" as const, name: pdf.id, label: pdf.label, description: pdf.description } ) ),
  ], [ emails, sms, pdfs ] );

  const counts = useMemo( () => ( {
    email: items.filter( item => item.channel === "email" ).length,
    sms: items.filter( item => item.channel === "sms" ).length,
    pdf: items.filter( item => item.channel === "pdf" ).length,
  } ), [ items ] );

  const channelItems = useMemo( () => items.filter( item => item.channel === channel ), [ items, channel ] );
  const query = search.trim().toLowerCase();
  const visibleItems = useMemo( () => {
    if ( !query ) return channelItems;
    return channelItems.filter( item =>
      `${ item.label } ${ item.name } ${ item.description } ${ item.subject || "" } ${ item.body || "" }`.toLowerCase().includes( query )
    );
  }, [ channelItems, query ] );

  const selected = visibleItems.find( item => item.id === selectedId ) || visibleItems[ 0 ];
  const channelMeta = CHANNELS.find( item => item.value === channel )!;

  const selectChannel = ( value: Channel ) => {
    setChannel( value );
    setSearch( "" );
    setSelectedId( null );
  };

  const selectTemplate = ( item: TemplateItem ) => {
    setSelectedId( item.id );
    if ( window.matchMedia( "(max-width: 1023px)" ).matches ) setMobileDetailOpen( true );
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Templates</h1>
            <p className={styles.subtitle}>
              { items.length } templates across email, SMS, and PDF
            </p>
          </div>
        </div>
        <div className={styles.mobileChannelSelect}>
          <Select value={ channel } onValueChange={ value => selectChannel( value as Channel ) }>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              { CHANNELS.map( item => (
                <SelectItem key={ item.value } value={ item.value }>
                  { item.label } ({ counts[ item.value ] })
                </SelectItem>
              ) ) }
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
            { CHANNELS.map( item => (
              <button
                key={ item.value }
                type="button"
                onClick={ () => selectChannel( item.value ) }
                className={ cn( styles.sidebarButton, channel === item.value && styles.sidebarButtonActive ) }
                aria-label={ item.label }
                title={ item.label }
              >
                <item.icon className="size-4" />
                { counts[ item.value ] > 0 ? (
                  <span className={styles.sidebarBadge}>{ counts[ item.value ] }</span>
                ) : null }
              </button>
            ) ) }
          </nav>
        </aside>

        <section className={styles.listPane}>
          <div className={styles.listToolbar}>
            <div className={styles.listToolbarHeader}>
              <div>
                <span className={styles.folderTitle}>{ channelMeta.label }</span>
                <p className={styles.folderMeta}>
                  { counts[ channel ] } total{ query ? `, ${ visibleItems.length } matching search` : "" }
                </p>
              </div>
            </div>
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} />
              <Input
                value={ search }
                onChange={ event => setSearch( event.target.value ) }
                placeholder={ `Search ${ channelMeta.label.toLowerCase() } templates...` }
                className={styles.searchInput}
              />
            </div>
          </div>

          { visibleItems.length ? visibleItems.map( item => (
            <button
              key={ item.id }
              type="button"
              onClick={ () => selectTemplate( item ) }
              className={ cn( styles.listRow, selected?.id === item.id && styles.listRowActive ) }
            >
              <span className={styles.rowHead}>
                <span className={styles.rowTitle}>{ item.label }</span>
                <span className={styles.rowName}>{ item.name }</span>
              </span>
              <span className={styles.rowPreview}>{ item.subject || item.body || item.description }</span>
              <span className={styles.rowMeta}>{ item.id }</span>
            </button>
          ) ) : (
            <p className={styles.emptyList}>No templates match this search.</p>
          ) }
        </section>

        <section className={styles.detailPane}>
          <TemplateDetail item={ selected } />
        </section>
      </div>

      <Sheet open={ mobileDetailOpen } onOpenChange={ setMobileDetailOpen }>
        <SheetContent side="right" className={styles.sheetContent}>
          <SheetTitle className="sr-only">Template preview</SheetTitle>
          <SheetDescription className="sr-only">Selected template preview.</SheetDescription>
          <TemplateDetail item={ selected } />
        </SheetContent>
      </Sheet>
    </div>
  );
}
