"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Send, UserRound, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "@/app/admin/context";
import { Button } from "@/components/admin-ui/button";
import { Checkbox } from "@/components/admin-ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import { Input } from "@/components/admin-ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface RiderRecipient {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  smsConsented: boolean;
  date: string;
  time: string;
}

export function MessageComposer( {
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: ( open: boolean ) => void;
  onSent?: () => void;
} ) {
  const { chauffeurs, session } = useAdmin();
  const [ riders, setRiders ] = useState<RiderRecipient[]>( [] );
  const [ audience, setAudience ] = useState<"riders" | "chauffeurs">( "riders" );
  const [ search, setSearch ] = useState( "" );
  const [ selectedRiders, setSelectedRiders ] = useState<string[]>( [] );
  const [ selectedChauffeurs, setSelectedChauffeurs ] = useState<number[]>( [] );
  const [ subject, setSubject ] = useState( "" );
  const [ message, setMessage ] = useState( "" );
  const [ channels, setChannels ] = useState( [ "email" ] );
  const [ sending, setSending ] = useState( false );

  useEffect( () => {
    if ( !open ) return;
    fetch( "/api/admin/messages" )
      .then( response => response.json() )
      .then( data => {
        if ( data.success ) setRiders( data.riders );
      } )
      .catch( () => toast.error( "Unable to load riders" ) );
  }, [ open ] );

  const filteredRiders = useMemo( () => {
    const query = search.trim().toLowerCase();
    if ( !query ) return riders;
    return riders.filter( rider =>
      rider.name.toLowerCase().includes( query )
      || rider.email.toLowerCase().includes( query )
      || rider.reference.toLowerCase().includes( query )
    );
  }, [ riders, search ] );

  const filteredChauffeurs = useMemo( () => {
    const query = search.trim().toLowerCase();
    if ( !query ) return chauffeurs;
    return chauffeurs.filter( chauffeur =>
      chauffeur.name.toLowerCase().includes( query )
      || chauffeur.email.toLowerCase().includes( query )
    );
  }, [ chauffeurs, search ] );

  const recipientCount = selectedRiders.length + selectedChauffeurs.length;
  const hasUsableChannel = channels.includes( "email" )
    || channels.includes( "sms" )
    || ( channels.includes( "in_app" ) && selectedChauffeurs.length > 0 );
  const hasRiderWithoutSmsConsent = selectedRiders.some( reference => {
    const rider = riders.find( item => item.reference === reference );
    return rider && !rider.smsConsented;
  } );

  const reset = () => {
    setSelectedRiders( [] );
    setSelectedChauffeurs( [] );
    setSubject( "" );
    setMessage( "" );
    setChannels( [ "email" ] );
    setSearch( "" );
  };

  const send = async () => {
    setSending( true );
    try {
      const response = await fetch( "/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          kind: "recipients",
          riderReferences: selectedRiders,
          chauffeurIds: selectedChauffeurs,
          subject,
          message,
          channels,
        } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      const skipped = Array.isArray( data.skippedSms ) && data.skippedSms.length > 0
        ? ` SMS was skipped for ${ data.skippedSms.join( ", " ) }.`
        : "";
      toast.success( `Message queued for ${ recipientCount } recipient${ recipientCount === 1 ? "" : "s" }.${ skipped }` );
      reset();
      onOpenChange( false );
      onSent?.();
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to queue message" );
    } finally {
      setSending( false );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Send message</DialogTitle>
          <DialogDescription>Select riders, chauffeurs, or both. Each recipient receives an individual delivery.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-[520px] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="border-b p-5 md:border-b-0 md:border-r">
            <Tabs value={audience} onValueChange={value => setAudience( value as "riders" | "chauffeurs" )}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="riders"><UserRound className="size-3.5" />Riders</TabsTrigger>
                <TabsTrigger value="chauffeurs" disabled={session.role !== "admin"}><UsersRound className="size-3.5" />Chauffeurs</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={event => setSearch( event.target.value )} placeholder={`Search ${ audience }`} className="pl-9" />
            </div>

            <div className="mt-4 max-h-[380px] divide-y overflow-auto rounded-md border">
              { audience === "riders" ? filteredRiders.map( rider => (
                <label key={rider.reference} className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/40">
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedRiders.includes( rider.reference )}
                    onCheckedChange={checked => setSelectedRiders( current =>
                      checked ? [ ...current, rider.reference ] : current.filter( value => value !== rider.reference )
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{rider.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{rider.email}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {rider.reference} · {rider.date} {rider.time}
                      {!rider.smsConsented && " · No SMS consent"}
                    </span>
                  </span>
                </label>
              ) ) : filteredChauffeurs.map( chauffeur => (
                <label key={chauffeur.id} className="flex cursor-pointer items-start gap-3 px-3 py-3 hover:bg-muted/40">
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedChauffeurs.includes( chauffeur.id )}
                    onCheckedChange={checked => setSelectedChauffeurs( current =>
                      checked ? [ ...current, chauffeur.id ] : current.filter( value => value !== chauffeur.id )
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{chauffeur.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{chauffeur.email}</span>
                  </span>
                </label>
              ) ) }
              { ( audience === "riders" ? filteredRiders.length : filteredChauffeurs.length ) === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted-foreground">No recipients match your search.</p>
              ) }
            </div>
          </section>

          <section className="flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-medium">Message</p>
              <span className="text-xs text-muted-foreground">{recipientCount} selected</span>
            </div>
            <div className="space-y-4">
              <Input value={subject} onChange={event => setSubject( event.target.value )} placeholder="Subject" />
              <Textarea value={message} onChange={event => setMessage( event.target.value )} placeholder="Write a concise operational message" rows={9} />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Channels</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  { [ "in_app", "email", "sms" ].map( channel => (
                    <label key={channel} className="flex items-center gap-2">
                      <Checkbox
                        checked={channels.includes( channel )}
                        disabled={channel === "in_app" && selectedChauffeurs.length === 0}
                        onCheckedChange={checked => setChannels( current =>
                          checked ? [ ...current, channel ] : current.filter( value => value !== channel )
                        )}
                      />
                      {channel === "in_app" ? "In-app" : channel.toUpperCase()}
                    </label>
                  ) ) }
                </div>
                { channels.includes( "sms" ) && hasRiderWithoutSmsConsent && (
                  <p className="mt-2 text-xs text-muted-foreground">Riders without SMS consent will receive email only.</p>
                ) }
              </div>
            </div>
          </section>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange( false )}>Cancel</Button>
          <Button onClick={send} disabled={sending || recipientCount === 0 || !subject || !message || !hasUsableChannel}>
            <Send className="size-3.5" />{sending ? "Queueing..." : "Queue message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
