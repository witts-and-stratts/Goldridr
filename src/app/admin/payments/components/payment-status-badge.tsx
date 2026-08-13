"use client";

import { CheckCircle2, Clock3, RotateCcw, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";
import type { PaymentStatus } from "../types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === "paid") {
    return <Badge className="gap-1.5 border-green-500/30 bg-green-500/15 text-green-600 hover:bg-green-500/20"><CheckCircle2 className="size-3" />Paid</Badge>;
  }
  if (status === "pending") {
    return <Badge className="gap-1.5 border-yellow-500/30 bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20"><Clock3 className="size-3" />Pending</Badge>;
  }
  if (status === "awaiting_verification") {
    return <Badge className="gap-1.5 border-amber-500/30 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20"><Clock3 className="size-3" />Review</Badge>;
  }
  if (status === "refunded") {
    return <Badge variant="outline" className="gap-1.5"><RotateCcw className="size-3" />Refunded</Badge>;
  }
  return <Badge variant="destructive" className="gap-1.5 bg-destructive/10 text-destructive"><TriangleAlert className="size-3" />{status === "expired" ? "Expired" : "Failed"}</Badge>;
}
