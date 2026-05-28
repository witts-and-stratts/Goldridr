"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ChauffeurCalendar, type Booking } from "@/components/booking/ChauffeurCalendar";
import { BookingDetailDialog } from "@/components/booking/BookingDetailDialog";
import { useAdmin } from "../context";

export default function CalendarPage() {
  const { chauffeurs, currentRole } = useAdmin();
  const [bookings, setBookings]    = useState<Booking[]>([]);
  const [blockedSlots, setBlocked] = useState<any[]>([]);
  const [loading, setLoading]      = useState(true);
  const [selected, setSelected]    = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, blRes] = await Promise.all([
        fetch("/api/admin/bookings"),
        fetch("/api/admin/blocked"),
      ]);
      const [bData, blData] = await Promise.all([bRes.json(), blRes.json()]);
      if (bData.success)  setBookings(bData.bookings);
      if (blData.success) setBlocked(blData.blocks);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleStatusChange = async (reference: string, newStatus: string) => {
    const promise = fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, status: newStatus }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBookings((prev) => prev.map((b) => b.reference === reference ? { ...b, status: newStatus } : b));
      setSelected((p) => p?.reference === reference ? { ...p, status: newStatus } : p);
      return data;
    });
    toast.promise(promise, {
      loading: "Updating…",
      success: `Booking ${reference} → ${newStatus}`,
      error: (e: Error) => e.message,
    });
  };

  const handleDelete = async (reference: string) => {
    if (!confirm(`Delete booking ${reference}?`)) return;
    const promise = fetch(`/api/admin/bookings?reference=${reference}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setBookings((prev) => prev.filter((b) => b.reference !== reference));
        setDetailOpen(false);
        setSelected(null);
        return data;
      });
    toast.promise(promise, { loading: "Deleting…", success: "Deleted", error: (e: Error) => e.message });
  };

  const handleChauffeurChange = async (reference: string, chauffeurId: number | null) => {
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, chauffeurId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Chauffeur updated");
      setBookings((prev) => prev.map((b) => b.reference === reference ? { ...b, chauffeurId } : b));
      setSelected((p) => p?.reference === reference ? { ...p, chauffeurId } : p);
    } catch (err) {
      toast.error("Failed", { description: err instanceof Error ? err.message : "Unknown error" });
    }
  };

  const handleDeleteBlock = async (id: number) => {
    const promise = fetch(`/api/admin/blocked?id=${id}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        setBlocked((prev) => prev.filter((b) => b.id !== id));
        return data;
      });
    toast.promise(promise, { loading: "Removing…", success: "Block removed", error: (e: Error) => e.message });
  };

  const activeBookings = bookings.filter((b) =>
    currentRole.type === "chauffeur" ? b.chauffeurId === currentRole.id : true
  );
  const activeBlocks = blockedSlots.filter((b) =>
    currentRole.type === "chauffeur"
      ? b.chauffeurId === currentRole.id || b.chauffeurId == null
      : true
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading calendar…</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col">
      <ChauffeurCalendar
        className="flex-1 min-h-0"
        bookings={activeBookings}
        blockedSlots={activeBlocks}
        chauffeurs={chauffeurs}
        onSelectBooking={(booking) => {
          setSelected(booking);
          setDetailOpen(true);
        }}
        onDeleteBlockedSlot={handleDeleteBlock}
      />

      <BookingDetailDialog
        booking={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        chauffeurs={chauffeurs}
        role={currentRole.type === "admin" ? "admin" : "chauffeur"}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onChauffeurChange={handleChauffeurChange}
      />
    </div>
  );
}
