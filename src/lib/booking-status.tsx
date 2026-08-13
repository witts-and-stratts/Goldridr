// Booking status utilities

import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { ReactNode } from "react";

export type BookingStatus = "accepted" | "confirmed" | "pending" | "pending_payment" | "payment_review" | "payment_expired" | "cancelled" | "rejected" | string;

export const getStatusColor = ( status: string ): string => {
  switch ( status?.toLowerCase() ) {
    case "accepted":
    case "confirmed":
      return "text-green-400 bg-green-500/10 border-green-500/30";
    case "pending":
    case "pending_payment":
    case "payment_review":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    case "cancelled":
    case "rejected":
    case "payment_expired":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    default:
      return "text-gray-400 bg-gray-500/10 border-gray-500/30";
  }
};

export const getStatusIcon = ( status: string ): ReactNode => {
  switch ( status?.toLowerCase() ) {
    case "accepted":
    case "confirmed":
      return <CheckCircle2 className="size-4" />;
    case "pending":
    case "pending_payment":
    case "payment_review":
      return <Clock className="size-4" />;
    case "cancelled":
    case "rejected":
    case "payment_expired":
      return <XCircle className="size-4" />;
    default:
      return <Clock className="size-4" />;
  }
};
