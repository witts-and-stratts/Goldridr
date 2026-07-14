"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import { useAdmin } from "../../context";
import {
  ArrowLeft, Car, Mail, Phone, CalendarDays, BookOpen,
  Plane, Clock, Navigation, CheckCircle2, XCircle, MoreHorizontal, Trash2, UserX,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/admin-ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/admin-ui/avatar";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";
import { Skeleton } from "@/components/admin-ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/admin-ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { BookingDetailDialog, type BookingDetail } from "@/components/booking/BookingDetailDialog";

interface Vehicle {
  id: number;
  make: string;
  model: string;
  year?: number | null;
  colour?: string | null;
  plate?: string | null;
  status: string;
}

interface AdminChauffeur {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  avatarUrl?: string | null;
  vehicle?: Vehicle | null;
}

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

function ChauffeurStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "active")
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30">Active</Badge>;
  if (s === "inactive" || s === "suspended")
    return <Badge className="bg-red-500/15 text-red-600 border-red-500/30">{status}</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function ChauffeurDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { chauffeurs: adminChauffeurs } = useAdmin();
  const [selected, setSelected] = useState<BookingDetail | null>(null);

  const { data: chauffeurs = [], isPending: chauffeursPending } = useQuery<AdminChauffeur[]>({
    queryKey: qk.chauffeurs(),
    queryFn: async () => {
      const res = await fetch("/api/admin/chauffeurs");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to load chauffeurs");
      return data.chauffeurs;
    },
  });

  const { data: allBookings = [], isPending: bookingsPending } = useQuery<BookingDetail[]>({
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Failed to load bookings");
      return data.bookings;
    },
  });

  const handleStatusChange = async (reference: string, newStatus: string) => {
    const promise = fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, status: newStatus }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await queryClient.invalidateQueries({ queryKey: qk.bookings() });
      setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
    });
    toast.promise(promise, { loading: "Updating…", success: `Booking → ${newStatus}`, error: "Failed to update" });
  };

  const handleChauffeurChange = async (reference: string, chauffeurId: string | null) => {
    const promise = fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, chauffeurId }),
    }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await queryClient.invalidateQueries({ queryKey: qk.bookings() });
      setSelected((prev) => prev ? { ...prev, chauffeurId } : null);
    });
    toast.promise(promise, { loading: "Assigning…", success: "Chauffeur updated", error: "Failed to assign" });
  };

  const handleDelete = async (reference: string) => {
    if (!confirm(`Delete booking ${reference}?`)) return;
    const promise = fetch(`/api/admin/bookings?reference=${reference}`, { method: "DELETE" }).then(async (res) => {
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      await queryClient.invalidateQueries({ queryKey: qk.bookings() });
      setSelected(null);
    });
    toast.promise(promise, { loading: "Deleting…", success: "Booking deleted", error: "Failed to delete" });
  };

  const loading = chauffeursPending || bookingsPending;
  const chauffeur = chauffeurs.find((c) => c.id === id);
  const bookings = allBookings.filter((b) => b.chauffeurId === id);

  const confirmed = bookings.filter((b) => b.status === "confirmed" || b.status === "accepted");
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => {
    const d = new Date(b.date);
    return d >= new Date() && (b.status === "confirmed" || b.status === "accepted");
  });
  const revenue = confirmed.reduce(
    (sum, b) => sum + (b.tripDetails?.estimatedTotal ?? b.tripDetails?.estimatedPrice ?? 0),
    0,
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
          <Link href="/admin/chauffeurs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">
            {loading ? <Skeleton className="h-6 w-40" /> : (chauffeur?.name ?? "Chauffeur")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Individual dashboard</p>
        </div>
        {!loading && chauffeur && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/calendar?chauffeur=${id}`}>
                <CalendarDays className="size-3.5" /> Calendar
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/bookings?chauffeur=${id}`}>
                <BookOpen className="size-3.5" /> All Bookings
              </Link>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          <Card><CardContent className="p-6 space-y-3"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-48" /></CardContent></Card>
          <Card><CardContent className="p-6 grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</CardContent></Card>
        </div>
      ) : !chauffeur ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            Chauffeur not found.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Profile + stats row */}
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Profile card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="size-14 shrink-0">
                    <AvatarImage src={chauffeur.avatarUrl ?? undefined} alt={chauffeur.name} />
                    <AvatarFallback className="text-lg">{chauffeur.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-base">{chauffeur.name}</p>
                      <ChauffeurStatusBadge status={chauffeur.status} />
                    </div>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="size-3.5 shrink-0" />
                      <span className="truncate">{chauffeur.email}</span>
                    </p>
                    {chauffeur.phone && (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="size-3.5 shrink-0" />
                        {chauffeur.phone}
                      </p>
                    )}
                  </div>
                </div>
                {chauffeur.vehicle && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Car className="size-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {[chauffeur.vehicle.year, chauffeur.vehicle.make, chauffeur.vehicle.model]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                        <p className="text-xs">
                          {[chauffeur.vehicle.colour, chauffeur.vehicle.plate]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">{bookings.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total bookings</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-500">{confirmed.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Confirmed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-500">{pending.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{upcoming.length}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Upcoming</p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Revenue generated</p>
                  <p className="text-xl font-bold">{formatPrice(revenue)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Passenger</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Pick-up</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                      No bookings assigned to this chauffeur.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((b) => {
                    const price = b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0;
                    const pickup = b.tripDetails?.pickupLocation || b.tripDetails?.pickup || "—";
                    return (
                      <TableRow
                        key={b.reference}
                        className="cursor-pointer"
                        onClick={() => setSelected(b)}
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
                              <DropdownMenuItem onClick={() => setSelected(b)}>
                                View details
                              </DropdownMenuItem>
                              {b.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(b.reference, "confirmed")} className="text-green-600">
                                    <CheckCircle2 className="size-4" /> Confirm
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(b.reference, "rejected")} className="text-red-500">
                                    <XCircle className="size-4" /> Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {(b.status === "confirmed" || b.status === "accepted") && (
                                <DropdownMenuItem onClick={() => handleStatusChange(b.reference, "cancelled")} className="text-red-500">
                                  Cancel booking
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(b.reference)} className="text-destructive">
                                <Trash2 className="size-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {bookings.length > 0 && (
              <div className="px-6 py-3 border-t border-border text-xs text-muted-foreground">
                {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
              </div>
            )}
          </Card>

          <BookingDetailDialog
            booking={selected}
            open={selected !== null}
            onOpenChange={(open) => { if (!open) setSelected(null); }}
            chauffeurs={adminChauffeurs}
            onStatusChange={handleStatusChange}
            onChauffeurChange={handleChauffeurChange}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
