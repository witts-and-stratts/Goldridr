"use client";

import {
  CheckCircle2, XCircle, Clock, Trash2,
  Mail, Phone, MapPin, Plane, Users, Navigation,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/admin-ui/dialog";
import { ChauffeurPicker } from "@/components/admin-ui/chauffeur-picker";

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
  chauffeurId?: number | null;
  tripDetails: {
    pickupLocation?: string;
    dropoffLocation?: string;
    pickup?: string;
    destination?: string;
    flightNumber?: string;
    passengers?: string | number;
    estimatedTotal?: number;
    estimatedPrice?: number;
    durationHours?: number;
    hourlyRate?: number;
    estimatedDistance?: string | number;
  };
  createdAt: string;
}

interface Chauffeur { id: number; name: string; email?: string; phone?: string; }

interface BookingDetailDialogProps {
  booking: BookingDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chauffeurs?: Chauffeur[];
  /** "admin" shows all actions; "chauffeur" shows read-only */
  role?: "admin" | "chauffeur";
  onStatusChange?: (reference: string, newStatus: string) => void;
  onDelete?: (reference: string) => void;
  onChauffeurChange?: (reference: string, chauffeurId: number | null) => void;
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
  if (!booking) return null;

  const fare    = booking.tripDetails?.estimatedTotal || booking.tripDetails?.estimatedPrice || 0;
  const pickup  = booking.tripDetails?.pickupLocation || booking.tripDetails?.pickup || "—";
  const dropoff = booking.tripDetails?.dropoffLocation || booking.tripDetails?.destination || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0">
        <div className="sr-only">
          <DialogTitle>Booking {booking.reference}</DialogTitle>
          <DialogDescription>Booking details and management</DialogDescription>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{booking.reference}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="text-xs text-muted-foreground capitalize flex items-center gap-1">
              {booking.tripType === "airport" ? <Plane className="size-3" /> :
               booking.tripType === "hourly"  ? <Clock className="size-3" /> :
               <Navigation className="size-3" />}
              {booking.tripType}
            </span>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Body */}
        <div className="divide-y divide-border max-h-[65vh] overflow-y-auto">

          {/* Passenger */}
          <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
            <p className="text-xs text-muted-foreground pt-0.5">Passenger</p>
            <div>
              <p className="text-sm font-medium">{booking.name}</p>
              <a href={`mailto:${booking.email}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-1">
                <Mail className="size-3 shrink-0" />{booking.email}
              </a>
              {booking.phone && (
                <a href={`tel:${booking.phone}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mt-0.5">
                  <Phone className="size-3 shrink-0" />{booking.phone}
                </a>
              )}
            </div>
          </div>

          {/* Date & time */}
          <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
            <p className="text-xs text-muted-foreground pt-0.5">Date & time</p>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium">
                {new Date(booking.date).toLocaleDateString("en-US", {
                  weekday: "short", month: "short", day: "numeric", year: "numeric",
                })}
              </span>
              <span className="text-muted-foreground">{booking.time}</span>
            </div>
          </div>

          {/* Route */}
          <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
            <p className="text-xs text-muted-foreground pt-0.5">Route</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="font-medium">{pickup}</span>
              </div>
              {booking.tripType !== "hourly" && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{dropoff}</span>
                </div>
              )}
            </div>
          </div>

          {/* Trip details */}
          {(booking.tripDetails?.passengers || booking.tripDetails?.flightNumber || booking.tripDetails?.durationHours) && (
            <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
              <p className="text-xs text-muted-foreground pt-0.5">Details</p>
              <div className="flex flex-wrap gap-4 text-sm">
                {booking.tripDetails.passengers && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3.5" />{booking.tripDetails.passengers} passengers
                  </span>
                )}
                {booking.tripDetails.flightNumber && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Plane className="size-3.5" />{booking.tripDetails.flightNumber}
                  </span>
                )}
                {booking.tripDetails.durationHours && (
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" />{booking.tripDetails.durationHours}h
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Fare */}
          <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
            <p className="text-xs text-muted-foreground pt-0.5">Fare</p>
            <p className="text-sm font-semibold">{formatPrice(fare)}</p>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
              <p className="text-xs text-muted-foreground pt-0.5">Notes</p>
              <p className="text-sm text-muted-foreground">{booking.notes}</p>
            </div>
          )}

          {/* Chauffeur (admin only) */}
          {role === "admin" && (
            <div className="grid grid-cols-[120px_1fr] px-5 py-4 gap-4">
              <p className="text-xs text-muted-foreground pt-0.5">Chauffeur</p>
              <ChauffeurPicker
                chauffeurs={chauffeurs}
                value={booking.chauffeurId}
                onChange={(newId) => onChauffeurChange?.(booking.reference, newId)}
              />
            </div>
          )}
        </div>

        {/* Footer (admin only) */}
        {role === "admin" && (
          <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border">
            <Button
              variant="ghost" size="sm"
              onClick={() => onDelete?.(booking.reference)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
            <div className="flex gap-2">
              {booking.status === "pending" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => onStatusChange?.(booking.reference, "rejected")}>Reject</Button>
                  <Button size="sm" onClick={() => onStatusChange?.(booking.reference, "confirmed")}>Confirm</Button>
                </>
              )}
              {(booking.status === "confirmed" || booking.status === "accepted") && (
                <Button variant="destructive" size="sm" onClick={() => onStatusChange?.(booking.reference, "cancelled")}>Cancel booking</Button>
              )}
              {(booking.status === "cancelled" || booking.status === "rejected") && (
                <Button size="sm" onClick={() => onStatusChange?.(booking.reference, "confirmed")}>Re-confirm</Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
