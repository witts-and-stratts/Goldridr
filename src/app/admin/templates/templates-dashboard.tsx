"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { FileText, Mail, MessageSquareText, RotateCcw, Save, Search, History, Pencil, X, Maximize2, Minimize2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import styles from "@/styles/templates.module.css";
import type {
  TemplateAdminView,
  TemplateContent,
  TemplateRevisionView,
} from "@/lib/notifications/template-types";

type Channel = "email" | "sms" | "pdf";

interface PreviewResponse {
  success: boolean;
  rendered?: TemplateContent | null;
  unknownVariables?: string[];
  warnings?: string[];
  email?: { subject: string; preview: string; html: string; text: string };
  sms?: { full: string; segments: number; characters: number; optOut: string };
  error?: string;
  details?: string[] | string;
}

const CHANNELS: Array<{ value: Channel; label: string; icon: typeof Mail }> = [
  { value: "email", label: "Email", icon: Mail },
  { value: "sms", label: "SMS", icon: MessageSquareText },
  { value: "pdf", label: "PDF", icon: FileText },
];

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;
const NAV_KEYS = new Set( [ "ArrowDown", "ArrowUp", "Enter", "Tab", "Escape" ] );
const TEMPLATE_TIMESTAMP_FORMAT = new Intl.DateTimeFormat( "en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
} );

function formatTemplateTimestamp( value: string ): string {
  const date = new Date( value );
  return Number.isNaN( date.getTime() ) ? value : TEMPLATE_TIMESTAMP_FORMAT.format( date );
}

interface AutocompleteState {
  field: string;
  query: string;
  start: number;
  index: number;
}

function computeAutocomplete(
  field: string,
  element: HTMLInputElement | HTMLTextAreaElement
): AutocompleteState | null {
  const caret = element.selectionStart ?? element.value.length;
  const before = element.value.slice( 0, caret );
  const openIndex = before.lastIndexOf( "{{" );
  if ( openIndex === -1 ) return null;
  const between = before.slice( openIndex + 2 );
  if ( between.includes( "}" ) || between.includes( "\n" ) ) return null;
  return { field, query: between.trim(), start: openIndex, index: 0 };
}

function fieldValue( content: TemplateContent | null | undefined, name: string ): string {
  if ( !content || typeof content !== "object" ) return "";
  const value = ( content as Record<string, unknown> )[ name ];
  return typeof value === "string" ? value : "";
}

function draftFrom( template: TemplateAdminView ): Record<string, string> {
  const source = template.enabled && template.content ? template.content : template.defaultEditorContent;
  const draft: Record<string, string> = {};
  for ( const field of template.fields ) draft[ field.name ] = fieldValue( source, field.name );
  return draft;
}

function contentPreview( content: TemplateContent | null | undefined ): string {
  if ( !content ) return "";
  return fieldValue( content, "body" ) || fieldValue( content, "subject" ) || fieldValue( content, "title" ) || fieldValue( content, "message" ) || "";
}

