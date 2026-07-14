"use client";
import { Badge } from "@/components/admin-ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_STYLES } from "../constants";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("capitalize border text-xs font-medium", STATUS_STYLES[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </Badge>
  );
}
