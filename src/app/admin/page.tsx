"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { useAdmin } from "./context";
import type { DashboardBooking } from "./types";
import { StatsCards } from "./components/stats-cards";
import { RecentBookingsTable } from "./components/recent-bookings-table";
import { CalendarSyncCard } from "./components/calendar-sync-card";
import { BookingDetailDialog } from "@/components/booking/BookingDetailDialog";
import type { BookingDetail } from "@/components/booking/BookingDetailDialog";
import { qk } from "@/lib/query-keys";

export default function DashboardPage() {
  const { currentRole, chauffeurs } = useAdmin();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: bookingsData, isPending: loading, refetch } = useQuery( {
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error ?? "Failed to load bookings" );
      return data.bookings as DashboardBooking[];
    },
  } );

  const bookings = bookingsData ?? [];

  const handleStatusChange = async ( reference: string, status: string ) => {
    try {
      const response = await fetch( "/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { reference, status } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      setSelectedBooking( current => current?.reference === reference ? { ...current, status } : current );
      await queryClient.invalidateQueries( { queryKey: qk.bookings() } );
      toast.success( `Booking ${ reference } → ${ status }` );
      return true;
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to update booking" );
      return false;
    }
  };

  const handleChauffeurChange = async ( reference: string, chauffeurId: string | null ) => {
    try {
      const response = await fetch( "/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { reference, chauffeurId } ),
      } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      setSelectedBooking( current => current?.reference === reference ? { ...current, chauffeurId } : current );
      await queryClient.invalidateQueries( { queryKey: qk.bookings() } );
      toast.success( "Chauffeur updated" );
      return true;
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to update chauffeur" );
      return false;
    }
  };

  const handleDelete = async ( reference: string ) => {
    if ( !confirm( `Delete booking ${ reference }?` ) ) return false;
    try {
      const response = await fetch( `/api/admin/bookings?reference=${ encodeURIComponent( reference ) }`, { method: "DELETE" } );
      const data = await response.json();
      if ( !data.success ) throw new Error( data.error );
      setSelectedBooking( null );
      await queryClient.invalidateQueries( { queryKey: qk.bookings() } );
      toast.success( "Booking deleted" );
      return true;
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Unable to delete booking" );
      return false;
    }
  };

  const active = bookings.filter((b) =>
    currentRole.type === "chauffeur" ? b.chauffeurId === currentRole.id : true
  );

  const stats = {
    total: active.length,
    pending: active.filter((b) => b.status === "pending").length,
    confirmed: active.filter((b) => b.status === "confirmed" || b.status === "accepted").length,
    revenue: active.reduce((sum, b) => {
      if (b.status === "cancelled" || b.status === "rejected") return sum;
      return sum + (b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0);
    }, 0),
  };

  const recent = [...active]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>

      <StatsCards stats={stats} loading={loading} />
      <RecentBookingsTable
        bookings={recent}
        loading={loading}
        onSelect={(b) => { setSelectedBooking(b as BookingDetail); setDetailOpen(true); }}
      />
      <CalendarSyncCard />

      <BookingDetailDialog
        booking={selectedBooking}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        chauffeurs={chauffeurs}
        role={currentRole.type === "admin" ? "admin" : "chauffeur"}
        onStatusChange={handleStatusChange}
        onChauffeurChange={handleChauffeurChange}
        onDelete={handleDelete}
      />
    </div>
  );
}
