"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/query-keys";
import {
  BadgePercent,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  TicketPercent,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Card, CardContent } from "@/components/admin-ui/card";
import { Checkbox } from "@/components/admin-ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/admin-ui/table";
import type { DiscountCode } from "./types";
import { EMPTY_FORM } from "./constants";
import { formatMoney, discountStatus } from "./utils";
import { StatusBadge } from "./components/status-badge";
import { UsageDialog } from "./components/usage-dialog";

export default function DiscountsPage() {
  const queryClient = useQueryClient();

  const { data: discountCodesData, isPending: loading } = useQuery( {
    queryKey: qk.discounts(),
    queryFn: async () => {
      const response = await fetch( "/api/admin/discount-codes" );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to load discount codes" );
      return data.discountCodes as DiscountCode[];
    },
  } );

  const discountCodes = discountCodesData ?? [];

  const [ saving, setSaving ] = useState( false );
  const [ dialogOpen, setDialogOpen ] = useState( false );
  const [ usageCode, setUsageCode ] = useState<DiscountCode | null>( null );
  const [ search, setSearch ] = useState( "" );
  const [ statusFilter, setStatusFilter ] = useState( "all" );
  const [ form, setForm ] = useState( EMPTY_FORM );

  const summary = useMemo( () => ( {
    totalCodes: discountCodes.length,
    activeCodes: discountCodes.filter( discount => discountStatus( discount ) === "active" ).length,
    redemptions: discountCodes.reduce( ( total, discount ) => total + discount.trackedRedemptions, 0 ),
    discountValue: discountCodes.reduce( ( total, discount ) => total + discount.totalDiscountCents, 0 ),
  } ), [ discountCodes ] );

  const filteredCodes = useMemo( () => {
    const query = search.trim().toLowerCase();
    return discountCodes.filter( discount => {
      const matchesSearch = !query
        || discount.code.toLowerCase().includes( query )
        || discount.label.toLowerCase().includes( query );
      const matchesStatus = statusFilter === "all" || discountStatus( discount ) === statusFilter;
      return matchesSearch && matchesStatus;
    } );
  }, [ discountCodes, search, statusFilter ] );

  const createDiscount = async ( event: React.FormEvent ) => {
    event.preventDefault();
    const value = Number( form.value );
    const maxRedemptions = form.maxRedemptions.trim() ? Number( form.maxRedemptions ) : null;
    const expiresAt = form.expiresAt.trim() ? new Date( form.expiresAt ).toISOString() : null;
    if (
      !form.code.trim()
      || !form.label.trim()
      || !Number.isFinite( value )
      || value <= 0
      || ( form.kind === "percent" && value > 100 )
      || ( maxRedemptions !== null && ( !Number.isInteger( maxRedemptions ) || maxRedemptions <= 0 ) )
    ) {
      toast.error( "Enter valid discount code details" );
      return;
    }

    setSaving( true );
    try {
      const response = await fetch( "/api/admin/discount-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {
          code: form.code,
          label: form.label,
          kind: form.kind,
          value: form.kind === "fixed" ? Math.round( value * 100 ) : Math.round( value ),
          active: form.active,
          maxRedemptions,
          expiresAt,
        } ),
      } );
      const data = await response.json();
      if ( !response.ok || !data.success ) throw new Error( data.error || "Failed to create discount code" );
      toast.success( `Discount code ${ data.discountCode.code } created` );
      setForm( EMPTY_FORM );
      setDialogOpen( false );
      queryClient.invalidateQueries( { queryKey: qk.discounts() } );
    } catch ( error ) {
      toast.error( error instanceof Error ? error.message : "Failed to create discount code" );
    } finally {
      setSaving( false );
    }
  };

  const toggleDiscount = async ( discount: DiscountCode ) => {
    const response = await fetch( "/api/admin/discount-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { id: discount.id, active: !discount.active } ),
    } );
    const data = await response.json();
    if ( !response.ok || !data.success ) {
      toast.error( data.error || "Failed to update discount code" );
      return;
    }
    toast.success( discount.active ? "Discount code disabled" : "Discount code enabled" );
    queryClient.invalidateQueries( { queryKey: qk.discounts() } );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pricing tools</p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">Discounts</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create promotional codes, control availability, and audit every booking that redeemed a discount.
          </p>
        </div>
        <Button onClick={ () => setDialogOpen( true ) }>
          <Plus className="size-4" />
          New discount
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Discount codes", value: summary.totalCodes, icon: TicketPercent },
          { label: "Active codes", value: summary.activeCodes, icon: CheckCircle2 },
          { label: "Tracked redemptions", value: summary.redemptions, icon: Users },
          { label: "Discounts granted", value: formatMoney( summary.discountValue ), icon: CircleDollarSign },
        ].map( item => (
          <Card key={item.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <item.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ) )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={ search }
                onChange={ event => setSearch( event.target.value ) }
                placeholder="Search code or campaign"
                className="pl-9"
              />
            </div>
            <Select value={ statusFilter } onValueChange={ value => setStatusFilter( value || "all" ) }>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="exhausted">Limit reached</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Discounted</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              { loading ? Array.from( { length: 4 } ).map( ( _, index ) => (
                <TableRow key={index}>
                  <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                </TableRow>
              ) ) : filteredCodes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                    {discountCodes.length === 0 ? "No discount codes have been created." : "No discount codes match these filters."}
                  </TableCell>
                </TableRow>
              ) : filteredCodes.map( discount => (
                <TableRow key={discount.id}>
                  <TableCell>
                    <button type="button" className="text-left" onClick={ () => setUsageCode( discount ) }>
                      <p className="font-mono text-sm font-semibold">{discount.code}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{discount.label}</p>
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    {discount.kind === "percent" ? `${discount.value}%` : formatMoney( discount.value )}
                  </TableCell>
                  <TableCell><StatusBadge discount={discount} /></TableCell>
                  <TableCell>
                    <button type="button" onClick={ () => setUsageCode( discount ) } className="font-medium hover:underline">
                      {discount.trackedRedemptions}
                      {discount.maxRedemptions !== null ? ` / ${discount.maxRedemptions}` : ""}
                    </button>
                    {discount.redemptions !== discount.trackedRedemptions && (
                      <p className="text-[11px] text-muted-foreground">{discount.redemptions} claimed</p>
                    )}
                  </TableCell>
                  <TableCell>{formatMoney( discount.totalDiscountCents )}</TableCell>
                  <TableCell>{formatMoney( discount.totalRevenueCents )}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {discount.expiresAt
                      ? new Date( discount.expiresAt ).toLocaleDateString( "en-US", { month: "short", day: "numeric", year: "numeric" } )
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${discount.code}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={ () => setUsageCode( discount ) }>View usage</DropdownMenuItem>
                        <DropdownMenuItem onClick={ () => toggleDiscount( discount ) }>
                          {discount.active ? "Disable code" : "Enable code"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ) ) }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={createDiscount}>
            <DialogHeader>
              <DialogTitle>Create discount code</DialogTitle>
              <DialogDescription>Set the discount, availability, redemption limit, and optional expiration.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-5 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Code</span>
                <Input value={form.code} onChange={event => setForm( current => ( { ...current, code: event.target.value } ) )} placeholder="SAVE10" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Campaign name</span>
                <Input value={form.label} onChange={event => setForm( current => ( { ...current, label: event.target.value } ) )} placeholder="Summer campaign" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Discount type</span>
                <Select value={form.kind} onValueChange={value => setForm( current => ( { ...current, kind: value as "percent" | "fixed" } ) )}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed amount</SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">{form.kind === "percent" ? "Percent off" : "Dollars off"}</span>
                <Input type="number" min={0} step={form.kind === "percent" ? 1 : 0.01} value={form.value} onChange={event => setForm( current => ( { ...current, value: event.target.value } ) )} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Redemption limit</span>
                <Input type="number" min={1} step={1} value={form.maxRedemptions} onChange={event => setForm( current => ( { ...current, maxRedemptions: event.target.value } ) )} placeholder="Unlimited" />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Expires at</span>
                <Input type="datetime-local" value={form.expiresAt} onChange={event => setForm( current => ( { ...current, expiresAt: event.target.value } ) )} />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <Checkbox checked={form.active} onCheckedChange={checked => setForm( current => ( { ...current, active: checked === true } ) )} />
                Make this code active immediately
              </label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={ () => setDialogOpen( false ) }>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : <BadgePercent className="size-4" />}
                Create code
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UsageDialog usageCode={usageCode} onClose={() => setUsageCode( null )} />
    </div>
  );
}
