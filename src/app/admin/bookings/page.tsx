"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import {
  Search, Clock, CalendarIcon,
  Plane, Navigation, Loader2, RefreshCw,
  MoreHorizontal, CheckCircle2, XCircle, Trash2, UserX,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin-ui/table";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";
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
import type { Booking } from "./types";
import { formatPrice, chauffeurInitials, chauffeurColor } from "./utils";
import { StatusBadge } from "./components/status-badge";

export default function BookingsPage() {
  const params = useParams<{ chauffeurId?: string }>();
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

  const bookings = bookingsData ?? [];
  const loading = bookingsPending;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    const statusParam = searchParams.get("status");
    return statusParam && ["all", "pending", "confirmed", "cancelled"].includes(statusParam)
      ? statusParam
      : "all";
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (currentRole.type !== "admin") return;
    const chauffeurParam = params.chauffeurId ?? searchParams.get("chauffeur");
    if (!chauffeurParam) return;
    setSelectedChauffeurId(chauffeurParam);
  }, [currentRole.type, params.chauffeurId, searchParams, setSelectedChauffeurId]);

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
    return promise;
  };

  const handleDelete = async (reference: string) => {
    if (!confirm(`Delete booking ${reference}?`)) return false;
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
    return promise;
  };


  // Filter bookings
  const showUnassignedOnly = currentRole.type === "admin" && searchParams.get("assignment") === "unassigned";
  const active = bookings.filter((b) =>
    currentRole.type === "chauffeur"
      ? b.chauffeurId === currentRole.id
      : showUnassignedOnly
      ? !b.chauffeurId
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
              value={showUnassignedOnly || selectedChauffeurId === null ? "__all__" : String(selectedChauffeurId)}
              onValueChange={(value) => setSelectedChauffeurId(value === "__all__" ? null : value)}
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
          }} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search name, ref, email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="airport">Airport</SelectItem>
                  <SelectItem value="city">City</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 justify-start font-normal text-xs min-w-48">
                      <CalendarIcon className="size-3.5 mr-2 text-muted-foreground" />
                      {dateRange?.from ? (
                        dateRange.to
                          ? `${format(dateRange.from, "LLL dd, y")} – ${format(dateRange.to, "LLL dd, y")}`
                          : format(dateRange.from, "LLL dd, y")
                      ) : <span className="text-muted-foreground">Date range</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus mode="range" defaultMonth={dateRange?.from}
                      selected={dateRange} onSelect={setDateRange} numberOfMonths={2}
                      modifiers={{ booked: bookedDates }}
                      modifiersClassNames={{ booked: "border border-primary/30 font-semibold" }}
                    />
                  </PopoverContent>
                </Popover>
                {(dateRange?.from || dateRange?.to) && (
                  <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => setDateRange(undefined)}>
                    Clear
                  </Button>
                )}
              </div>
            </div>
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
              <TableHead className="w-12">Assigned</TableHead>
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
                        <Avatar className="size-7" title={assignedChauffeur.name}>
                          <AvatarFallback className={cn("text-[9px]", chauffeurColor(assignedChauffeur.name))}>
                            {chauffeurInitials(assignedChauffeur.name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex size-7 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground" title="Unassigned">
                          <UserX className="size-3" />
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
            return true;
          } catch (err) {
            toast.error("Failed", { description: err instanceof Error ? err.message : "Unknown error" });
            return false;
          }
        }}
      />

    </div>
  );
}
