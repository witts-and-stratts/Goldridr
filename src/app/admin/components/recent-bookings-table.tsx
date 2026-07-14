"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Mail, Plane, Navigation } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/admin-ui/table";
import { Separator } from "@/components/admin-ui/separator";
import type { DashboardBooking } from "../types";
import { formatPrice } from "../utils";
import { StatusBadge } from "./status-badge";

interface Props {
  bookings: DashboardBooking[];
  loading: boolean;
  onSelect?: (booking: DashboardBooking) => void;
}

export function RecentBookingsTable({ bookings, loading, onSelect }: Props) {
  return (
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
          ) : bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BookOpen className="size-8 text-muted-foreground/25" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">No bookings yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">Reservations will appear here once clients book.</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((b) => {
              const icon = b.tripType === "airport"
                ? <Plane className="size-3.5 inline mr-1" />
                : b.tripType === "hourly"
                ? <Clock className="size-3.5 inline mr-1" />
                : <Navigation className="size-3.5 inline mr-1" />;
              const price = b.tripDetails?.estimatedTotal || b.tripDetails?.estimatedPrice || 0;
              return (
                <TableRow
                  key={b.reference}
                  className={onSelect ? "cursor-pointer hover:bg-muted/50" : undefined}
                  onClick={onSelect ? () => onSelect(b) : undefined}
                >
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
  );
}
