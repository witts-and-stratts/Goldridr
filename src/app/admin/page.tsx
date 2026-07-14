"use client";

import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const { currentRole } = useAdmin();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (data.success) setBookings(data.bookings);
      else toast.error("Failed to load bookings");
    } catch {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

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
        <Button variant="outline" size="sm" onClick={fetchBookings} disabled={loading}>
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
        chauffeurs={[]}
        role={currentRole.type === "admin" ? "admin" : "chauffeur"}
      />
    </div>
  );
}
