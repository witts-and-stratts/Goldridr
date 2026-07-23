"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Clock, Trash2,
  Mail, Phone, MapPin, Plane, Users, Navigation, Send,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import { ChauffeurPicker } from "@/components/admin-ui/chauffeur-picker";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/admin-ui/input";
import { Checkbox } from "@/components/admin-ui/checkbox";

// ── Types ──────────────────────────────────────────────────────────────────────
export interface BookingDetail {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
  status: string;
  chauffeurId?: string | null;
  pin?: string | null;
  tripDetails: {
    pickupLocation?: string;
    dropoffLocation?: string;
    pickup?: string;
    destination?: string;
    flightNumber?: string;
    terminal?: string;
    passengers?: string | number;
    estimatedTotal?: number;
    estimatedPrice?: number;
    durationHours?: number;
    hourlyRate?: number;
    estimatedDistance?: string | number;
  };
  createdAt: string;
}

interface Chauffeur { id: string; name: string; email?: string; phone?: string; }

interface BookingDetailDialogProps {
  booking: BookingDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chauffeurs?: Chauffeur[];
  /** "admin" shows all actions; "chauffeur" shows read-only */
  role?: "admin" | "chauffeur";
  onStatusChange?: (reference: string, newStatus: string) => Promise<unknown> | unknown;
  onDelete?: (reference: string) => Promise<unknown> | unknown;
  onChauffeurChange?: (reference: string, chauffeurId: string | null) => Promise<unknown> | unknown;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "confirmed" || s === "accepted")
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20 gap-1.5 font-medium"><CheckCircle2 className="size-3" />Confirmed</Badge>;
  if (s === "pending")
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20 gap-1.5 font-medium"><Clock className="size-3" />Pending</Badge>;
  if (s === "cancelled" || s === "rejected")
    return <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 gap-1.5 font-medium"><XCircle className="size-3" />Cancelled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function BookingDetailDialog({
  booking,
  open,
  onOpenChange,
  chauffeurs = [],
  role = "admin",
  onStatusChange,
  onDelete,
  onChauffeurChange,
}: BookingDetailDialogProps) {
  const [ showMessageComposer, setShowMessageComposer ] = useState( false );
  const [ messageSubject, setMessageSubject ] = useState( "" );
  const [ messageBody, setMessageBody ] = useState( "" );
  const [ messageChannels, setMessageChannels ] = useState( [ "email" ] );
  const [ sending, setSending ] = useState( false );
  if (!booking) return null;

  const fare    = booking.tripDetails?.estimatedTotal || booking.tripDetails?.estimatedPrice || 0;
  const pickup  = booking.tripDetails?.pickupLocation || booking.tripDetails?.pickup || "—";
  const dropoff = booking.tripDetails?.dropoffLocation || booking.tripDetails?.destination || "—";

  const sendMessage = async () => {
    setSending( true );
    try {
      const response = await fetch( "/api/admin/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          kind: "booking",
          reference: booking.reference,
          subject: messageSubject,
          message: messageBody,
          channels: messageChannels,
        } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      setMessageSubject( "" );
      setMessageBody( "" );
      setShowMessageComposer( false );
      onOpenChange( false );
      toast.success( "Passenger message queued" );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to queue message" );
    } finally {
      setSending( false );
    }
  };

  const closeAfterSuccess = async ( action?: () => Promise<unknown> | unknown ) => {
    if ( !action ) return;
    try {
      const result = await action();
      if ( result !== false && result !== undefined ) onOpenChange( false );
    } catch {
      // Parent actions report errors and keep the dialog available for retry.
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && showMessageComposer) return;
          if (!nextOpen) setShowMessageComposer(false);
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          className="max-w-2xl p-0 overflow-hidden gap-0"
          onEscapeKeyDown={(event) => {
            if (showMessageComposer) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (showMessageComposer) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (showMessageComposer) event.preventDefault();
          }}
        >
          <div className="sr-only">
            <DialogTitle>Booking {booking.reference}</DialogTitle>
            <DialogDescription>Booking details and management</DialogDescription>
          </div>

          <section className="booking-detail">
            <header className="booking-detail-head">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-medium tracking-tight">{booking.reference}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                  {booking.tripType === "airport" ? <Plane className="size-3" /> : booking.tripType === "hourly" ? <Clock className="size-3" /> : <Navigation className="size-3" />}
                  {booking.tripType}
                </span>
              </div>
              <p className="booking-detail-fare">{formatPrice(fare)}</p>
            </div>
            <div className="booking-detail-meta">
              <StatusBadge status={booking.status} />
              <span className="text-xs text-muted-foreground">{new Date(booking.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })} · {booking.time}</span>
            </div>
            </header>
            <div className="booking-detail-body">
            <div className="booking-detail-section">
              <p className="booking-detail-section-head">Contact</p>
              <div className="booking-detail-rows">
                <div className="booking-detail-row">
                  <p className="booking-detail-row-label">Passenger</p>
                  <div>
                    <p className="text-sm font-medium">{booking.name}</p>
                    <a href={`mailto:${booking.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-0.5"><Mail className="size-3 shrink-0" />{booking.email}</a>
                    {booking.phone && <a href={`tel:${booking.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-0.5"><Phone className="size-3 shrink-0" />{booking.phone}</a>}
                  </div>
                </div>
              </div>
            </div>
            <div className="booking-detail-section">
              <p className="booking-detail-section-head">Trip</p>
              <div className="booking-detail-rows">
                <div className="booking-detail-row">
                  <p className="booking-detail-row-label">Route</p>
                  <div className="text-sm">
                    <div className="flex items-start gap-2.5">
                      <div className="flex flex-col items-center shrink-0 pt-[5px]">
                        <span className="size-2 rounded-full bg-foreground/70 block" />
                        {booking.tripType !== "hourly" && <span className="w-px h-4 bg-border block my-0.5" />}
                      </div>
                      <span className="font-medium leading-snug pb-1">{pickup}</span>
                    </div>
                    {booking.tripType !== "hourly" && <div className="flex items-start gap-2.5"><MapPin className="size-3.5 text-muted-foreground/70 shrink-0 mt-0.5" /><span className="text-muted-foreground">{dropoff}</span></div>}
                  </div>
                </div>
                {(booking.tripDetails?.passengers || booking.tripDetails?.flightNumber || booking.tripDetails?.terminal || booking.tripDetails?.durationHours) && (
                  <div className="booking-detail-row">
                    <p className="booking-detail-row-label">Details</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {booking.tripDetails.passengers && <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="size-3.5" />{booking.tripDetails.passengers} passengers</span>}
                      {booking.tripDetails.flightNumber && <span className="flex items-center gap-1.5 text-muted-foreground"><Plane className="size-3.5" />{booking.tripDetails.flightNumber}</span>}
                      {booking.tripDetails.terminal && <span className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="size-3.5" />Terminal {booking.tripDetails.terminal}</span>}
                      {booking.tripDetails.durationHours && <span className="flex items-center gap-1.5 text-muted-foreground"><Clock className="size-3.5" />{booking.tripDetails.durationHours}h</span>}
                    </div>
                  </div>
                )}
                {booking.pin && (
                  <div className="booking-detail-row">
                    <p className="booking-detail-row-label">Pickup PIN</p>
                    <p className="text-sm font-mono font-semibold tracking-widest">{booking.pin}</p>
                  </div>
                )}
                {booking.notes && (
                  <div className="booking-detail-row">
                    <p className="booking-detail-row-label">Notes</p>
                    <p className="text-sm text-foreground/80 leading-relaxed">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>
              {role === "admin" && (
                <div className="booking-detail-section">
                  <div className="booking-detail-row booking-detail-row-inline">
                    <p className="booking-detail-row-label">Chauffeur</p>
                    <ChauffeurPicker
                      chauffeurs={chauffeurs}
                      value={booking.chauffeurId}
                      onChange={(newId) => void closeAfterSuccess(() => onChauffeurChange?.(booking.reference, newId))}
                      className="min-w-56"
                    />
                  </div>
                </div>
              )}
            </div>
            {role === "admin" && (
              <footer className="booking-detail-foot">
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMessageComposer(true)}
                  aria-label="Message passenger"
                  className="size-9"
                >
                  <Mail className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void closeAfterSuccess(() => onDelete?.(booking.reference))}
                  aria-label={`Delete booking ${booking.reference}`}
                  className="size-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </Button>
                </div>
                <div className="flex gap-2">
                {booking.status === "pending" && (<><Button variant="outline" size="sm" onClick={() => void closeAfterSuccess(() => onStatusChange?.(booking.reference, "rejected"))}>Reject</Button><Button size="sm" onClick={() => void closeAfterSuccess(() => onStatusChange?.(booking.reference, "confirmed"))}>Confirm</Button></>)}
                {(booking.status === "confirmed" || booking.status === "accepted") && <Button variant="destructive" size="sm" onClick={() => void closeAfterSuccess(() => onStatusChange?.(booking.reference, "cancelled"))}>Cancel</Button>}
                {(booking.status === "cancelled" || booking.status === "rejected") && <Button size="sm" onClick={() => void closeAfterSuccess(() => onStatusChange?.(booking.reference, "confirmed"))}>Restore</Button>}
                </div>
              </footer>
            )}
          </section>
        </DialogContent>
      </Dialog>

      <Dialog open={showMessageComposer} onOpenChange={setShowMessageComposer}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>Message passenger</DialogTitle>
            <DialogDescription>Send an update to {booking.name} for booking {booking.reference}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 px-6 py-5">
            <Input value={messageSubject} onChange={event => setMessageSubject(event.target.value)} placeholder="Subject" />
            <Textarea value={messageBody} onChange={event => setMessageBody(event.target.value)} placeholder="Write a concise passenger update" rows={4} />
            <div className="flex gap-4 text-xs text-muted-foreground">
              {["email", "sms"].map(channel => (
                <label key={channel} className="flex items-center gap-2">
                  <Checkbox checked={messageChannels.includes(channel)} onCheckedChange={checked => setMessageChannels(current => checked ? [...current, channel] : current.filter(value => value !== channel))} />
                  {channel.toUpperCase()}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-4">
            <Button variant="outline" onClick={() => setShowMessageComposer(false)} disabled={sending}>Cancel</Button>
            <Button onClick={sendMessage} disabled={sending || !messageSubject || !messageBody || messageChannels.length === 0}>
              <Send className="size-3.5" />{sending ? "Queueing..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
