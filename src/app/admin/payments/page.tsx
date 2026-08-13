"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Input } from "@/components/admin-ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import type { Payment, PaymentBooking, PaymentMethod, PaymentStatus } from "./types";
import { STATUS_OPTIONS } from "./constants";
import { SummaryCards } from "./components/summary-cards";
import { PaymentsTable } from "./components/payments-table";
import { RecordPaymentDialog } from "./components/record-payment-dialog";

export default function PaymentsPage() {
  const queryClient = useQueryClient();

  const { data: paymentsData, isPending: paymentsPending } = useQuery({
    queryKey: qk.payments(),
    queryFn: async () => {
      const res = await fetch("/api/admin/payments");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load payments");
      return data.payments as Payment[];
    },
  });

  const { data: bookingsData } = useQuery({
    queryKey: qk.bookings(),
    queryFn: async () => {
      const res = await fetch("/api/admin/bookings");
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load bookings");
      return data.bookings as PaymentBooking[];
    },
  });

  const payments = useMemo(() => paymentsData ?? [], [paymentsData]);
  const bookings = useMemo(() => bookingsData ?? [], [bookingsData]);
  const loading = paymentsPending;

  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [bookingReference, setBookingReference] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [status, setStatus] = useState<PaymentStatus>("paid");
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  const summary = useMemo(() => {
    const paid = payments.filter(p => p.status === "paid").reduce((t, p) => t + p.amountCents, 0);
    const pending = payments.filter(p => p.status === "pending").reduce((t, p) => t + p.amountCents, 0);
    const refunded = payments.filter(p => p.status === "refunded").reduce((t, p) => t + p.amountCents, 0);
    return { paid, pending, refunded };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payments.filter(payment => {
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesSearch = !query || [
        payment.bookingReference,
        payment.customerName,
        payment.customerEmail,
        payment.transactionReference || "",
      ].some(value => value.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [payments, search, statusFilter]);

  function resetForm() {
    setBookingReference("");
    setAmount("");
    setMethod("card");
    setStatus("paid");
    setTransactionReference("");
    setNotes("");
  }

  function selectBooking(reference: string) {
    const booking = bookings.find(candidate => candidate.reference === reference);
    if (booking?.status === "cancelled") return;
    setBookingReference(reference);
    const quote = booking?.tripDetails?.estimatedTotal ?? booking?.tripDetails?.estimatedPrice;
    setAmount(quote === undefined ? "" : quote.toFixed(2));
  }

  async function recordPayment(event: React.FormEvent) {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!bookingReference || !Number.isFinite(numericAmount) || numericAmount < 0) {
      toast.error("Choose a booking and enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingReference,
          amountCents: Math.round(numericAmount * 100),
          currency: "USD",
          method,
          status,
          transactionReference: transactionReference.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to record payment");
      toast.success(status === "paid" ? "Payment recorded and booking confirmed" : "Payment recorded");
      setDialogOpen(false);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: qk.payments() });
      await queryClient.invalidateQueries({ queryKey: qk.bookings() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(payment: Payment, nextStatus: PaymentStatus) {
    try {
      const response = await fetch("/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: payment.id, status: nextStatus }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to update payment");
      queryClient.invalidateQueries({ queryKey: qk.payments() });
      toast.success(
        nextStatus === "paid"
          ? "Payment marked paid and booking confirmed"
          : `Payment marked ${nextStatus}`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update payment");
    }
  }

  async function removePayment(payment: Payment) {
    if (!window.confirm(`Delete the payment record for ${payment.bookingReference}?`)) return;
    try {
      const response = await fetch(`/api/admin/payments?id=${payment.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Failed to delete payment");
      queryClient.invalidateQueries({ queryKey: qk.payments() });
      toast.success("Payment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete payment");
    }
  }

  async function verifyZelle(payment: Payment, action: "approve" | "reject") {
    const reason = action === "reject" ? window.prompt("Why could this transfer not be verified?") || "Transfer could not be verified" : undefined;
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/verification`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Verification failed");
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.payments() }), queryClient.invalidateQueries({ queryKey: qk.bookings() })]);
      toast.success(action === "approve" ? "Zelle payment approved and booking confirmed" : "Zelle claim rejected and slot released");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Verification failed"); }
  }

  async function refundPayment(payment: Payment) {
    if (!window.confirm(`Issue a full ${payment.provider === "manual" ? "recorded Zelle " : ""}refund and cancel booking ${payment.bookingReference}?`)) return;
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manualConfirmed: payment.provider === "manual" }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Refund failed");
      await Promise.all([queryClient.invalidateQueries({ queryKey: qk.payments() }), queryClient.invalidateQueries({ queryKey: qk.bookings() })]);
      toast.success("Payment refunded and booking cancelled");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Refund failed"); }
  }

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-auto p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track customer charges against bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            queryClient.invalidateQueries({ queryKey: qk.payments() });
            queryClient.invalidateQueries({ queryKey: qk.bookings() });
          }} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            Record payment
          </Button>
        </div>
      </div>

      <SummaryCards summary={summary} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search customer, booking, or transaction"
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all">All</TabsTrigger>
              {STATUS_OPTIONS.map(option => (
                <TabsTrigger key={option} value={option} className="capitalize">{option}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <PaymentsTable
        payments={payments}
        filteredPayments={filteredPayments}
        loading={loading}
        onUpdateStatus={updateStatus}
        onRemove={removePayment}
        onVerify={verifyZelle}
        onRefund={refundPayment}
      />

      <RecordPaymentDialog
        open={dialogOpen}
        onOpenChange={open => { setDialogOpen(open); if (!open) resetForm(); }}
        bookings={bookings}
        bookingReference={bookingReference}
        amount={amount}
        method={method}
        status={status}
        transactionReference={transactionReference}
        notes={notes}
        saving={saving}
        onSelectBooking={selectBooking}
        onAmountChange={setAmount}
        onMethodChange={setMethod}
        onStatusChange={setStatus}
        onTransactionRefChange={setTransactionReference}
        onNotesChange={setNotes}
        onSubmit={recordPayment}
      />
    </div>
  );
}
