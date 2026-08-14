"use client";

import { useState } from "react";
import { Banknote, CreditCard, ExternalLink, Landmark, Loader2, RotateCcw, WalletCards } from "lucide-react";
import { siAmericanexpress, siApplepay, siCashapp, siDiscover, siMastercard, siPaypal, siSquare, siStripe, siVenmo, siVisa, siZelle, type SimpleIcon } from "simple-icons";
import { Button } from "@/components/admin-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import type { Payment } from "../types";
import { formatMethod, formatMoney } from "../utils";
import { PaymentStatusBadge } from "./payment-status-badge";

interface PaymentTransactionDialogProps {
  payment: Payment | null;
  onClose: () => void;
  onRefund: ( payment: Payment ) => Promise<boolean>;
}

function formatDate( value: string | null ) {
  if ( !value ) return "—";
  return new Date( value ).toLocaleString( "en-US", { dateStyle: "medium", timeStyle: "short" } );
}

function processorResponse( value: unknown ) {
  if ( value === null || value === undefined ) return "";
  if ( typeof value === "object" && !Array.isArray( value ) && Object.keys( value as Record<string, unknown> ).length === 0 ) return "";
  return JSON.stringify( value, null, 2 ) || "";
}

const PROCESSOR_MARKS: Record<Payment["provider"], { label: string; icon: SimpleIcon | null }> = {
  stripe: { label: "Stripe", icon: siStripe },
  square: { label: "Square", icon: siSquare },
  paypal: { label: "PayPal", icon: siPaypal },
  manual: { label: "Manual", icon: null },
};

function ProcessorMark( { provider }: { provider: Payment["provider"] } ) {
  const mark = PROCESSOR_MARKS[ provider ];
  return <span className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-2.5 text-sm font-medium text-foreground" aria-label={ `${ mark.label } processor` }>{ mark.icon ? <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="currentColor"><path d={ mark.icon.path } /></svg> : <Landmark aria-hidden="true" className="size-4" /> }<span>{ mark.label }</span></span>;
}

function BrandGlyph( { icon }: { icon: SimpleIcon } ) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor"><path d={ icon.path } /></svg>;
}

function PaymentMethodValue( { payment }: { payment: Payment } ) {
  const brand = payment.cardBrand?.toLowerCase().replaceAll( /[\s-]+/g, "_" );
  const cardIcon = brand === "visa" ? siVisa : brand === "mastercard" ? siMastercard : [ "amex", "american_express" ].includes( brand || "" ) ? siAmericanexpress : brand === "discover" ? siDiscover : null;
  const methodIcon = payment.method === "zelle" ? siZelle : payment.method === "apple_pay" ? siApplepay : payment.method === "cash_app" ? siCashapp : payment.method === "venmo" ? siVenmo : payment.method === "card" ? cardIcon : null;
  const fallback = payment.method === "cash" ? <Banknote aria-hidden="true" className="size-4 shrink-0" /> : payment.method === "bank_transfer" ? <Landmark aria-hidden="true" className="size-4 shrink-0" /> : payment.method === "other" ? <WalletCards aria-hidden="true" className="size-4 shrink-0" /> : <CreditCard aria-hidden="true" className="size-4 shrink-0" />;
  return <span className="inline-flex items-center gap-2">{ methodIcon ? <BrandGlyph icon={ methodIcon } /> : fallback }<span>{ formatMethod( payment.method ) }</span></span>;
}

