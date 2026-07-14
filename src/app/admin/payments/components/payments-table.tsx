"use client";

import { Banknote, CreditCard, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Card } from "@/components/admin-ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { Skeleton } from "@/components/admin-ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import type { Payment, PaymentStatus } from "../types";
import { STATUS_OPTIONS } from "../constants";
import { formatMoney, formatMethod } from "../utils";
import { PaymentStatusBadge } from "./payment-status-badge";

interface PaymentsTableProps {
  payments: Payment[];
  filteredPayments: Payment[];
  loading: boolean;
  onUpdateStatus: (payment: Payment, status: PaymentStatus) => void;
  onRemove: (payment: Payment) => void;
}

export function PaymentsTable({ payments, filteredPayments, loading, onUpdateStatus, onRemove }: PaymentsTableProps) {
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Customer</TableHead>
              <TableHead>Booking</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Transaction</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Recorded</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, row) => (
                <TableRow key={row}>
                  {Array.from({ length: 8 }).map((__, cell) => (
                    <TableCell key={cell}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CreditCard className="size-8 opacity-30" />
                    <p className="text-sm font-medium text-foreground">No payment records</p>
                    <p className="text-xs">
                      {payments.length === 0 ? "Record the first payment against a booking." : "No payments match these filters."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredPayments.map(payment => (
              <TableRow key={payment.id}>
                <TableCell className="pl-6">
                  <p className="text-sm font-medium">{payment.customerName}</p>
                  <p className="text-xs text-muted-foreground">{payment.customerEmail}</p>
                </TableCell>
                <TableCell>
                  <p className="font-mono text-xs">{payment.bookingReference}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">{payment.tripType}</p>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    {payment.method === "cash" ? <Banknote className="size-3.5 text-muted-foreground" /> : <CreditCard className="size-3.5 text-muted-foreground" />}
                    {formatMethod(payment.method)}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {payment.transactionReference || "Manual"}
                </TableCell>
                <TableCell className="font-semibold tabular-nums">
                  {formatMoney(payment.amountCents, payment.currency)}
                </TableCell>
                <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(payment.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">Payment actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuLabel>Set status</DropdownMenuLabel>
                      {STATUS_OPTIONS.filter(option => option !== payment.status).map(option => (
                        <DropdownMenuItem
                          key={option}
                          disabled={option === "paid" && payment.bookingStatus === "cancelled"}
                          onClick={() => onUpdateStatus(payment, option)}
                          className="capitalize"
                        >
                          {option}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => onRemove(payment)}>
                        <Trash2 className="size-4" />
                        Delete record
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {!loading && filteredPayments.length > 0 && (
        <div className="border-t px-6 py-3 text-xs text-muted-foreground">
          Showing {filteredPayments.length} of {payments.length} payment{payments.length === 1 ? "" : "s"}
        </div>
      )}
    </Card>
  );
}
