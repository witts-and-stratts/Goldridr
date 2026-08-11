"use client";

import { useState } from "react";
import { ChevronDown, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Checkbox } from "@/components/admin-ui/checkbox";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PendingMessage } from "./message-thread-detail";
import styles from "@/styles/message-threads.module.css";

let pendingMessageCounter = 0;

export function MessageThreadReplyBox( {
  bookingReference,
  bookingOptions,
  subjectSeed,
  onSent,
  onPendingAdd,
  onPendingUpdate,
  onPendingRemove,
  defaultChannels,
}: {
  bookingReference: string | null;
  bookingOptions: string[];
  subjectSeed: string;
  onSent: () => unknown;
  onPendingAdd: ( pending: PendingMessage ) => void;
  onPendingUpdate: ( id: string, patch: Partial<PendingMessage> ) => void;
  onPendingRemove: ( id: string ) => void;
  defaultChannels?: string[];
} ) {
  const [ showMoreOptions, setShowMoreOptions ] = useState( false );
  const [ subjectInput, setSubjectInput ] = useState( "" );
  const [ bookingOverride, setBookingOverride ] = useState( "default" );
  const [ message, setMessage ] = useState( "" );
  const [ channels, setChannels ] = useState<string[]>( defaultChannels || [ "email" ] );
  const [ sending, setSending ] = useState( false );

  const effectiveBookingReference = bookingOverride === "default" ? bookingReference : bookingOverride;
  const hasAnyBooking = Boolean( bookingReference ) || bookingOptions.length > 0;

  const send = async () => {
    if ( !effectiveBookingReference || !message.trim() || channels.length === 0 ) return;
    const id = `pending-${ Date.now() }-${ pendingMessageCounter++ }`;
    const subject = subjectInput.trim() || `Re: ${ subjectSeed.replace( /^(re:\s*)+/i, "" ).trim() }`;
    const body = message.trim();

    onPendingAdd( { id, bookingReference: effectiveBookingReference, subject, body, status: "sending" } );
    setMessage( "" );
    setSubjectInput( "" );
    setSending( true );
    try {
      const response = await fetch( "/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          kind: "booking",
          reference: effectiveBookingReference,
          subject,
          message: body,
          channels,
        } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error || "Unable to send message" );
      onPendingUpdate( id, { status: "sent" } );
      await onSent();
      onPendingRemove( id );
    } catch ( error ) {
      onPendingUpdate( id, { status: "failed" } );
      toast.error( error instanceof Error ? error.message : "Unable to send message" );
    } finally {
      setSending( false );
    }
  };

  if ( !hasAnyBooking ) return null;

  return (
    <div className={styles.replyBox}>
      <button
        type="button"
        className={styles.replyMoreToggle}
        onClick={() => setShowMoreOptions( current => !current )}
        aria-expanded={showMoreOptions}
      >
        <ChevronDown className={cn( "size-3.5 transition-transform", showMoreOptions && "rotate-180" )} />
        More options
      </button>

      {showMoreOptions && (
        <div className={styles.replyMoreSection}>
          <Input
            value={subjectInput}
            onChange={event => setSubjectInput( event.target.value )}
            placeholder="Subject (optional)"
            className={styles.replySubjectInput}
          />
          {bookingOptions.length > 1 && (
            <Select value={bookingOverride} onValueChange={setBookingOverride}>
              <SelectTrigger className={styles.bookingFilterTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="default">Default (most recent booking)</SelectItem>
                {bookingOptions.map( reference => (
                  <SelectItem key={reference} value={reference}>{reference}</SelectItem>
                ) )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      <Textarea
        value={message}
        onChange={event => setMessage( event.target.value )}
        placeholder="Write a reply..."
        rows={3}
      />
      <div className={styles.replyFooter}>
        <div className={styles.replyChannels}>
          { [ "email", "sms", "in_app" ].map( channel => (
            <label key={channel} className="flex items-center gap-1.5">
              <Checkbox
                checked={channels.includes( channel )}
                onCheckedChange={checked => setChannels( current =>
                  checked ? [ ...current, channel ] : current.filter( value => value !== channel )
                )}
              />
              {channel === "in_app" ? "In-App" : channel.toUpperCase()}
            </label>
          ) ) }
        </div>
        <Button size="sm" onClick={send} disabled={sending || !message.trim() || channels.length === 0 || !effectiveBookingReference}>
          <Send className="size-3.5" />{sending ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
