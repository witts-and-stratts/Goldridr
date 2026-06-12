"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent } from "@/components/admin-ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import { Skeleton } from "@/components/admin-ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/admin-ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";

type PaymentStatus = "pending" | "paid" | "refunded" | "failed";
type PaymentMethod = "card" | "cash" | "bank_transfer" | "other";

interface Payment {
  id: number;
  bookingReference: string;
  amountCents: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  notes: string | null;
  paidAt: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  tripType: string;
  tripDate: string;
  tripTime: string;
  bookingStatus: string;
}

interface Booking {
  reference: string;
  name: string;
  email: string;
  status: string;
  date: string;
  time: string;
  tripDetails: {
    estimatedTotal?: number;
    estimatedPrice?: number;
  };
}

const statusOptions: PaymentStatus[] = [ "pending", "paid", "refunded", "failed" ];

function formatMoney( cents: number, currency = "USD" ) {
  return new Intl.NumberFormat( "en-US", {
    style: "currency",
    currency,
  } ).format( cents / 100 );
}

function formatMethod( method: PaymentMethod ) {
  return {
    card: "Card",
    cash: "Cash",
    bank_transfer: "Bank transfer",
    other: "Other",
  }[method];
}

function PaymentStatusBadge( { status }: { status: PaymentStatus } ) {
  if ( status === "paid" ) {
    return <Badge className="gap-1.5 border-green-500/30 bg-green-500/15 text-green-600 hover:bg-green-500/20"><CheckCircle2 className="size-3" />Paid</Badge>;
  }
  if ( status === "pending" ) {
    return <Badge className="gap-1.5 border-yellow-500/30 bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/20"><Clock3 className="size-3" />Pending</Badge>;
  }
  if ( status === "refunded" ) {
    return <Badge variant="outline" className="gap-1.5"><RotateCcw className="size-3" />Refunded</Badge>;
  }
  return <Badge variant="destructive" className="gap-1.5 bg-destructive/10 text-destructive"><TriangleAlert className="size-3" />Failed</Badge>;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>( [] );
  const [bookings, setBookings] = useState<Booking[]>( [] );
  const [loading, setLoading] = useState( true );
  const [saving, setSaving] = useState( false );
  const [dialogOpen, setDialogOpen] = useState( false );
  const [search, setSearch] = useState( "" );
  const [statusFilter, setStatusFilter] = useState( "all" );
  const [bookingReference, setBookingReference] = useState( "" );
  const [amount, setAmount] = useState( "" );
  const [method, setMethod] = useState<PaymentMethod>( "card" );
  const [status, setStatus] = useState<PaymentStatus>( "paid" );
  const [transactionReference, setTransactionReference] = useState( "" );
  const [notes, setNotes] = useState( "" );

  const fetchData = useCallback( async () => {
    setLoading( true );
    try {
      const [ paymentsResponse, bookingsResponse ] = await Promise.all( [
        fetch( "/api/admin/payments" ),
        fetch( "/api/admin/bookings" ),
      ] );
      const [ paymentsData, bookingsData ] = await Promise.all( [
        paymentsResponse.json(),
        bookingsResponse.json(),
      ] );
      if ( !paymentsResponse.ok || !paymentsData.success ) throw new Error( paymentsData.error || "Failed to load payments" );
      if ( !bookingsResponse.ok || !bookingsData.success ) throw new Error( bookingsData.error || "Failed to load bookings" );
      setPayments( paymentsData.payments );
      setBookings( bookingsData.bookings );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Failed to load payments" );
    } finally {
      setLoading( false );
    }
  }, [] );

  useEffect( () => {
    fetchData();
  }, [ fetchData ] );

  const summary = useMemo( () => {
    const paid = payments.filter( payment => payment.status === "paid" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 );
    const pending = payments.filter( payment => payment.status === "pending" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 );
    const refunded = payments.filter( payment => payment.status === "refunded" )
      .reduce( ( total, payment ) => total + payment.amountCents, 0 );
    return { paid, pending, refunded };
  }, [ payments ] );

  const filteredPayments = useMemo( () => {
    const query = search.trim().toLowerCase();
    return payments.filter( payment => {
      const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
      const matchesSearch = !query || [
        payment.bookingReference,
        payment.customerName,
        payment.customerEmail,
        payment.transactionReference || "",
      ].some( value => value.toLowerCase().includes( query ) );
      return matchesStatus && matchesSearch;
    } );
  }, [ payments, search, statusFilter ] );

  function resetForm() {
    setBookingReference( "" );
    setAmount( "" );
    setMethod( "card" );
    setStatus( "paid" );
    setTransactionReference( "" );
    setNotes( "" );
  }

  function selectBooking( reference: string ) {
    const booking = bookings.find( candidate => candidate.reference === reference );
    if ( booking?.status === "cancelled" ) return;
    setBookingReference( reference );
    const quote = booking?.tripDetails?.estimatedTotal ?? booking?.tripDetails?.estimatedPrice;
    setAmount( quote === undefined ? "" : quote.toFixed( 2 ) );
  }

  async function recordPayment( event: React.FormEvent ) {
    event.preventDefault();
    const numericAmount = Number( amount );
    if ( !bookingReference || !Number.isFinite( numericAmount ) || numericAmount < 0 ) {
      toast.error( "Choose a booking and enter a valid amount" );
      return;
    }

    setSaving( true );
    try {
      const response = await fetch( "/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          bookingReference,
          amountCents: Math.round( numericAmount * 100 ),
          currency: "USD",
          method,
          status,
          transactionReference: transactionReference.trim() || null,
          notes: notes.trim() || null,
        } ),
      } );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to record payment" );
      toast.success(
        status === "paid"
          ? "Payment recorded and booking confirmed"
          : "Payment recorded"
      );
      setDialogOpen( false );
      resetForm();
      await fetchData();
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Failed to record payment" );
    } finally {
      setSaving( false );
    }
  }

  async function updateStatus( payment: Payment, nextStatus: PaymentStatus ) {
    try {
      const response = await fetch( "/api/admin/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( { id: payment.id, status: nextStatus } ),
      } );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to update payment" );
      setPayments( current => current.map( item => item.id === payment.id ? { ...item, status: nextStatus } : item ) );
      toast.success(
        nextStatus === "paid"
          ? "Payment marked paid and booking confirmed"
          : `Payment marked ${ nextStatus }`
      );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Failed to update payment" );
    }
  }

  async function removePayment( payment: Payment ) {
    if ( !window.confirm( `Delete the payment record for ${ payment.bookingReference }?` ) ) return;
    try {
      const response = await fetch( `/api/admin/payments?id=${ payment.id }`, { method: "DELETE" } );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to delete payment" );
      setPayments( current => current.filter( item => item.id !== payment.id ) );
      toast.success( "Payment deleted" );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Failed to delete payment" );
    }
  }

  return (
    <div className="mx-auto h-full max-w-7xl space-y-6 overflow-auto p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Payments</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Track customer charges against bookings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button size="sm" onClick={() => setDialogOpen( true )}>
            <Plus className="size-3.5" />
            Record payment
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="grid divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Collected</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney( summary.paid )}</p>
            </div>
            <CheckCircle2 className="size-5 text-green-500" />
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney( summary.pending )}</p>
            </div>
            <Clock3 className="size-5 text-yellow-500" />
          </div>
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Refunded</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatMoney( summary.refunded )}</p>
            </div>
            <RotateCcw className="size-5 text-muted-foreground" />
          </div>
        </div>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search customer, booking, or transaction"
              value={search}
              onChange={event => setSearch( event.target.value )}
            />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9">
              <TabsTrigger value="all">All</TabsTrigger>
              {statusOptions.map( option => (
                <TabsTrigger key={option} value={option} className="capitalize">{option}</TabsTrigger>
              ) )}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

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
                Array.from( { length: 5 } ).map( ( _, row ) => (
                  <TableRow key={row}>
                    {Array.from( { length: 8 } ).map( ( __, cell ) => (
                      <TableCell key={cell}><Skeleton className="h-4 w-full" /></TableCell>
                    ) )}
                  </TableRow>
                ) )
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
              ) : filteredPayments.map( payment => (
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
                      {formatMethod( payment.method )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {payment.transactionReference || "Manual"}
                  </TableCell>
                  <TableCell className="font-semibold tabular-nums">
                    {formatMoney( payment.amountCents, payment.currency )}
                  </TableCell>
                  <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date( payment.createdAt ).toLocaleDateString( "en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    } )}
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
                        {statusOptions.filter( option => option !== payment.status ).map( option => (
                          <DropdownMenuItem
                            key={option}
                            disabled={option === "paid" && payment.bookingStatus === "cancelled"}
                            onClick={() => updateStatus( payment, option )}
                            className="capitalize"
                          >
                            {option}
                          </DropdownMenuItem>
                        ) )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => removePayment( payment )}>
                          <Trash2 className="size-4" />
                          Delete record
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ) )}
            </TableBody>
          </Table>
        </div>
        {!loading && filteredPayments.length > 0 && (
          <div className="border-t px-6 py-3 text-xs text-muted-foreground">
            Showing {filteredPayments.length} of {payments.length} payment{payments.length === 1 ? "" : "s"}
          </div>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={open => {
        setDialogOpen( open );
        if ( !open ) resetForm();
      }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={recordPayment}>
            <DialogHeader>
              <DialogTitle>Record payment</DialogTitle>
              <DialogDescription>Add a customer payment or outstanding charge to the ledger.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-5">
              <div className="grid gap-1.5">
                <label className="text-xs font-medium" htmlFor="payment-booking">Booking</label>
                <Select value={bookingReference} onValueChange={selectBooking}>
                  <SelectTrigger id="payment-booking">
                    <SelectValue placeholder="Choose a booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map( booking => (
                      <SelectItem
                        key={booking.reference}
                        value={booking.reference}
                        disabled={booking.status === "cancelled"}
                      >
                        {booking.reference} · {booking.name}{booking.status === "cancelled" ? " · Cancelled" : ""}
                      </SelectItem>
                    ) )}
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
                    onChange={event => setAmount( event.target.value )}
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-xs font-medium">Status</label>
                  <Select value={status} onValueChange={value => setStatus( value as PaymentStatus )}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map( option => <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem> )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-medium">Payment method</label>
                <Select value={method} onValueChange={value => setMethod( value as PaymentMethod )}>
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
                  onChange={event => setTransactionReference( event.target.value )}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-xs font-medium" htmlFor="payment-notes">Notes</label>
                <textarea
                  id="payment-notes"
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="Optional internal note"
                  value={notes}
                  onChange={event => setNotes( event.target.value )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen( false )}>Cancel</Button>
              <Button type="submit" disabled={saving || !bookingReference}>
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
