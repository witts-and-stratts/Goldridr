"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  User, RefreshCw, Loader2, BookOpen, CheckCircle2, Clock,
  MoreHorizontal, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";
import { Skeleton } from "@/components/admin-ui/skeleton";
import Link from "next/link";

interface Chauffeur {
  id: number;
  name: string;
}

interface Booking {
  id: number;
  reference: string;
  date: string;
  status: string;
  chauffeurId?: number | null;
  tripDetails: { estimatedTotal?: number; estimatedPrice?: number };
}

const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/admin/chauffeurs"),
        fetch("/api/admin/bookings"),
      ]);
      const [cData, bData] = await Promise.all([cRes.json(), bRes.json()]);
      if (cData.success) setChauffeurs(cData.chauffeurs);
      if (bData.success) setBookings(bData.bookings);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

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
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
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
                    <div>
                      <CardTitle className="text-base">{c.name}</CardTitle>
                      <CardDescription>Chauffeur #{c.id}</CardDescription>
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
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue generated</p>
                      <p className="text-sm font-semibold">{formatPrice(s.revenue)}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/bookings`}>
                          <BookOpen className="size-3.5" /> Bookings
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/admin/calendar">
                          <CalendarDays className="size-3.5" /> Calendar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}
