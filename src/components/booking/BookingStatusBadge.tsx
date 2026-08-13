"use client";

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";
import { formatBookingStatus } from "@/lib/booking-status-label";

export function BookingStatusBadge( { status }: { status: string } ) {
  const normalized = status.trim().toLowerCase();
  const label = formatBookingStatus( status );

  if ( [ "confirmed", "accepted" ].includes( normalized ) ) {
    return (
      <Badge className="gap-1.5 border-green-500/30 bg-green-500/15 font-medium text-green-600 hover:bg-green-500/20">
        <CheckCircle2 className="size-3" />
        {label}
      </Badge>
    );
  }

  if ( [ "pending", "pending_payment", "payment_review" ].includes( normalized ) ) {
    return (
      <Badge className="gap-1.5 border-yellow-500/30 bg-yellow-500/15 font-medium text-yellow-600 hover:bg-yellow-500/20">
        <Clock className="size-3" />
        {label}
      </Badge>
    );
  }

  if ( [ "cancelled", "rejected", "payment_expired" ].includes( normalized ) ) {
    return (
      <Badge variant="outline" className="gap-1.5 border-red-500/30 bg-red-500/10 font-medium text-red-500">
        <XCircle className="size-3" />
        {label}
      </Badge>
    );
  }

  return <Badge variant="secondary">{label}</Badge>;
}
