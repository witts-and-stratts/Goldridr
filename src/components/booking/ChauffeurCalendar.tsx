"use client";

import { MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/calendar";
import type { CalendarEvent, CalendarBlockout, CalendarFilterGroup } from "@/components/calendar";

// ── Domain types ───────────────────────────────────────────────────────────────
export interface Booking {
  id: number; reference: string; tripType: string;
  date: string; time: string; duration: number;
  name: string; email: string; phone?: string; notes?: string;
  status: string; chauffeurId?: number | null;
  tripDetails: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
}
export interface BlockedSlot {
  id: number; title: string; date: string; endDate?: string;
  isFullDay?: number; time: string; duration: number;
  recurring: string; chauffeurId?: number | null;
}
export interface Chauffeur { id: number; name: string; email?: string; phone?: string; }

interface ChauffeurCalendarProps {
  bookings: Booking[];
  blockedSlots?: BlockedSlot[];
  chauffeurs?: Chauffeur[];
  onSelectBooking?: (booking: Booking) => void;
  onDeleteBlockedSlot?: (id: number) => void;
  className?: string;
}

// ── Filter groups (mirrors old CATEGORIES) ────────────────────────────────────
const FILTER_GROUPS: CalendarFilterGroup[] = [
  { key: "airport", label: "Airport Transfers", color: "bg-blue-500"   },
  { key: "hourly",  label: "Hourly Charters",   color: "bg-purple-500" },
  { key: "city",    label: "City Transfers",     color: "bg-amber-500"  },
  { key: "blocked", label: "Blocked Slots",      color: "bg-red-500"    },
];

// ── Mapping helpers ────────────────────────────────────────────────────────────
function tripTypeToColor(tripType: string): CalendarEvent["color"] {
  const t = tripType.toLowerCase();
  if (t === "airport") return "blue";
  if (t === "hourly")  return "purple";
  return "amber";
}

function tripTypeToFilterKey(tripType: string): string {
  const t = tripType.toLowerCase();
  if (t === "airport") return "airport";
  if (t === "hourly")  return "hourly";
  return "city";
}

function bookingToEvent(b: Booking): CalendarEvent {
  return {
    id:       String(b.id),
    date:     b.date,
    time:     b.time,
    duration: b.duration,
    title:    b.name,
    subtitle: b.reference,
    color:    tripTypeToColor(b.tripType),
    filterKey: tripTypeToFilterKey(b.tripType),
    data:     b,
  };
}

function blockedToBlockout(b: BlockedSlot): CalendarBlockout {
  return {
    id:        String(b.id),
    title:     b.title,
    date:      b.date,
    endDate:   b.endDate,
    isFullDay: b.isFullDay === 1,
    time:      b.time || "00:00",
    duration:  b.duration,
    recurring: b.recurring as CalendarBlockout["recurring"],
  };
}

// ── Booking event card (passed as renderEvent) ────────────────────────────────
function BookingCard({
  event, compact, chauffeurs,
}: {
  event: CalendarEvent;
  compact?: boolean;
  chauffeurs: Chauffeur[];
}) {
  const booking = event.data as Booking;
  const driver = chauffeurs.find((c) => c.id === booking?.chauffeurId);
  const pickup = booking?.tripDetails?.pickupLocation || booking?.tripDetails?.pickup || "";

  if (compact) {
    return (
      <>
        <div className="flex justify-between items-center text-[8px] text-muted-foreground mb-0.5">
          <span className="font-semibold text-foreground/70 truncate">{event.subtitle}</span>
          <span className="font-semibold shrink-0">{event.time}</span>
        </div>
        <p className="text-[10px] font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate">
          {event.title}
        </p>
        {pickup && (
          <p className="text-[8px] text-muted-foreground truncate">{pickup}</p>
        )}
        {driver && (
          <div className="flex items-center gap-0.5 text-[7px] text-blue-400 mt-0.5 w-fit">
            <User className="size-2" />{driver.name.split(" ")[0]}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] font-semibold">{event.subtitle}</span>
        <span className="text-[9px] text-muted-foreground">{event.time}</span>
      </div>
      <p className="text-xs font-semibold text-foreground truncate group-hover:text-blue-400 transition-colors">
        {event.title}
      </p>
      {pickup && (
        <p className="text-[9px] text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="size-2.5 shrink-0" />{pickup}
        </p>
      )}
      {driver && (
        <div className="flex items-center gap-1 text-[8px] text-blue-400 bg-blue-500/10 px-1 rounded w-fit mt-0.5">
          <User className="size-2" />{driver.name.split(" ")[0]}
        </div>
      )}
    </>
  );
}

// ── Chauffeur list for sidebar extra slot ─────────────────────────────────────
function ChauffeurList({ chauffeurs }: { chauffeurs: Chauffeur[] }) {
  if (!chauffeurs.length) return null;
  const colors = ["bg-blue-500","bg-purple-500","bg-green-500","bg-orange-500","bg-pink-500","bg-teal-500"];
  return (
    <div className="space-y-1">
      <p className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-1.5">Chauffeurs</p>
      {chauffeurs.map((c, ci) => (
        <div key={c.id} className="flex items-center gap-2 py-1 px-1">
          <div className={cn("size-4 rounded-full flex items-center justify-center text-[7px] text-white font-bold shrink-0", colors[ci % colors.length])}>
            {c.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <span className="text-xs text-foreground/80 truncate">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function ChauffeurCalendar({
  bookings,
  blockedSlots = [],
  chauffeurs = [],
  onSelectBooking,
  onDeleteBlockedSlot,
  className,
}: ChauffeurCalendarProps) {
  // Only show non-cancelled bookings
  const activeBookings = bookings.filter(
    (b) => b.status !== "cancelled" && b.status !== "rejected"
  );

  const events    = activeBookings.map(bookingToEvent);
  const blockouts = blockedSlots.map(blockedToBlockout);

  return (
    <Calendar
      className={className}
      events={events}
      blockouts={blockouts}
      filterGroups={FILTER_GROUPS}
      defaultView="week"
      onEventClick={(e) => onSelectBooking?.(e.data as Booking)}
      onBlockoutDelete={(id) => onDeleteBlockedSlot?.(Number(id))}
      renderEvent={(e, view) => (
        <BookingCard
          event={e}
          compact={view === "week"}
          chauffeurs={chauffeurs}
        />
      )}
      sidebarContent={<ChauffeurList chauffeurs={chauffeurs} />}
    />
  );
}
