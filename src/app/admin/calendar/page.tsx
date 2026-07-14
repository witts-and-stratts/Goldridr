"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, RefreshCw, Lock } from "lucide-react";
import { ChauffeurCalendar, type Booking } from "@/components/booking/ChauffeurCalendar";
import { BookingDetailDialog } from "@/components/booking/BookingDetailDialog";
import { useAdmin } from "../context";
import { Button } from "@/components/admin-ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/admin-ui/select";
import type { BlockedSlot } from "./types";
import { BlockCalendarDialog } from "./components/block-calendar-dialog";

const EMPTY_BLOCK_FORM = {
  title: "",
  date: "",
  endDate: "",
  fullDay: false,
  time: "",
  duration: 60,
  recurring: "none",
  chauffeurId: "",
};

export default function CalendarPage() {
  const searchParams = useSearchParams();
  const { chauffeurs, currentRole, selectedChauffeurId, setSelectedChauffeurId } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedSlots, setBlocked] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState(EMPTY_BLOCK_FORM);

  useEffect(() => {
    if (currentRole.type !== "admin") return;
    const chauffeurParam = searchParams.get("chauffeur");
    if (!chauffeurParam) return;
    setSelectedChauffeurId(chauffeurParam);
  }, [currentRole.type, searchParams, setSelectedChauffeurId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, blRes] = await Promise.all([
        fetch("/api/admin/bookings"),
        fetch("/api/admin/blocked"),
      ]);
      const [bData, blData] = await Promise.all([bRes.json(), blRes.json()]);
      if (bData.success) setBookings(bData.bookings);
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
    toast.promise(promise, { loading: "Updating…", success: `Booking ${reference} → ${newStatus}`, error: (e: Error) => e.message });
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

  const handleChauffeurChange = async (reference: string, chauffeurId: string | null) => {
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

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.title || !blockForm.date) { toast.error("Title and start date are required"); return; }
    const promise = fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: blockForm.title,
        date: blockForm.date,
        endDate: blockForm.endDate || undefined,
        isFullDay: blockForm.fullDay,
        time: blockForm.fullDay ? "00:00" : blockForm.time,
        duration: blockForm.fullDay ? 1440 : blockForm.duration,
        recurring: blockForm.recurring,
        chauffeurId: currentRole.type === "chauffeur" ? currentRole.id : (blockForm.chauffeurId || null),
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setBlocked((prev) => [...prev, data.block]);
      setBlockOpen(false);
      setBlockForm(EMPTY_BLOCK_FORM);
      return data;
    });
    toast.promise(promise, { loading: "Scheduling…", success: "Blockout created", error: (e: Error) => e.message });
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
    currentRole.type === "chauffeur"
      ? b.chauffeurId === currentRole.id
      : selectedChauffeurId === null || b.chauffeurId === selectedChauffeurId
  );
  const activeBlocks = blockedSlots.filter((b) =>
    currentRole.type === "chauffeur"
      ? b.chauffeurId === currentRole.id || b.chauffeurId == null
      : selectedChauffeurId === null
        ? true
        : b.chauffeurId === selectedChauffeurId || b.chauffeurId == null
  );
  const visibleChauffeurs = currentRole.type === "admin" && selectedChauffeurId !== null
    ? chauffeurs.filter((c) => c.id === selectedChauffeurId)
    : chauffeurs;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)] text-muted-foreground gap-2">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-sm">Loading calendar…</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden p-4 flex flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {selectedChauffeurId === null
              ? "All chauffeur schedules"
              : `${chauffeurs.find((c) => c.id === selectedChauffeurId)?.name ?? "Chauffeur"} schedule`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentRole.type === "admin" && (
            <Select
              value={selectedChauffeurId === null ? "__all__" : String(selectedChauffeurId)}
              onValueChange={(value) => setSelectedChauffeurId(value === "__all__" ? null : value)}
            >
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue placeholder="All chauffeurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All chauffeurs</SelectItem>
                {chauffeurs.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
          {currentRole.type === "admin" && (
            <Button variant="destructive" size="sm" onClick={() => setBlockOpen(true)}>
              <Lock className="size-3.5" /> Block Calendar
            </Button>
          )}
        </div>
      </div>

      <ChauffeurCalendar
        className="flex-1 min-h-0"
        bookings={activeBookings}
        blockedSlots={activeBlocks}
        chauffeurs={visibleChauffeurs}
        onSelectBooking={(booking) => { setSelected(booking); setDetailOpen(true); }}
        onDeleteBlockedSlot={handleDeleteBlock}
      />

      <BlockCalendarDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        blockedSlots={blockedSlots}
        chauffeurs={chauffeurs}
        isAdmin={currentRole.type === "admin"}
        form={blockForm}
        onFormChange={(patch) => setBlockForm((prev) => ({ ...prev, ...patch }))}
        onSubmit={handleCreateBlock}
        onDeleteBlock={handleDeleteBlock}
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
