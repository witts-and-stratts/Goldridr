"use client";

import { Clock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase();
  if (s === "confirmed" || s === "accepted")
    return <Badge className="bg-green-500/15 text-green-600 border-green-500/30 hover:bg-green-500/20 gap-1"><CheckCircle2 className="size-3" />Confirmed</Badge>;
  if (s === "pending")
    return <Badge className="bg-yellow-500/15 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/20 gap-1"><Clock className="size-3" />Pending</Badge>;
  if (s === "cancelled" || s === "rejected")
    return <Badge variant="destructive" className="gap-1 bg-destructive/10 text-destructive border-destructive/20">Cancelled</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}