export function PaymentTransactionDialog( { payment, onClose, onRefund }: PaymentTransactionDialogProps ) {
  const [ refunding, setRefunding ] = useState( false );
  const rawResponse = processorResponse( payment?.providerMetadata );

  const refund = async () => {
    if ( !payment ) return;
    setRefunding( true );
    const refunded = await onRefund( payment );
    setRefunding( false );
    if ( refunded ) onClose();
  };

  return (
    <Dialog open={ Boolean( payment ) } onOpenChange={ open => { if ( !open && !refunding ) onClose(); } }>
      <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0">
        { payment ? <>
          <DialogHeader className="border-b px-6 py-5 pr-14">
            <div className="flex items-start gap-3">
              <ProcessorMark provider={ payment.provider } />
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-3">
                  <DialogTitle>Payment transaction</DialogTitle>
                  <PaymentStatusBadge status={ payment.status } />
                </div>
                <DialogDescription className="mt-1.5">
                  Booking <span className="font-mono text-foreground">{ payment.bookingReference }</span> · { payment.provider === "manual" ? "Manually recorded" : `Processed by ${ payment.provider }` }
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <section aria-labelledby="transaction-summary-heading">
              <h3 id="transaction-summary-heading" className="text-sm font-semibold">Transaction summary</h3>
              <dl className="mt-3 grid border sm:grid-cols-2 lg:grid-cols-4">
                <Detail label="Amount" value={ formatMoney( payment.amountCents, payment.currency ) } />
                <Detail label="Method" value={ <PaymentMethodValue payment={ payment } /> } />
                <Detail label="Customer" value={ payment.customerName } secondary={ payment.customerEmail } />
                <Detail label="Paid" value={ formatDate( payment.paidAt ) } />
              </dl>
            </section>

            <section className="mt-6" aria-labelledby="processor-identifiers-heading">
              <h3 id="processor-identifiers-heading" className="text-sm font-semibold">Processor identifiers</h3>
              <dl className="mt-3 divide-y border">
                <Identifier label="Payment reference" value={ payment.transactionReference } />
                <Identifier label="Checkout / order ID" value={ payment.externalId } />
                <Identifier label="Idempotency key" value={ payment.idempotencyKey } />
                { payment.confirmationReference ? <Identifier label="Customer confirmation" value={ payment.confirmationReference } /> : null }
              </dl>
            </section>

            { payment.cardLast4 || payment.walletType ? <section className="mt-6" aria-labelledby="payment-instrument-heading">
              <h3 id="payment-instrument-heading" className="text-sm font-semibold">Payment instrument</h3>
              <dl className="mt-3 grid border sm:grid-cols-3">
                <Detail label="Card / wallet" value={ payment.cardLast4 ? `${ payment.cardBrand || "Card" } •••• ${ payment.cardLast4 }` : payment.walletType?.replaceAll( "_", " " ) || "—" } capitalize />
                <Detail label="Expiry" value={ payment.cardExpiryMonth && payment.cardExpiryYear ? `${ String( payment.cardExpiryMonth ).padStart( 2, "0" ) }/${ String( payment.cardExpiryYear ).slice( -2 ) }` : "—" } />
                <Detail label="Provider" value={ payment.provider } capitalize />
              </dl>
            </section> : null }

            { payment.failureCode || payment.failureMessage ? <section className="mt-6" aria-labelledby="failure-heading">
              <h3 id="failure-heading" className="text-sm font-semibold text-destructive">Processor failure</h3>
              <div className="mt-3 border border-destructive/30 bg-destructive/5 p-4 text-sm">
                { payment.failureCode ? <p className="font-mono text-xs text-destructive">{ payment.failureCode }</p> : null }
                <p className={ payment.failureCode ? "mt-2 text-muted-foreground" : "text-muted-foreground" }>{ payment.failureMessage }</p>
              </div>
            </section> : null }

            <section className="mt-6" aria-labelledby="processor-response-heading">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 id="processor-response-heading" className="text-sm font-semibold">Full processor response</h3>
                  <p className="mt-1 text-xs text-muted-foreground">The original transaction object stored when the payment status was verified.</p>
                </div>
                { payment.receiptUrl ? <Button asChild variant="outline" size="sm"><a href={ payment.receiptUrl } target="_blank" rel="noreferrer"><ExternalLink />Receipt</a></Button> : null }
              </div>
              { rawResponse ? <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-all border bg-muted/30 p-4 font-mono text-xs leading-5 text-foreground">{ rawResponse }</pre> : <div className="mt-3 border border-dashed p-5 text-sm text-muted-foreground">No processor response is stored for this payment.</div> }
            </section>
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={ onClose } disabled={ refunding }>Close</Button>
            { payment.status === "paid" ? <Button variant="destructive" onClick={ refund } disabled={ refunding }>{ refunding ? <Loader2 className="animate-spin" /> : <RotateCcw /> }Refund payment</Button> : null }
          </DialogFooter>
        </> : null }
      </DialogContent>
    </Dialog>
  );
}

function Detail( { label, value, secondary, capitalize = false }: { label: string; value: React.ReactNode; secondary?: string; capitalize?: boolean } ) {
  return <div className="min-w-0 border-b p-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"><dt className="text-xs text-muted-foreground">{ label }</dt><dd className={`mt-1 truncate text-sm font-medium ${ capitalize ? "capitalize" : "" }`}>{ value }</dd>{ secondary ? <dd className="mt-0.5 truncate text-xs text-muted-foreground">{ secondary }</dd> : null }</div>;
}

function Identifier( { label, value }: { label: string; value: string | null } ) {
  return <div className="grid gap-1 px-4 py-3 sm:grid-cols-[11rem_1fr] sm:gap-4"><dt className="text-xs text-muted-foreground">{ label }</dt><dd className="break-all font-mono text-xs text-foreground">{ value || "—" }</dd></div>;
}