export function TemplatesDashboard( { templates: initial }: { templates: TemplateAdminView[] } ) {
  const [ templates, setTemplates ] = useState( initial );
  const [ channel, setChannel ] = useState<Channel>( "email" );
  const [ selectedId, setSelectedId ] = useState<string | null>( null );
  const [ search, setSearch ] = useState( "" );
  const [ mobileDetailOpen, setMobileDetailOpen ] = useState( false );
  const [ editing, setEditing ] = useState( false );
  const [ draft, setDraft ] = useState<Record<string, string>>( {} );
  const [ activeField, setActiveField ] = useState( "" );
  const [ preview, setPreview ] = useState<PreviewResponse | null>( null );
  const [ previewLoading, setPreviewLoading ] = useState( false );
  const [ busy, setBusy ] = useState( false );
  const [ error, setError ] = useState<string | null>( null );
  const [ notice, setNotice ] = useState<string | null>( null );
  const [ refreshKey, setRefreshKey ] = useState( 0 );
  const [ historyOpen, setHistoryOpen ] = useState( false );
  const [ revisions, setRevisions ] = useState<TemplateRevisionView[]>( [] );
  const [ autocomplete, setAutocomplete ] = useState<AutocompleteState | null>( null );
  const [ variableSearch, setVariableSearch ] = useState( "" );
  const [ variableSearchOpen, setVariableSearchOpen ] = useState( false );
  const [ expanded, setExpanded ] = useState( false );
  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>( {} );

  const counts = useMemo( () => ( {
    email: templates.filter( item => item.channel === "email" ).length,
    sms: templates.filter( item => item.channel === "sms" ).length,
    pdf: templates.filter( item => item.channel === "pdf" ).length,
  } ), [ templates ] );

  const channelItems = useMemo( () => templates.filter( item => item.channel === channel ), [ templates, channel ] );
  const query = search.trim().toLowerCase();
  const visibleItems = useMemo( () => {
    if ( !query ) return channelItems;
    return channelItems.filter( item =>
      `${ item.label } ${ item.templateId } ${ item.description }`.toLowerCase().includes( query )
    );
  }, [ channelItems, query ] );

  const selected = useMemo(
    () => channelItems.find( item => item.templateId === selectedId ) || channelItems[ 0 ],
    [ channelItems, selectedId ]
  );
  const selectedTemplateId = selected?.templateId;
  const channelMeta = CHANNELS.find( item => item.value === channel )!;

  useEffect( () => {
    if ( !selectedTemplateId ) return;
    const controller = new AbortController();
    const timer = setTimeout( async () => {
      setPreviewLoading( true );
      try {
        const response = await fetch( "/api/admin/templates/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify( {
            channel,
            templateId: selectedTemplateId,
            ...( editing ? { content: draft } : {} ),
          } ),
          signal: controller.signal,
        } );
        const data = await response.json() as PreviewResponse;
        setPreview( data );
      } catch ( fetchError ) {
        if ( ( fetchError as Error ).name !== "AbortError" ) setPreview( { success: false, error: "Preview unavailable" } );
      } finally {
        setPreviewLoading( false );
      }
    }, 250 );
    return () => {
      clearTimeout( timer );
      controller.abort();
    };
  }, [ channel, selectedTemplateId, editing, draft, refreshKey ] );

  const unknownByField = useMemo( () => {
    const allowed = new Set( selected?.allowedVariables || [] );
    const map: Record<string, string[]> = {};
    if ( !selected ) return map;
    for ( const field of selected.fields ) {
      const value = draft[ field.name ] || "";
      const found = [ ...value.matchAll( VARIABLE_PATTERN ) ].map( match => match[ 1 ] ).filter( variable => !allowed.has( variable ) );
      if ( found.length ) map[ field.name ] = [ ...new Set( found ) ];
    }
    return map;
  }, [ selected, draft ] );

  const filteredVariables = useMemo( () => {
    const variables = selected?.allowedVariables || [];
    const query = variableSearch.trim().toLowerCase();
    return query ? variables.filter( variable => variable.toLowerCase().includes( query ) ) : variables;
  }, [ selected, variableSearch ] );

  const resetVariableSearch = () => {
    setVariableSearch( "" );
    setVariableSearchOpen( false );
  };

  const refreshTemplates = useCallback( async () => {
    const response = await fetch( "/api/admin/templates" );
    const data = await response.json() as { success: boolean; templates?: TemplateAdminView[] };
    if ( data.success && data.templates ) setTemplates( data.templates );
  }, [] );

  const updateTemplate = useCallback( ( updated: TemplateAdminView ) => {
    setTemplates( previous => previous.map( item =>
      item.channel === updated.channel && item.templateId === updated.templateId ? updated : item
    ) );
  }, [] );

  const startEditing = () => {
    if ( !selected ) return;
    setDraft( draftFrom( selected ) );
    setActiveField( selected.fields[ 0 ]?.name || "" );
    setEditing( true );
    setError( null );
    setNotice( null );
    resetVariableSearch();
  };

  const cancelEditing = () => {
    setEditing( false );
    setExpanded( false );
    setError( null );
    setNotice( null );
    resetVariableSearch();
  };

  const errorMessage = ( data: { error?: string; details?: string[] | string } ) =>
    Array.isArray( data.details ) ? data.details.join( ", " ) : data.details || data.error || "Request failed";

  const save = async () => {
    if ( !selected ) return;
    setBusy( true );
    setError( null );
    setNotice( null );
    try {
      const response = await fetch( `/api/admin/templates/${ channel }/${ encodeURIComponent( selected.templateId ) }`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { expectedRevision: selected.revision, content: draft } ),
      } );
      const data = await response.json();
      if ( response.status === 409 ) {
        setError( `Another administrator changed this template (now revision ${ data.actualRevision }). Reloading the latest content.` );
        await refreshTemplates();
      } else if ( !response.ok || !data.success ) {
        setError( errorMessage( data ) );
      } else {
        updateTemplate( data.template as TemplateAdminView );
        setDraft( draftFrom( data.template as TemplateAdminView ) );
        setNotice( "Template override saved." );
      }
    } catch {
      setError( "Save failed. Check your connection and try again." );
    } finally {
      setBusy( false );
      setRefreshKey( key => key + 1 );
    }
  };

  const reset = async () => {
    if ( !selected ) return;
    setBusy( true );
    setError( null );
    setNotice( null );
    try {
      const response = await fetch( `/api/admin/templates/${ channel }/${ encodeURIComponent( selected.templateId ) }`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { expectedRevision: selected.revision } ),
      } );
      const data = await response.json();
      if ( response.status === 409 ) {
        setError( "Another administrator changed this template. Reloading the latest content." );
        await refreshTemplates();
      } else if ( !response.ok || !data.success ) {
        setError( errorMessage( data ) );
      } else {
        updateTemplate( data.template as TemplateAdminView );
        setEditing( false );
        setExpanded( false );
        setNotice( "Reverted to the code default." );
      }
    } catch {
      setError( "Reset failed. Check your connection and try again." );
    } finally {
      setBusy( false );
      setRefreshKey( key => key + 1 );
    }
  };

  const toggleEnabled = async ( enabled: boolean ) => {
    if ( !selected ) return;
    setBusy( true );
    setError( null );
    setNotice( null );
    try {
      const response = await fetch( `/api/admin/templates/${ channel }/${ encodeURIComponent( selected.templateId ) }/enabled`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { enabled, expectedRevision: selected.revision } ),
      } );
      const data = await response.json();
      if ( response.status === 409 ) {
        setError( "Another administrator changed this template. Reloading the latest content." );
        await refreshTemplates();
      } else if ( !response.ok || !data.success ) {
        setError( errorMessage( data ) );
      } else {
        updateTemplate( data.template as TemplateAdminView );
        setNotice( enabled ? "Override enabled." : "Override disabled; the code default is now used." );
      }
    } catch {
      setError( "Update failed. Check your connection and try again." );
    } finally {
      setBusy( false );
      setRefreshKey( key => key + 1 );
    }
  };

  const openHistory = async () => {
    if ( !selected ) return;
    setHistoryOpen( true );
    setRevisions( [] );
    const response = await fetch( `/api/admin/templates/${ channel }/${ encodeURIComponent( selected.templateId ) }/revisions` );
    const data = await response.json();
    if ( data.success ) setRevisions( data.revisions as TemplateRevisionView[] );
  };

  const revert = async ( revision: number ) => {
    if ( !selected ) return;
    setBusy( true );
    setError( null );
    try {
      const response = await fetch( `/api/admin/templates/${ channel }/${ encodeURIComponent( selected.templateId ) }/revisions/${ revision }/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { expectedRevision: selected.revision } ),
      } );
      const data = await response.json();
      if ( response.status === 409 ) {
        setError( "Another administrator changed this template. Reloading the latest content." );
        await refreshTemplates();
      } else if ( !response.ok || !data.success ) {
        setError( errorMessage( data ) );
      } else {
        updateTemplate( data.template as TemplateAdminView );
        setNotice( `Reverted to revision ${ revision }.` );
        await openHistory();
      }
    } catch {
      setError( "Revert failed. Check your connection and try again." );
    } finally {
      setBusy( false );
      setRefreshKey( key => key + 1 );
    }
  };

  const insertVariable = ( variable: string ) => {
    if ( !selected ) return;
    const name = activeField || selected.fields[ 0 ]?.name || "body";
    const token = `{{ ${ variable } }}`;
    const element = fieldRefs.current[ name ];
    if ( !element ) {
      setDraft( previous => ( { ...previous, [ name ]: `${ previous[ name ] || "" }${ token }` } ) );
      return;
    }
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;
    const next = `${ element.value.slice( 0, start ) }${ token }${ element.value.slice( end ) }`;
    setDraft( previous => ( { ...previous, [ name ]: next } ) );
    setAutocomplete( null );
    requestAnimationFrame( () => {
      element.focus();
      element.setSelectionRange( start + token.length, start + token.length );
    } );
  };

  const matchesFor = ( query: string ): string[] => {
    const variables = selected?.allowedVariables || [];
    const normalized = query.toLowerCase();
    const matches = normalized ? variables.filter( variable => variable.toLowerCase().includes( normalized ) ) : variables;
    return matches.slice( 0, 8 );
  };

  const syncAutocomplete = ( field: string, element: HTMLInputElement | HTMLTextAreaElement ) => {
    const next = computeAutocomplete( field, element );
    setAutocomplete( previous => {
      if ( !next ) return null;
      if ( previous && previous.field === next.field && previous.start === next.start && previous.query === next.query ) return previous;
      return next;
    } );
  };

  const acceptVariable = ( variable: string ) => {
    const current = autocomplete;
    if ( !current ) return;
    const element = fieldRefs.current[ current.field ];
    const value = element?.value ?? draft[ current.field ] ?? "";
    const caret = element?.selectionStart ?? current.start;
    const end = value.slice( caret, caret + 2 ) === "}}" ? caret + 2 : caret;
    const token = `{{ ${ variable } }}`;
    const next = `${ value.slice( 0, current.start ) }${ token }${ value.slice( end ) }`;
    setDraft( previous => ( { ...previous, [ current.field ]: next } ) );
    setAutocomplete( null );
    const cursor = current.start + token.length;
    requestAnimationFrame( () => {
      const target = fieldRefs.current[ current.field ];
      target?.focus();
      target?.setSelectionRange( cursor, cursor );
    } );
  };

  const onFieldKeyDown = ( event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement> ) => {
    if ( !autocomplete ) return;
    const matches = matchesFor( autocomplete.query );
    if ( !matches.length ) return;
    if ( event.key === "ArrowDown" ) {
      event.preventDefault();
      setAutocomplete( previous => previous ? { ...previous, index: ( previous.index + 1 ) % matches.length } : previous );
    } else if ( event.key === "ArrowUp" ) {
      event.preventDefault();
      setAutocomplete( previous => previous ? { ...previous, index: ( previous.index - 1 + matches.length ) % matches.length } : previous );
    } else if ( event.key === "Enter" || event.key === "Tab" ) {
      event.preventDefault();
      acceptVariable( matches[ autocomplete.index % matches.length ] );
    } else if ( event.key === "Escape" ) {
      event.preventDefault();
      setAutocomplete( null );
    }
  };

  const autocompleteMenu = ( fieldName: string ) => {
    if ( autocomplete?.field !== fieldName ) return null;
    const matches = matchesFor( autocomplete.query );
    if ( !matches.length ) {
      return <div className={ styles.autocomplete }><p className={ styles.autocompleteEmpty }>No matching variables</p></div>;
    }
    return (
      <div className={ styles.autocomplete } role="listbox" aria-label="Insert variable">
        { matches.map( ( variable, index ) => (
          <button
            key={ variable }
            type="button"
            role="option"
            aria-selected={ index === autocomplete.index }
            className={ cn( styles.autocompleteItem, index === autocomplete.index && styles.autocompleteItemActive ) }
            onMouseDown={ event => {
              event.preventDefault();
              acceptVariable( variable );
            } }
          >
            <span className="font-mono">{ `{{ ${ variable } }}` }</span>
          </button>
        ) ) }
      </div>
    );
  };

  const selectChannel = ( value: Channel ) => {
    setChannel( value );
    setSearch( "" );
    setSelectedId( null );
    setEditing( false );
    setExpanded( false );
    setError( null );
    setNotice( null );
    resetVariableSearch();
  };

  const selectTemplate = ( item: TemplateAdminView ) => {
    setSelectedId( item.templateId );
    setEditing( false );
    setExpanded( false );
    setError( null );
    setNotice( null );
    resetVariableSearch();
    if ( window.matchMedia( "(max-width: 1023px)" ).matches ) setMobileDetailOpen( true );
  };

  const renderField = ( field: { name: string; label: string; multiline?: boolean; maxLength?: number; placeholder?: string } ) => (
    <div className={styles.fieldGroup} key={ field.name }>
      <label className={styles.fieldLabel} htmlFor={ `template-field-${ field.name }` }>{ field.label }</label>
      { field.multiline ? (
        <Textarea
          id={ `template-field-${ field.name }` }
          ref={ element => { fieldRefs.current[ field.name ] = element; } }
          value={ draft[ field.name ] || "" }
          maxLength={ field.maxLength }
          placeholder={ field.placeholder }
          onFocus={ event => { setActiveField( field.name ); syncAutocomplete( field.name, event.currentTarget ); } }
          onChange={ event => { const element = event.currentTarget; setDraft( previous => ( { ...previous, [ field.name ]: element.value } ) ); syncAutocomplete( field.name, element ); } }
          onKeyDown={ onFieldKeyDown }
          onKeyUp={ event => { if ( !NAV_KEYS.has( event.key ) ) syncAutocomplete( field.name, event.currentTarget ); } }
          onClick={ event => { setActiveField( field.name ); syncAutocomplete( field.name, event.currentTarget ); } }
          onBlur={ () => setAutocomplete( null ) }
          className={ styles.fieldTextarea }
        />
      ) : (
        <Input
          id={ `template-field-${ field.name }` }
          ref={ element => { fieldRefs.current[ field.name ] = element; } }
          value={ draft[ field.name ] || "" }
          maxLength={ field.maxLength }
          placeholder={ field.placeholder }
          onFocus={ event => { setActiveField( field.name ); syncAutocomplete( field.name, event.currentTarget ); } }
          onChange={ event => { const element = event.currentTarget; setDraft( previous => ( { ...previous, [ field.name ]: element.value } ) ); syncAutocomplete( field.name, element ); } }
          onKeyDown={ onFieldKeyDown }
          onKeyUp={ event => { if ( !NAV_KEYS.has( event.key ) ) syncAutocomplete( field.name, event.currentTarget ); } }
          onClick={ event => { setActiveField( field.name ); syncAutocomplete( field.name, event.currentTarget ); } }
          onBlur={ () => setAutocomplete( null ) }
          className={ styles.fieldInput }
        />
      ) }
      { autocompleteMenu( field.name ) }
      { unknownByField[ field.name ]?.length ? (
        <p className={ styles.fieldError }>Unknown variable(s): { unknownByField[ field.name ].map( variable => `{{ ${ variable } }}` ).join( ", " ) }</p>
      ) : null }
    </div>
  );

  const previewPane = selected ? (
    <div className={ styles.previewCards }>
      { previewLoading ? <p className={ styles.detailDescription }>Rendering preview…</p> : null }
      { preview && !preview.success ? <div className={ styles.errorNotice }>{ Array.isArray( preview.details ) ? preview.details.join( ", " ) : preview.details || preview.error || "Preview unavailable" }</div> : null }
      { selected.channel === "email" && preview?.email ? (
        <>
          <div className={ styles.subjectCard }>
            <p className={ styles.detailLabel }>Subject</p>
            <p className="mt-1 font-medium">{ preview.email.subject }</p>
            { preview.email.preview ? <p className="mt-2 text-xs text-muted-foreground">Preview: { preview.email.preview }</p> : null }
          </div>
          <iframe title={ `Email preview: ${ selected.label }` } srcDoc={ preview.email.html } sandbox="" className={ styles.frame } />
        </>
      ) : null }
      { selected.channel === "sms" && preview?.sms ? (
        <div>
          <pre className={ styles.smsBody }>{ preview.sms.full }</pre>
          <p className={ styles.smsStats }>{ preview.sms.characters } chars · { preview.sms.segments } segment{ preview.sms.segments === 1 ? "" : "s" }</p>
        </div>
      ) : null }
      { selected.channel === "pdf" ? (
        <iframe title={ `PDF preview: ${ selected.label }` } src={ `/api/admin/templates/pdf?template=${ selected.templateId }` } className={ styles.frame } />
      ) : null }
    </div>
  ) : (
    <div className={ styles.emptyDetail }>Select a template to preview it.</div>
  );

  const detail = selected ? (
    <>
      <div className={ styles.detailHeader }>
        <div className={ styles.detailHeaderRow }>
          <h2 className={ styles.detailTitle }>{ selected.label }</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={ selected.source === "override" ? "default" : "outline" } className="font-mono text-xs">
              { selected.source === "override" ? "Custom" : "Default" }
            </Badge>
            { selected.channel === "pdf" ? (
              <Button asChild size="sm" variant="outline">
                <a href={ `/api/admin/templates/pdf?template=${ selected.templateId }` } target="_blank" rel="noreferrer">Open</a>
              </Button>
            ) : null }
            { selected.adminEditable ? <Button size="sm" variant="outline" onClick={ openHistory }>
              <History className="size-3.5" />History
            </Button> : null }
            { !editing && selected.adminEditable ? (
              <Button size="sm" onClick={ startEditing }>
                <Pencil className="size-3.5" />Customise
              </Button>
            ) : null }
            <span className="hidden lg:inline-flex">
              <Button
                size="sm"
                variant="outline"
                onClick={ () => setExpanded( value => !value ) }
                title={ expanded ? "Collapse to list" : "Expand to full width" }
              >
                { expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" /> }
                { expanded ? "Collapse" : "Expand" }
              </Button>
            </span>
          </div>
        </div>
        <p className={ styles.detailMeta }>{ channelMeta.label } · { selected.templateId }</p>
        <p className={ styles.detailDescription }>{ selected.description }</p>
        <div className={ cn( styles.metaRow, "mt-2" ) }>
          <span>Revision { selected.revision }</span>
          { selected.updatedBy ? <span>Edited by { selected.updatedBy }</span> : null }
          { selected.updatedAt ? <span>{ formatTemplateTimestamp( selected.updatedAt ) }</span> : null }
          { selected.sourceUpdatedAt ? <span>Applied { formatTemplateTimestamp( selected.sourceUpdatedAt ) }</span> : null }
        </div>
      </div>

      { editing ? (
        <div className={ styles.editor }>
          { error ? <div className={ styles.errorNotice }>{ error }</div> : null }
          { notice ? <div className={ styles.notice }>{ notice }</div> : null }
          { selected.complianceManaged ? (
            <div className={ styles.notice }>
              Compliance text (frequency, rates, HELP/STOP) is added automatically after the message and cannot be edited or removed.
            </div>
          ) : null }
          { selected.channel === "email" ? (
            <div className={ styles.notice }>
              The React Email layout and booking details are developer-owned. You can customise the approved subject, preview, heading, message, CTA, and footer content buckets.
            </div>
          ) : null }
          <div className={ styles.editorToolbar }>
            <Button size="sm" onClick={ save } disabled={ busy }>
              <Save className="size-3.5" />Save
            </Button>
            <Button size="sm" variant="outline" onClick={ cancelEditing } disabled={ busy }>
              <X className="size-3.5" />Cancel
            </Button>
            { selected.source === "override" ? (
              <Button size="sm" variant="outline" onClick={ () => toggleEnabled( false ) } disabled={ busy }>
                Disable override
              </Button>
            ) : null }
            { selected.revision > 0 ? (
              <Button size="sm" variant="ghost" onClick={ reset } disabled={ busy }>
                <RotateCcw className="size-3.5" />Reset to default
              </Button>
            ) : null }
          </div>
          <div className={ styles.editorGrid }>
            <div className="space-y-4">
              <div className={ styles.fieldGroup }>
                <div className="flex items-center justify-between gap-2">
                  <span className={ styles.fieldLabel }>Insert variable</span>
                  <button
                    type="button"
                    className={ styles.searchToggle }
                    aria-label={ variableSearchOpen ? "Close variable search" : "Search variables" }
                    title={ variableSearchOpen ? "Close variable search" : "Search variables" }
                    onClick={ () => {
                      setVariableSearchOpen( open => !open );
                      setVariableSearch( "" );
                    } }
                  >
                    { variableSearchOpen ? <X className="size-3" /> : <Search className="size-3" /> }
                  </button>
                </div>
                { variableSearchOpen ? (
                  <Input
                    autoFocus
                    value={ variableSearch }
                    onChange={ event => setVariableSearch( event.target.value ) }
                    placeholder="Search variables..."
                    className="h-7 text-xs"
                  />
                ) : null }
                { filteredVariables.length ? (
                  <div className={ styles.palette }>
                    { filteredVariables.map( variable => (
                      <button key={ variable } type="button" className={ styles.paletteChip } onClick={ () => insertVariable( variable ) }>
                        { `{{ ${ variable } }}` }
                      </button>
                    ) ) }
                  </div>
                ) : (
                  <p className={ styles.autocompleteEmpty }>No variables match.</p>
                ) }
                <p className="text-xs text-muted-foreground">Type <span className="font-mono">{ "{{" }</span> in a field to autocomplete, then use ↑/↓ and Enter.</p>
              </div>
              { selected.fields.map( renderField ) }
            </div>
            <div>{ previewPane }</div>
          </div>
        </div>
      ) : (
        <div className={ styles.detailPane }>
          { error ? <div className={ cn( styles.errorNotice, "m-5" ) }>{ error }</div> : null }
          { notice ? <div className={ cn( styles.notice, "m-5" ) }>{ notice }</div> : null }
          { previewPane }
        </div>
      ) }
    </>
  ) : (
    <div className={ styles.emptyDetail }>Select a template to preview it.</div>
  );

  return (
    <div className={ styles.page }>
      { !expanded ? (
      <header className={ styles.header }>
        <div className={ styles.headerRow }>
          <div>
            <h1 className={ styles.title }>Templates</h1>
            <p className={ styles.subtitle }>
              { templates.length } templates across email, SMS, and PDF
            </p>
          </div>
        </div>
        <div className={ styles.mobileChannelSelect }>
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
      ) : null }

      <div className={ expanded ? styles.shellExpanded : styles.shell }>
        { !expanded ? (
        <>
        <aside className={ styles.sidebar }>
          <nav className={ styles.sidebarNav }>
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
                  <span className={ styles.sidebarBadge }>{ counts[ item.value ] }</span>
                ) : null }
              </button>
            ) ) }
          </nav>
        </aside>

        <section className={ styles.listPane }>
          <div className={ styles.listToolbar }>
            <div className={ styles.listToolbarHeader }>
              <div>
                <span className={ styles.folderTitle }>{ channelMeta.label }</span>
                <p className={ styles.folderMeta }>
                  { counts[ channel ] } total{ query ? `, ${ visibleItems.length } matching search` : "" }
                </p>
              </div>
            </div>
            <div className={ styles.searchWrap }>
              <Search className={ styles.searchIcon } />
              <Input
                value={ search }
                onChange={ event => setSearch( event.target.value ) }
                placeholder={ `Search ${ channelMeta.label.toLowerCase() } templates...` }
                className={ styles.searchInput }
              />
            </div>
          </div>

          { visibleItems.length ? visibleItems.map( item => (
            <button
              key={ item.templateId }
              type="button"
              onClick={ () => selectTemplate( item ) }
              className={ cn( styles.listRow, selected?.templateId === item.templateId && styles.listRowActive ) }
            >
              <span className={ styles.rowHead }>
                <span className={ styles.rowTitle }>{ item.label }</span>
                <span className={ styles.rowName }>{ item.templateId }</span>
              </span>
              <span className={ styles.rowPreview }>{ item.description }</span>
              <span className={ styles.rowMeta }>
                { item.source === "override" ? `Custom · rev ${ item.revision }` : "Default" }
              </span>
            </button>
          ) ) : (
            <p className={ styles.emptyList }>No templates match this search.</p>
          ) }
        </section>
        </>
        ) : null }

        <section className={ styles.detailPane }>
          { detail }
        </section>
      </div>

      <Sheet open={ mobileDetailOpen } onOpenChange={ setMobileDetailOpen }>
        <SheetContent side="right" className={ styles.sheetContent }>
          <SheetTitle className="sr-only">Template</SheetTitle>
          <SheetDescription className="sr-only">Selected template preview and editor.</SheetDescription>
          <div className="flex flex-col gap-4 p-5">{ detail }</div>
        </SheetContent>
      </Sheet>

      <Sheet open={ historyOpen } onOpenChange={ setHistoryOpen }>
        <SheetContent side="right" className={ styles.sheetContent }>
          <div className="p-5">
            <SheetTitle>Revision history</SheetTitle>
            <SheetDescription>{ selected ? `${ selected.label } (${ selected.templateId })` : "" }</SheetDescription>
            { revisions.length ? (
              <div className={ styles.historyList }>
                { revisions.map( revision => (
                  <div key={ revision.revision } className={ styles.historyItem }>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Revision { revision.revision } · { revision.action }</p>
                      <p className={ styles.historyAction }>
                        { revision.createdBy || "System" }{ revision.createdAt ? ` · ${ formatTemplateTimestamp( revision.createdAt ) }` : "" }
                      </p>
                      { revision.note ? <p className="mt-1 text-xs text-muted-foreground">{ revision.note }</p> : null }
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ contentPreview( revision.content ) }</p>
                    </div>
                    { revision.content ? (
                      <Button size="sm" variant="outline" disabled={ busy } onClick={ () => revert( revision.revision ) }>
                        Revert
                      </Button>
                    ) : null }
                  </div>
                ) ) }
              </div>
            ) : (
              <p className={ styles.emptyList }>No revisions yet.</p>
            ) }
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
