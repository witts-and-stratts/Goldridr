"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import { CalendarClock, TicketPercent } from "lucide-react";
import type { DiscountCode } from "../types";
import { formatMoney } from "../utils";

export function UsageDialog({ usageCode, onClose }: { usageCode: DiscountCode | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(usageCode)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TicketPercent className="size-5" />
            {usageCode?.code} usage
          </DialogTitle>
          <DialogDescription>
            {usageCode?.trackedRedemptions || 0} tracked booking redemptions, {formatMoney(usageCode?.totalDiscountCents || 0)} granted.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Trip</TableHead>
                <TableHead>Original</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!usageCode?.usages.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-28 text-center text-muted-foreground">This code has not been used on a stored booking.</TableCell>
                </TableRow>
              ) : usageCode.usages.map((usage) => (
                <TableRow key={usage.bookingReference}>
                  <TableCell>
                    <p className="font-mono text-xs font-medium">{usage.bookingReference}</p>
                    <p className="mt-1 text-xs capitalize text-muted-foreground">{usage.bookingStatus}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{usage.customerName}</p>
                    <p className="text-xs text-muted-foreground">{usage.customerEmail}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm capitalize">{usage.tripType}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="size-3" />
                      {usage.tripDate} at {usage.tripTime}
                    </p>
                  </TableCell>
                  <TableCell>{formatMoney(usage.originalAmountCents)}</TableCell>
                  <TableCell className="text-green-700">-{formatMoney(usage.discountAmountCents)}</TableCell>
                  <TableCell className="font-medium">{formatMoney(usage.finalAmountCents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
