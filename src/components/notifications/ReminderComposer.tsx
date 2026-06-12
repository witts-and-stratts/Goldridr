"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Search } from "lucide-react";
import { toast } from "sonner";
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

interface ReminderBooking {
  reference: string;
  name: string;
  email: string;
  phone?: string;
  smsConsented: boolean;
  date: string;
  time: string;
  status: string;
}

export function ReminderComposer( {
  open,
  onOpenChange,
  onSent,
}: {
  open: boolean;
  onOpenChange: ( open: boolean ) => void;
  onSent?: () => void;
} ) {
  const [ bookings, setBookings ] = useState<ReminderBooking[]>( [] );
  const [ search, setSearch ] = useState( "" );
  const [ reference, setReference ] = useState<string | null>( null );
  const [ channels, setChannels ] = useState( [ "email" ] );
  const [ sending, setSending ] = useState( false );

  useEffect( () => {
    if ( !open ) return;
    fetch( "/api/admin/reminders" )
      .then( response => response.json() )
      .then( data => {
        if ( data.success ) setBookings( data.bookings );
      } )
      .catch( () => toast.error( "Unable to load bookings" ) );
  }, [ open ] );

  const filtered = useMemo( () => {
    const query = search.trim().toLowerCase();
    return bookings
      .filter( booking => ![ "cancelled", "rejected" ].includes( booking.status ) )
      .filter( booking => !query
        || booking.name.toLowerCase().includes( query )
        || booking.email.toLowerCase().includes( query )
        || booking.reference.toLowerCase().includes( query )
      );
  }, [ bookings, search ] );
  const selected = bookings.find( booking => booking.reference === reference );

  const send = async () => {
    if ( !reference ) return;
    setSending( true );
    try {
      const response = await fetch( "/api/admin/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { reference, channels } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      toast.success( `Reminder queued for ${ selected?.name || reference }` );
      setReference( null );
      setChannels( [ "email" ] );
      setSearch( "" );
      onOpenChange( false );
      onSent?.();
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to queue reminder" );
    } finally {
      setSending( false );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle>Send booking reminder</DialogTitle>
          <DialogDescription>Choose an active booking and send its pickup details immediately.</DialogDescription>
        </DialogHeader>

        <div className="p-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={event => setSearch( event.target.value )} placeholder="Search rider or booking reference" className="pl-9" />
          </div>
          <div className="mt-4 max-h-80 divide-y overflow-auto rounded-md border">
            { filtered.map( booking => (
              <button
                key={booking.reference}
                type="button"
                onClick={() => {
                  setReference( booking.reference );
                  if ( !booking.smsConsented ) setChannels( current => current.filter( channel => channel !== "sms" ) );
                }}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 ${reference === booking.reference ? "bg-muted" : ""}`}
              >
                <span className={`mt-1 size-3.5 rounded-full border ${reference === booking.reference ? "border-primary bg-primary ring-2 ring-primary/20" : ""}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{booking.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{booking.date} · {booking.time}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{booking.reference} · {booking.email}</span>
                </span>
              </button>
            ) ) }
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Channels</p>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox checked={channels.includes( "email" )} onCheckedChange={checked => setChannels( current => checked ? [ ...current, "email" ] : current.filter( value => value !== "email" ) )} />
                Email
              </label>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={channels.includes( "sms" )}
                  disabled={!selected?.smsConsented}
                  onCheckedChange={checked => setChannels( current => checked ? [ ...current, "sms" ] : current.filter( value => value !== "sms" ) )}
                />
                SMS
              </label>
              { selected && !selected.smsConsented && <span className="text-xs text-muted-foreground">No SMS consent</span> }
            </div>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange( false )}>Cancel</Button>
          <Button onClick={send} disabled={sending || !reference || channels.length === 0}>
            <BellRing className="size-3.5" />{sending ? "Queueing..." : "Send reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
