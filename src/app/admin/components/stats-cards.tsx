"use client";

import { BookOpen, Clock, CheckCircle2, DollarSign } from "lucide-react";
import { Card } from "@/components/admin-ui/card";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { formatPrice } from "../utils";

interface Stats {
  total: number;
  pending: number;
  confirmed: number;
  revenue: number;
}

export function StatsCards({ stats, loading }: { stats: Stats; loading: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-2 divide-x divide-y lg:grid-cols-4 lg:divide-y-0 divide-border">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-12" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))
        ) : (
          <>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</span>
                <BookOpen className="size-3.5 text-muted-foreground/50" />
              </div>
              <div className="text-3xl font-bold tabular-nums">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pending</span>
                <Clock className="size-3.5 text-yellow-500/70" />
              </div>
              <div className="text-3xl font-bold tabular-nums text-yellow-500 flex items-center gap-2">
                {stats.pending}
                {stats.pending > 0 && <span className="size-2 rounded-full bg-yellow-500 animate-ping inline-flex" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
            </div>

            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed</span>
                <CheckCircle2 className="size-3.5 text-green-500/70" />
              </div>
              <div className="text-3xl font-bold tabular-nums text-green-500">{stats.confirmed}</div>
              <p className="text-xs text-muted-foreground mt-1">Ready for dispatch</p>
            </div>

            <div className="p-5 bg-primary/5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Booked Value</span>
                <DollarSign className="size-3.5 text-muted-foreground/50" />
              </div>
              <div className="text-2xl font-bold tabular-nums">{formatPrice(stats.revenue)}</div>
              <p className="text-xs text-muted-foreground mt-1">Excl. cancellations</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
