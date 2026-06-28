"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import {
  User, RefreshCw, Loader2, BookOpen, Clock, CalendarDays,
  Plus, Trash2, Car,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Input } from "@/components/admin-ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/admin-ui/dialog";
import { useAdmin } from "../context";
import Link from "next/link";

interface Booking {
  id: number;
  reference: string;
  date: string;
  status: string;
  chauffeurId?: number | null;
  tripDetails: { estimatedTotal?: number; estimatedPrice?: number };
}

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
  id: number;
  name: string;
  email: string;
  phone?: string;
  status: string;
  vehicle?: Vehicle | null;
}

const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export default function ChauffeursPage() {
  const queryClient = useQueryClient();
  const { chauffeurs: rawChauffeurs } = useAdmin();
  const chauffeurs = rawChauffeurs as AdminChauffeur[];

  const { data: bookingsData, isPending: bookingsPending } = useQuery( {
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch( "/api/admin/bookings" );
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error );
      return data.bookings as Booking[];
    },
  } );

  const { data: vehiclesData } = useQuery( {
    queryKey: [ "vehicles" ],
    queryFn: async () => {
      const res = await fetch( "/api/admin/vehicles" );
      const data = await res.json();
      if ( !data.success ) throw new Error( data.error );
      return data.vehicles as Vehicle[];
    },
  } );

  const vehicles = vehiclesData ?? [];
  const bookings = bookingsData ?? [];
  const loading = bookingsPending;

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; email: string } | null>(null);
  const [assignVehicleTarget, setAssignVehicleTarget] = useState<AdminChauffeur | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState<string>("");
  const [assigningSaving, setAssigningSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  const handleAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/chauffeurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add chauffeur");

      await queryClient.invalidateQueries( { queryKey: qk.chauffeurs() } );
      setForm({ name: "", email: "", phone: "", password: "" });
      setAddOpen(false);
      toast.success("Chauffeur added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add chauffeur");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignVehicle = async () => {
    if (!assignVehicleTarget) return;
    setAssigningSaving(true);
    try {
      const vehicleId = assignVehicleId === "" ? null : Number(assignVehicleId);
      const url = vehicleId === null ? "/api/admin/chauffeurs" : "/api/admin/vehicles";
      const body = vehicleId === null
        ? { id: assignVehicleTarget.id, vehicleId: null }
        : { id: vehicleId, chauffeurId: assignVehicleTarget.id };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to assign vehicle");
      await queryClient.invalidateQueries( { queryKey: qk.chauffeurs() } );
      setAssignVehicleTarget(null);
      toast.success(vehicleId ? "Vehicle assigned" : "Vehicle unassigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign vehicle");
    } finally {
      setAssigningSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/chauffeurs?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to delete chauffeur");

      await queryClient.invalidateQueries( { queryKey: qk.chauffeurs() } );
      await queryClient.invalidateQueries( { queryKey: qk.bookings() } );
      setDeleteTarget(null);
      toast.success("Chauffeur deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete chauffeur");
    } finally {
      setDeleting(false);
    }
  };

  const getStats = (id: number) => {
    const assigned = bookings.filter((b) => b.chauffeurId === id);
    const confirmed = assigned.filter((b) => b.status === "confirmed" || b.status === "accepted");
    const pending = assigned.filter((b) => b.status === "pending");
    const revenue = confirmed.reduce((sum, b) => sum + (b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0), 0);
    const upcoming = assigned.filter((b) => {
      const d = new Date(`${b.date}T00:00:00`);
      return d >= new Date() && (b.status === "confirmed" || b.status === "accepted");
    });
    return { total: assigned.length, confirmed: confirmed.length, pending: pending.length, revenue, upcoming: upcoming.length };
  };

  const unassigned = bookings.filter((b) => !b.chauffeurId && b.status !== "cancelled" && b.status !== "rejected");

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Chauffeurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{chauffeurs.length} registered driver{chauffeurs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries( { queryKey: qk.chauffeurs() } );
            queryClient.invalidateQueries( { queryKey: qk.bookings() } );
          }} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-3.5" />
            Add chauffeur
          </Button>
        </div>
      </div>

      {/* Unassigned alert */}
      {!loading && unassigned.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-yellow-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">{unassigned.length} booking{unassigned.length !== 1 ? "s" : ""} unassigned</p>
                <p className="text-xs text-muted-foreground">These bookings have no chauffeur assigned yet</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/bookings">Assign now</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Chauffeur cards */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : chauffeurs.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <User className="size-10 opacity-30" />
            <p className="text-sm">No chauffeurs registered</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {chauffeurs.map((c) => {
            const s = getStats(c.id);
            return (
              <Card key={c.id} className="hover:border-border/80 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-secondary flex items-center justify-center text-sm font-semibold">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription className="truncate">{c.email}</CardDescription>
                    </div>
                    {s.pending > 0 && (
                      <Badge className="ml-auto bg-yellow-500/15 text-yellow-600 border-yellow-500/30 text-xs">
                        {s.pending} pending
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <Separator />
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-lg font-bold">{s.total}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-500">{s.confirmed}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Confirmed</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{s.upcoming}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Upcoming</p>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  {c.vehicle ? (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                      <Car className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {[c.vehicle.year, c.vehicle.make, c.vehicle.model].filter(Boolean).join(" ")}
                        {c.vehicle.plate ? ` · ${c.vehicle.plate}` : ""}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue generated</p>
                      <p className="text-sm font-semibold">{formatPrice(s.revenue)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssignVehicleTarget(c);
                          setAssignVehicleId(c.vehicle ? String(c.vehicle.id) : "");
                        }}
                      >
                        <Car className="size-3.5" /> Vehicle
                      </Button>
                      <Link
                        href={`/admin/bookings?chauffeur=${c.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <BookOpen className="size-3.5" /> Bookings
                      </Link>
                      <Link
                        href={`/admin/calendar?chauffeur=${c.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        <CalendarDays className="size-3.5" /> Calendar
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <form onSubmit={handleAdd} className="space-y-5">
            <DialogHeader>
              <DialogTitle>Add chauffeur</DialogTitle>
              <DialogDescription>Add a driver to booking assignments and the operations calendar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <label className="grid gap-1.5 text-sm font-medium">
                Name
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Full name"
                  autoComplete="name"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Email
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="driver@goldridr.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Phone <span className="font-normal text-muted-foreground">(optional)</span>
                <Input
                  type="tel"
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="+1 (713) 555-0100"
                  autoComplete="tel"
                />
              </label>
              <label className="grid gap-1.5 text-sm font-medium">
                Initial password
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="animate-spin" />}
                Add chauffeur
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(assignVehicleTarget)} onOpenChange={(open) => !open && setAssignVehicleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign vehicle</DialogTitle>
            <DialogDescription>
              Select a vehicle for {assignVehicleTarget?.name}. Choose "None" to unassign.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={assignVehicleId}
              onChange={(e) => setAssignVehicleId(e.target.value)}
            >
              <option value="">None</option>
              {vehicles.filter(v => v.status === "active").map(v => (
                <option key={v.id} value={String(v.id)}>
                  {[v.year, v.make, v.model].filter(Boolean).join(" ")}{v.plate ? ` · ${v.plate}` : ""}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignVehicleTarget(null)} disabled={assigningSaving}>
              Cancel
            </Button>
            <Button onClick={handleAssignVehicle} disabled={assigningSaving}>
              {assigningSaving && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chauffeur?</DialogTitle>
            <DialogDescription>
              {deleteTarget?.name} will be removed from assignments. Their existing bookings will become unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete chauffeur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
