"use client";

import { CheckCircle2, Clock3, RotateCcw } from "lucide-react";
import { Card } from "@/components/admin-ui/card";
import { formatMoney } from "../utils";

interface SummaryCardsProps {
  summary: { paid: number; pending: number; refunded: number };
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Collected</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(summary.paid)}</p>
          </div>
          <CheckCircle2 className="size-5 text-green-500" />
        </div>
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(summary.pending)}</p>
          </div>
          <Clock3 className="size-5 text-yellow-500" />
        </div>
        <div className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Refunded</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney(summary.refunded)}</p>
          </div>
          <RotateCcw className="size-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
}
