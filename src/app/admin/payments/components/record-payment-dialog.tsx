"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import type { PaymentBooking, PaymentMethod, PaymentStatus } from "../types";
import { STATUS_OPTIONS } from "../constants";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bookings: PaymentBooking[];
  bookingReference: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  notes: string;
  saving: boolean;
  onSelectBooking: (ref: string) => void;
  onAmountChange: (v: string) => void;
  onMethodChange: (v: PaymentMethod) => void;
  onStatusChange: (v: PaymentStatus) => void;
  onTransactionRefChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  bookings,
  bookingReference,
  amount,
  method,
  status,
  transactionReference,
  notes,
  saving,
  onSelectBooking,
  onAmountChange,
  onMethodChange,
  onStatusChange,
  onTransactionRefChange,
  onNotesChange,
  onSubmit,
}: RecordPaymentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Add a customer payment or outstanding charge to the ledger.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-5">
            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="payment-booking">Booking</label>
              <Select value={bookingReference} onValueChange={onSelectBooking}>
                <SelectTrigger id="payment-booking">
                  <SelectValue placeholder="Choose a booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings.map(booking => (
                    <SelectItem
                      key={booking.reference}
                      value={booking.reference}
                      disabled={booking.status === "cancelled"}
                    >
                      {booking.reference} · {booking.name}{booking.status === "cancelled" ? " · Cancelled" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium" htmlFor="payment-amount">Amount (USD)</label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={event => onAmountChange(event.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Status</label>
                <Select value={status} onValueChange={value => onStatusChange(value as PaymentStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => (
                      <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium">Payment method</label>
              <Select value={method} onValueChange={value => onMethodChange(value as PaymentMethod)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="payment-reference">Transaction reference</label>
              <Input
                id="payment-reference"
                placeholder="Processor ID, check number, or receipt"
                value={transactionReference}
                onChange={event => onTransactionRefChange(event.target.value)}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-xs font-medium" htmlFor="payment-notes">Notes</label>
              <textarea
                id="payment-notes"
                className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                placeholder="Optional internal note"
                value={notes}
                onChange={event => onNotesChange(event.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !bookingReference}>
              {saving && <Loader2 className="size-3.5 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
