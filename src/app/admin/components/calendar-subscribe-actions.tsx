"use client";

import { useEffect, useState } from "react";
import { CalendarPlus, Check, Copy, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";

function getFeedUrl( token: string ) {
  const origin = ( process.env.NEXT_PUBLIC_BASE_URL || window.location.origin ).replace( /\/$/, "" ).replace( /^http:/, "https:" );
  return `${ origin }/api/admin/bookings/feed?token=${ encodeURIComponent( token ) }`;
}

export function CalendarSubscribeActions() {
  const [feedToken, setFeedToken] = useState<string | null>( null );
  const [hasActiveFeed, setHasActiveFeed] = useState( false );
  const [isLoading, setIsLoading] = useState( true );
  const [isCreating, setIsCreating] = useState( false );
  const [copied, setCopied] = useState( false );
  const feedUrl = feedToken ? getFeedUrl( feedToken ) : null;

  useEffect( () => {
    void fetch( "/api/admin/bookings/feed-token" )
      .then( async response => {
        const data = await response.json() as { active?: boolean; error?: string };
        if ( !response.ok ) throw new Error( data.error || "Unable to load calendar feed status" );
        setHasActiveFeed( Boolean( data.active ) );
      } )
      .catch( error => toast.error( error instanceof Error ? error.message : "Unable to load calendar feed status" ) )
      .finally( () => setIsLoading( false ) );
  }, [] );

  const createFeed = async () => {
    if ( hasActiveFeed && !window.confirm( "Replace the active calendar feed? Existing subscriptions will stop updating." ) ) return;
    setIsCreating( true );
    try {
      const response = await fetch( "/api/admin/bookings/feed-token", { method: "POST" } );
      const data = await response.json() as { success?: boolean; token?: string; error?: string };
      if ( !response.ok || !data.success || !data.token ) throw new Error( data.error || "Unable to create calendar feed" );
      setFeedToken( data.token );
      setHasActiveFeed( true );
      toast.success( "Calendar subscription link created" );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to create calendar feed" );
    } finally {
      setIsCreating( false );
    }
  };

  const copyFeedUrl = async () => {
    if ( !feedUrl ) return;
    await navigator.clipboard.writeText( feedUrl );
    setCopied( true );
    toast.success( "Feed URL copied" );
    window.setTimeout( () => setCopied( false ), 2000 );
  };

  if ( feedUrl ) {
    return <>
      <Button variant="outline" size="sm" asChild>
        <a href={feedUrl}><Smartphone className="size-3.5" /> Apple Calendar</a>
      </Button>
      <Button variant="outline" size="icon" onClick={copyFeedUrl} aria-label="Copy calendar feed URL" title="Copy calendar feed URL">
        {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
      </Button>
    </>;
  }

  return <Button variant="outline" size="sm" onClick={createFeed} disabled={isLoading || isCreating}>
    {isLoading || isCreating ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarPlus className="size-3.5" />}
    {hasActiveFeed ? "Replace Subscription" : "Subscribe"}
  </Button>;
}
