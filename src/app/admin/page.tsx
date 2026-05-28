"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen, Clock, CheckCircle2, DollarSign, ArrowRight,
  Smartphone, Copy, Check, CalendarIcon, Loader2, RefreshCw,
  Mail, Plane, Navigation, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin-ui/table";
import { Separator } from "@/components/admin-ui/separator";
import { useAdmin } from "./context";

interface Booking {
  id: number;
  reference: string;
  tripType: string;
  date: string;
  time: string;
  name: string;
  email: string;
  status: string;
  chauffeurId?: number | null;
  tripDetails: {
    estimatedTotal?: number;
    estimatedPrice?: number;
    pickupLocation?: string;
    pickup?: string;
  };
  createdAt: string;
}

const formatPrice = (n?: number) =>
  Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "confirmed" || s === "accepted")
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20 gap-1"><CheckCircle2 className="size-3" />Confirmed</Badge>;
  if (s === "pending")
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20 gap-1"><Clock className="size-3" />Pending</Badge>;
  if (s === "cancelled" || s === "rejected")
    return <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

export default function DashboardPage() {
  const { currentRole } = useAdmin();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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

  const getCalLinks = () => {
    if (typeof window === "undefined") return { webcal: "", google: "", raw: "" };
    const raw = `${window.location.protocol}//${window.location.host}/api/admin/bookings/feed`;
    return {
      webcal: `webcal://${window.location.host}/api/admin/bookings/feed`,
      google: `https://www.google.com/calendar/render?cid=${encodeURIComponent(raw)}`,
      raw,
    };
  };

  const copyFeed = () => {
    navigator.clipboard.writeText(getCalLinks().raw);
    setCopied(true);
    toast.success("Feed URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const links = getCalLinks();

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── Page header ── */}
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-8 w-20 mb-2" /><Skeleton className="h-4 w-28" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Total Bookings</CardDescription>
                <BookOpen className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Pending</CardDescription>
                <Clock className="size-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-500 flex items-center gap-2">
                  {stats.pending}
                  {stats.pending > 0 && <span className="size-2 rounded-full bg-yellow-500 animate-ping inline-flex" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Confirmed</CardDescription>
                <CheckCircle2 className="size-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">{stats.confirmed}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready for dispatch</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>Booked Value</CardDescription>
                <TrendingUp className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPrice(stats.revenue)}</div>
                <p className="text-xs text-muted-foreground mt-1">Excl. cancellations</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Recent bookings ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Recent Bookings</CardTitle>
            <CardDescription>Latest 6 reservations</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/bookings">
              View all <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <Separator />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Passenger</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : recent.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                  No bookings yet
                </TableCell>
              </TableRow>
            ) : (
              recent.map((b) => {
                const icon = b.tripType === "airport"
                  ? <Plane className="size-3.5 inline mr-1" />
                  : b.tripType === "hourly"
                  ? <Clock className="size-3.5 inline mr-1" />
                  : <Navigation className="size-3.5 inline mr-1" />;
                const price = b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0;
                return (
                  <TableRow key={b.reference}>
                    <TableCell>
                      <div className="font-medium text-sm">{b.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="size-3" />{b.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize text-muted-foreground">
                        {icon}{b.tripType}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(b.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{formatPrice(price)}</TableCell>
                    <TableCell><StatusBadge status={b.status} /></TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Calendar sync ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Calendar Sync Feed</CardTitle>
          </div>
          <CardDescription>
            Subscribe to get all bookings in Google Calendar or Apple Calendar. Updates automatically.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={links.webcal}><Smartphone className="size-3.5" /> Subscribe on iOS</a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={links.google} target="_blank" rel="noopener noreferrer">
                <Smartphone className="size-3.5" /> Add to Google
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={copyFeed}>
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              Copy Feed URL
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
