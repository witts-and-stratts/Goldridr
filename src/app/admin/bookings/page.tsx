"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import {
  Search, Clock, CalendarIcon,
  Plane, Navigation, Loader2, RefreshCw,
  Lock, Filter, MoreHorizontal, CheckCircle2, XCircle, Trash2, UserX,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin-ui/table";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/admin-ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import { Checkbox } from "@/components/admin-ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/admin-ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { BookingDetailDialog } from "@/components/booking/BookingDetailDialog";
import { Avatar, AvatarFallback } from "@/components/admin-ui/avatar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useAdmin } from "../context";
import { cn } from "@/lib/utils";

interface Booking {
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
  pin?: string | null;
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

interface BlockedSlot {
  id: number;
  title: string;
  date: string;
  endDate?: string;
  isFullDay: number;
  time: string;
  duration: number;
  recurring: string;
  chauffeurId?: number | null;
}

const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const chauffeurColors = [
  "bg-blue-500/20 text-blue-600",
  "bg-purple-500/20 text-purple-600",
  "bg-green-500/20 text-green-600",
  "bg-orange-500/20 text-orange-600",
  "bg-pink-500/20 text-pink-600",
  "bg-teal-500/20 text-teal-600",
];

function chauffeurInitials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

function chauffeurColor(name: string) {
  let hash = 0;
  for (const character of name) hash = (hash * 31 + character.charCodeAt(0)) & 0xffffffff;
  return chauffeurColors[Math.abs(hash) % chauffeurColors.length];
}

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

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    chauffeurs,
    currentRole,
    selectedChauffeurId,
    setSelectedChauffeurId,
  } = useAdmin();

  const { data: bookingsData, isPending: bookingsPending } = useQuery( {
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch( "/api/admin/bookings" );
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error );
      return data.bookings as Booking[];
    },
  } );

  const { data: blockedSlotsData, isPending: blockedPending } = useQuery( {
    queryKey: qk.blockedSlots(),
    queryFn: async () => {
      const res = await fetch( "/api/admin/blocked" );
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error );
      return data.blocks as BlockedSlot[];
    },
  } );

  const bookings = bookingsData ?? [];
  const blockedSlots = blockedSlotsData ?? [];
  const loading = bookingsPending || blockedPending;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);

  // Block form state
  const [blockTitle, setBlockTitle] = useState("");
  const [blockDate, setBlockDate] = useState("");
  const [blockEndDate, setBlockEndDate] = useState("");
  const [blockFullDay, setBlockFullDay] = useState(false);
  const [blockTime, setBlockTime] = useState("");
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockRecurring, setBlockRecurring] = useState("none");
  const [blockChauffeurId, setBlockChauffeurId] = useState("");

  useEffect(() => {
    if (currentRole.type !== "admin") return;
    const chauffeurParam = searchParams.get("chauffeur");
    if (!chauffeurParam) return;
    const chauffeurId = Number(chauffeurParam);
    if (Number.isInteger(chauffeurId) && chauffeurId > 0) {
      setSelectedChauffeurId(chauffeurId);
    }
  }, [currentRole.type, searchParams, setSelectedChauffeurId]);

  const handleUpdateStatus = async (reference: string, newStatus: string) => {
    const promise = fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, status: newStatus }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      queryClient.invalidateQueries( { queryKey: qk.bookings() } );
      if (selected?.reference === reference) setSelected((p) => p ? { ...p, status: newStatus } : null);
      return data;
    });
    toast.promise(promise, {
      loading: "Updating…",
      success: `Booking ${reference} → ${newStatus}`,
      error: (e) => e.message,
    });
  };

  const handleDelete = async (reference: string) => {
    if (!confirm(`Delete booking ${reference}?`)) return;
    const promise = fetch(`/api/admin/bookings?reference=${reference}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        queryClient.invalidateQueries( { queryKey: qk.bookings() } );
        setDetailOpen(false);
        setSelected(null);
        return data;
      });
    toast.promise(promise, { loading: "Deleting…", success: "Deleted", error: (e) => e.message });
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockTitle || !blockDate) { toast.error("Title and start date are required"); return; }
    const promise = fetch("/api/admin/blocked", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: blockTitle, date: blockDate, endDate: blockEndDate || undefined,
        isFullDay: blockFullDay, time: blockFullDay ? "00:00" : blockTime,
        duration: blockFullDay ? 1440 : blockDuration, recurring: blockRecurring,
        chauffeurId: currentRole.type === "chauffeur" ? currentRole.id : (blockChauffeurId || null),
      }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      queryClient.invalidateQueries( { queryKey: qk.blockedSlots() } );
      setBlockOpen(false);
      setBlockTitle(""); setBlockDate(""); setBlockEndDate(""); setBlockFullDay(false);
      setBlockTime(""); setBlockDuration(60); setBlockRecurring("none");
      return data;
    });
    toast.promise(promise, { loading: "Scheduling…", success: "Blockout created", error: (e) => e.message });
  };

  const handleDeleteBlock = async (id: number) => {
    const promise = fetch(`/api/admin/blocked?id=${id}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        queryClient.invalidateQueries( { queryKey: qk.blockedSlots() } );
        return data;
      });
    toast.promise(promise, { loading: "Removing…", success: "Removed", error: (e) => e.message });
  };

  // Filter bookings
  const active = bookings.filter((b) =>
    currentRole.type === "chauffeur"
      ? b.chauffeurId === currentRole.id
      : selectedChauffeurId === null || b.chauffeurId === selectedChauffeurId
  );

  const filtered = active.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = !q || b.reference.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) || b.email.toLowerCase().includes(q) ||
      (b.phone || "").includes(q);

    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && b.status === "pending") ||
      (statusFilter === "confirmed" && (b.status === "confirmed" || b.status === "accepted")) ||
      (statusFilter === "cancelled" && (b.status === "cancelled" || b.status === "rejected"));

    const matchType = typeFilter === "all" || b.tripType === typeFilter;

    const matchDate = (() => {
      if (!dateRange?.from) return true;
      const d = new Date(`${b.date}T00:00:00`);
      const from = new Date(dateRange.from); from.setHours(0, 0, 0, 0);
      if (dateRange.to) {
        const to = new Date(dateRange.to); to.setHours(23, 59, 59, 999);
        return d >= from && d <= to;
      }
      return d >= from;
    })();

    return matchSearch && matchStatus && matchType && matchDate;
  });

  const bookedDates = active
    .filter((b) => b.status !== "cancelled" && b.status !== "rejected")
    .map((b) => { try { return new Date(`${b.date}T00:00:00`); } catch { return null; } })
    .filter(Boolean) as Date[];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto h-full overflow-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Bookings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{active.length} total reservations</p>
        </div>
        <div className="flex items-center gap-2">
          {currentRole.type === "admin" && (
            <Select
              value={selectedChauffeurId === null ? "__all__" : String(selectedChauffeurId)}
              onValueChange={(value) => setSelectedChauffeurId(value === "__all__" ? null : Number(value))}
            >
              <SelectTrigger className="h-9 w-52 text-sm">
                <SelectValue placeholder="All chauffeurs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All chauffeurs</SelectItem>
                {chauffeurs.map((chauffeur) => (
                  <SelectItem key={chauffeur.id} value={String(chauffeur.id)}>
                    {chauffeur.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries( { queryKey: qk.bookings() } );
            queryClient.invalidateQueries( { queryKey: qk.blockedSlots() } );
          }} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          {currentRole.type === "admin" && (
            <Button variant="destructive" size="sm" onClick={() => setBlockOpen(true)}>
              <Lock className="size-3.5" /> Block Calendar
            </Button>
          )}
        </div>
      </div>

      {/* ── Filters bar ── */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search name, ref, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="h-9">
                  {["all", "pending", "confirmed", "cancelled"].map((s) => (
                    <TabsTrigger key={s} value={s} className="text-xs capitalize px-3">
                      {s === "all" ? "All" : s}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Tabs value={typeFilter} onValueChange={setTypeFilter}>
                <TabsList className="h-9">
                  {["all", "airport", "city", "hourly"].map((t) => (
                    <TabsTrigger key={t} value={t} className="text-xs capitalize px-3">
                      {t === "all" ? "All types" : t}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Filter className="size-3.5 text-muted-foreground shrink-0" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 justify-start font-normal text-xs min-w-48">
                  <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                  {dateRange?.from ? (
                    dateRange.to
                      ? `${format(dateRange.from, "LLL dd, y")} – ${format(dateRange.to, "LLL dd, y")}`
                      : format(dateRange.from, "LLL dd, y")
                  ) : <span className="text-muted-foreground">Filter by date range</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus mode="range" defaultMonth={dateRange?.from}
                  selected={dateRange} onSelect={setDateRange} numberOfMonths={2}
                  modifiers={{ booked: bookedDates }}
                  modifiersClassNames={{ booked: "border border-primary/30 font-semibold" }}
                />
              </PopoverContent>
            </Popover>
            {(dateRange?.from || dateRange?.to) && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => setDateRange(undefined)}>
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Passenger</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Pick-up</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Assigned to</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Search className="size-8 opacity-30" />
                    <p className="text-sm">No bookings match your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((b) => {
                const price = b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0;
                const pickup = b.tripDetails?.pickupLocation || b.tripDetails?.pickup || "—";
                const assignedChauffeur = chauffeurs.find((chauffeur) => chauffeur.id === b.chauffeurId);
                return (
                  <TableRow
                    key={b.reference}
                    className="cursor-pointer"
                    onClick={() => { setSelected(b); setDetailOpen(true); }}
                  >
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold shrink-0">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm capitalize text-muted-foreground">
                        {b.tripType === "airport" ? <Plane className="size-3.5" /> : b.tripType === "hourly" ? <Clock className="size-3.5" /> : <Navigation className="size-3.5" />}
                        {b.tripType}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-muted-foreground truncate max-w-[180px]">{pickup}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      <p className="text-xs text-muted-foreground">{b.time}</p>
                    </TableCell>
                    <TableCell>
                      {assignedChauffeur ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7">
                            <AvatarFallback className={cn("text-[9px]", chauffeurColor(assignedChauffeur.name))}>
                              {chauffeurInitials(assignedChauffeur.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="max-w-28 truncate text-xs font-medium">
                            {assignedChauffeur.name}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                            <UserX className="size-3" />
                          </div>
                          <span className="text-xs">Unassigned</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-sm">{formatPrice(price)}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => { setSelected(b); setDetailOpen(true); }}>
                            View details
                          </DropdownMenuItem>
                          {b.status === "pending" && currentRole.type === "admin" && (
                            <>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(b.reference, "confirmed")} className="text-green-600">
                                <CheckCircle2 className="size-4" /> Confirm
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateStatus(b.reference, "rejected")} className="text-red-500">
                                <XCircle className="size-4" /> Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {(b.status === "confirmed" || b.status === "accepted") && currentRole.type === "admin" && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(b.reference, "cancelled")} className="text-red-500">
                              Cancel booking
                            </DropdownMenuItem>
                          )}
                          {currentRole.type === "admin" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(b.reference)} className="text-destructive">
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
            Showing {filtered.length} of {active.length} booking{active.length !== 1 ? "s" : ""}
          </div>
        )}
      </Card>

      {/* ── Booking detail dialog ── */}
      <BookingDetailDialog
        booking={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        chauffeurs={chauffeurs}
        role={currentRole.type === "admin" ? "admin" : "chauffeur"}
        onStatusChange={handleUpdateStatus}
        onDelete={handleDelete}
        onChauffeurChange={async (reference, chauffeurId) => {
          try {
            const res = await fetch("/api/admin/bookings", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference, chauffeurId }),
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            toast.success("Chauffeur updated");
            queryClient.invalidateQueries( { queryKey: qk.bookings() } );
            setSelected((p) => p ? { ...p, chauffeurId } : null);
          } catch (err) {
            toast.error("Failed", { description: err instanceof Error ? err.message : "Unknown error" });
          }
        }}
      />

      {/* ── Block Calendar dialog ── */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
          <div className="flex items-center gap-2.5 p-5 border-b border-border">
            <Lock className="size-4 text-destructive" />
            <DialogTitle className="text-base font-semibold">Block Calendar Availability</DialogTitle>
          </div>
          <DialogDescription className="sr-only">Schedule blockouts on the calendar</DialogDescription>

          <div className="grid md:grid-cols-[1.1fr_1fr] divide-x divide-border max-h-[70vh] overflow-y-auto">
            {/* Form */}
            <form onSubmit={handleCreateBlock} className="p-6 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">New Blockout</p>

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Title / Reason</label>
                <Input required placeholder="e.g. Fleet Maintenance" value={blockTitle} onChange={(e) => setBlockTitle(e.target.value)} />
              </div>

              {currentRole.type === "admin" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Block Target</label>
                  <Select value={blockChauffeurId || "__global__"} onValueChange={(v) => setBlockChauffeurId(v === "__global__" ? "" : v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Global — all chauffeurs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__global__">Global — all chauffeurs</SelectItem>
                      {chauffeurs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="fullDay"
                  checked={blockFullDay}
                  onCheckedChange={(checked) => setBlockFullDay(checked === true)}
                />
                <label htmlFor="fullDay" className="text-xs font-medium cursor-pointer select-none">
                  All-day blockout
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Start Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start font-normal text-xs h-9">
                        <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                        {blockDate ? format(new Date(`${blockDate}T00:00:00`), "PPP") : <span className="text-muted-foreground">Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" initialFocus
                        selected={blockDate ? new Date(`${blockDate}T00:00:00`) : undefined}
                        onSelect={(d) => {
                          if (d) setBlockDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                          else setBlockDate("");
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">End Date (optional)</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" disabled={blockRecurring !== "none"} className="w-full justify-start font-normal text-xs h-9">
                        <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                        {blockEndDate ? format(new Date(`${blockEndDate}T00:00:00`), "PPP") : <span className="text-muted-foreground">Pick date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" initialFocus
                        selected={blockEndDate ? new Date(`${blockEndDate}T00:00:00`) : undefined}
                        onSelect={(d) => {
                          if (d) setBlockEndDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
                          else setBlockEndDate("");
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {!blockFullDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Start Time</label>
                    <Input type="time" required value={blockTime} onChange={(e) => setBlockTime(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Duration (min)</label>
                    <Input type="number" min="1" required value={blockDuration} onChange={(e) => setBlockDuration(parseInt(e.target.value) || 60)} />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium">Recurrence</label>
                <Select
                  value={blockRecurring}
                  onValueChange={(v) => {
                    setBlockRecurring(v);
                    if (v !== "none") setBlockEndDate("");
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">One-time</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="weekends">Weekends only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" variant="destructive" className="w-full">
                <Lock className="size-3.5" /> Create Blockout
              </Button>
            </form>

            {/* Active blockouts */}
            <div className="p-6 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Active Blockouts ({blockedSlots.length})
              </p>
              <div className="space-y-2 overflow-y-auto max-h-[50vh]">
                {blockedSlots.map((block) => {
                  const c = chauffeurs.find((ch) => ch.id === block.chauffeurId);
                  return (
                    <div key={block.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{block.title}</p>
                          {c && <Badge variant="secondary" className="text-[9px] h-4 px-1">{c.name.split(" ")[0]}</Badge>}
                          {block.recurring !== "none" && <Badge variant="outline" className="text-[9px] h-4 px-1 capitalize">{block.recurring}</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(`${block.date}T00:00:00`), "MMM dd, yyyy")}
                          {block.endDate && ` – ${format(new Date(`${block.endDate}T00:00:00`), "MMM dd, yyyy")}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {block.isFullDay === 1 ? "All day" : `${block.time} · ${block.duration}min`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleDeleteBlock(block.id)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  );
                })}
                {blockedSlots.length === 0 && (
                  <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
                    <Lock className="size-8 opacity-20" />
                    <p className="text-xs">No blockouts scheduled</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
