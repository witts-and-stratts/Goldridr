"use client";

import { useEffect, useState } from "react";
import { CalendarIcon, Check, Copy, Globe, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";

function getCalLinks( token: string ) {
  if ( typeof window === "undefined" ) return { google: "", raw: "" };
  const origin = ( process.env.NEXT_PUBLIC_BASE_URL || window.location.origin ).replace( /\/$/, "" ).replace( /^http:/, "https:" );
  const raw = `${ origin }/api/admin/bookings/feed?token=${ encodeURIComponent( token ) }`;
  return {
    apple: raw.replace( /^https:/, "webcal:" ),
    google: `https://www.google.com/calendar/render?cid=${encodeURIComponent(raw)}`,
    raw,
  };
}

export function CalendarSyncCard() {
  const [copied, setCopied] = useState(false);
  const [feedToken, setFeedToken] = useState<string | null>(null);
  const [hasActiveFeed, setHasActiveFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const links = feedToken ? getCalLinks( feedToken ) : null;

  useEffect( () => {
    void fetch( "/api/admin/bookings/feed-token" )
      .then( async response => {
        const data = await response.json() as { active?: boolean; error?: string };
        if ( !response.ok ) throw new Error( data.error || "Unable to load calendar feed status" );
        return data as { active: boolean };
      } )
      .then( data => setHasActiveFeed( data.active ) )
      .catch( error => toast.error( error instanceof Error ? error.message : "Unable to load calendar feed status" ) )
      .finally( () => setIsLoading( false ) );
  }, [] );

  const createFeed = async () => {
    setIsMutating( true );
    try {
      const response = await fetch( "/api/admin/bookings/feed-token", { method: "POST" } );
      const data = await response.json() as { success?: boolean; token?: string; error?: string };
      if ( !response.ok || !data.success || !data.token ) throw new Error( data.error || "Unable to create calendar feed" );
      setFeedToken( data.token );
      setHasActiveFeed( true );
      toast.success( "Calendar feed link created" );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to create calendar feed" );
    } finally {
      setIsMutating( false );
    }
  };

  const revokeFeed = async () => {
    setIsMutating( true );
    try {
      const response = await fetch( "/api/admin/bookings/feed-token", { method: "DELETE" } );
      if ( !response.ok ) throw new Error( "Unable to revoke calendar feed" );
      setFeedToken( null );
      setHasActiveFeed( false );
      toast.success( "Calendar feed revoked" );
    } catch {
      toast.error( "Unable to revoke calendar feed" );
    } finally {
      setIsMutating( false );
    }
  };

  const copyFeed = () => {
    if ( !links ) return;
    navigator.clipboard.writeText( links.raw );
    setCopied(true);
    toast.success("Feed URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Calendar Sync Feed</CardTitle>
        </div>
        <CardDescription>
          {links
            ? "Subscribe to get all bookings in Google Calendar or Apple Calendar. Keep the generated link private."
            : hasActiveFeed
              ? "The active feed link is hidden. Replacing or revoking it stops existing subscriptions."
              : "Create a private link to subscribe in Google Calendar or Apple Calendar."}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="flex flex-wrap gap-2">
          {links ? <>
            <Button variant="outline" size="sm" asChild>
              <a href={links.apple}><Smartphone className="size-3.5" /> Apple Calendar</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={links.google} target="_blank" rel="noopener noreferrer">
                <Globe className="size-3.5" /> Google Calendar
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={copyFeed}>
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              Copy Feed URL
            </Button>
          </> : <Button variant="outline" size="sm" onClick={createFeed} disabled={isLoading || isMutating}>
            <CalendarIcon className="size-3.5" /> {hasActiveFeed ? "Replace Feed Link" : "Create Feed Link"}
          </Button>}
          {hasActiveFeed && <Button variant="outline" size="sm" onClick={revokeFeed} disabled={isMutating}>
            Revoke Feed
          </Button>}
        </div>
      </CardContent>
    </Card>
  );
}
