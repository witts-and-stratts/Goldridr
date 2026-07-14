"use client";
import {
  RotateCcw, ExternalLink, MapPin, Clock, User, Plane, Users, BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Badge } from "@/components/admin-ui/badge";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Separator } from "@/components/admin-ui/separator";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import type { DriverRide } from "../types";
import { StatusBadge } from "./status-badge";

export function RideResult({ ride, onReset }: { ride: DriverRide; onReset: () => void }) {
  const dateLabel = (() => {
    try { return format(parseISO(ride.date), "EEEE, MMMM d, yyyy"); }
    catch { return ride.date; }
  })();

  return (
    <div className="flex flex-col gap-4 w-full max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <BadgeCheck className="size-5 text-green-500 shrink-0" />
        <h2 className="text-base font-semibold">Booking found</h2>
        <StatusBadge status={ride.status} />
        <Badge variant="outline" className="ml-auto font-mono text-xs">{ride.reference}</Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <div className="col-span-2 flex items-center gap-2">
              <User className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">{ride.customerName}</span>
              {ride.customerPhone && (
                <span className="text-xs text-muted-foreground ml-auto">{ride.customerPhone}</span>
              )}
            </div>

            <div className="flex items-start gap-2">
              <Clock className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Date &amp; time</p>
                <p className="text-sm">{dateLabel}</p>
                <p className="text-sm text-muted-foreground">{ride.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Trip type</p>
                <p className="text-sm capitalize">{ride.tripType.replace(/_/g, " ")}</p>
                {ride.passengers && <p className="text-xs text-muted-foreground">{ride.passengers} pax</p>}
              </div>
            </div>

            {ride.pickup && (
              <div className="col-span-2 flex items-start gap-2">
                <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pickup</p>
                  <p className="text-sm truncate">{ride.pickup}</p>
                  {ride.destination && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">Destination</p>
                      <p className="text-sm truncate">{ride.destination}</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {ride.flightNumber && (
              <div className="flex items-center gap-2">
                <Plane className="size-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Flight</p>
                  <p className="text-sm">{ride.flightNumber}</p>
                </div>
              </div>
            )}

            {ride.estimatedPrice && (
              <div className="flex items-center gap-2 col-span-2">
                <span className="text-xs text-muted-foreground">Estimated price:</span>
                <span className="text-sm font-semibold">{ride.estimatedPrice}</span>
              </div>
            )}
          </div>

          {ride.notes && (
            <>
              <Separator />
              <p className="px-4 py-2 text-xs text-muted-foreground italic">{ride.notes}</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw className="size-3.5" />
          Scan another
        </Button>
        <Button size="sm" asChild className="gap-1.5 ml-auto">
          <Link href={`/admin/bookings?ref=${ride.reference}`}>
            Open booking
            <ExternalLink className="size-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
