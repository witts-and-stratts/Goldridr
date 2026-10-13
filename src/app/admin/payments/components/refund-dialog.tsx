"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Checkbox } from "@/components/admin-ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin-ui/dialog";
import { Input } from "@/components/admin-ui/input";
import type { Payment, PaymentLeg } from "../types";
import { formatMoney } from "../utils";

export interface RefundRequest {
  legs: PaymentLeg["leg"][];
  amountCents?: number;
}

type RefundChoice = "full" | "outbound" | "return" | "custom";

interface RefundDialogProps {
  payment: Payment | null;
  onClose: () => void;
  onSubmit: ( payment: Payment, request: RefundRequest ) => Promise<boolean>;
}

function legDate( leg: PaymentLeg ) {
  if ( !leg.date ) return "";
  const date = new Date( `${ leg.date }T${ leg.time || "12:00" }` );
  return Number.isNaN( date.getTime() ) ? leg.date : date.toLocaleString( "en-US", { dateStyle: "medium", timeStyle: leg.time ? "short" : undefined } );
}

export function RefundDialog( { payment, onClose, onSubmit }: RefundDialogProps ) {
  return (
    <Dialog open={ Boolean( payment ) } onOpenChange={ open => { if ( !open ) onClose(); } }>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg">
        { payment ? <RefundForm key={ payment.id } payment={ payment } onClose={ onClose } onSubmit={ onSubmit } /> : null }
      </DialogContent>
    </Dialog>
  );
}

function RefundForm( { payment, onClose, onSubmit }: { payment: Payment; onClose: () => void; onSubmit: RefundDialogProps[ "onSubmit" ] } ) {
  const remainingCents = Math.max( 0, payment.amountCents - ( payment.refundedCents || 0 ) );
  const legs = payment.legs ?? [];
  const legDefault = ( leg: PaymentLeg ) => Math.min( leg.chargedCents, remainingCents );
  const defaultFor = ( choice: RefundChoice ) => {
    const leg = legs.find( item => item.leg === choice );
    return leg ? legDefault( leg ) : remainingCents;
  };
  const [ choice, setChoice ] = useState<RefundChoice>( "full" );
  const [ amount, setAmount ] = useState( ( remainingCents / 100 ).toFixed( 2 ) );
  const [ manualConfirmed, setManualConfirmed ] = useState( false );
  const [ submitting, setSubmitting ] = useState( false );

  const amountCents = Math.round( Number( amount ) * 100 );
  const amountValid = Number.isFinite( amountCents ) && amountCents > 0 && amountCents <= remainingCents;
  const needsManualConfirmation = payment.provider === "manual";

  const choose = ( next: RefundChoice ) => {
    setChoice( next );
    setAmount( ( defaultFor( next ) / 100 ).toFixed( 2 ) );
  };

  const submit = async () => {
    if ( !amountValid || ( needsManualConfirmation && !manualConfirmed ) ) return;
    setSubmitting( true );
    const request: RefundRequest = choice === "full"
      ? { legs: [] }
      : { legs: choice === "custom" ? [] : [ choice ], amountCents };
    const done = await onSubmit( payment, request );
    setSubmitting( false );
    if ( done ) onClose();
  };

  const options: Array<{ value: RefundChoice; label: string; description: string; disabled?: boolean }> = [
    { value: "full", label: "Full refund", description: `Refunds ${ formatMoney( remainingCents, payment.currency ) } and cancels the whole booking.` },
    ...legs.map( leg => ( {
      value: leg.leg as RefundChoice,
      label: `Refund ${ leg.leg } leg`,
      description: leg.active
        ? `Cancels the ${ leg.leg } ride${ legDate( leg ) ? ` on ${ legDate( leg ) }` : "" }. Paid for this leg: ${ formatMoney( leg.chargedCents, payment.currency ) }.`
        : `The ${ leg.leg } leg is already cancelled.`,
      disabled: !leg.active || legDefault( leg ) <= 0,
    } ) ),
    { value: "custom", label: "Partial amount", description: "Refunds an amount without cancelling any ride." },
  ];

  return (
    <>
      <DialogHeader>
        <DialogTitle>Refund payment</DialogTitle>
        <DialogDescription>
          Booking <span className="font-mono text-foreground">{ payment.bookingReference }</span> · paid { formatMoney( payment.amountCents, payment.currency ) }
          { payment.refundedCents ? <> · already refunded { formatMoney( payment.refundedCents, payment.currency ) }</> : null }
        </DialogDescription>
      </DialogHeader>

      <fieldset className="grid gap-2" disabled={ submitting }>
        <legend className="sr-only">What to refund</legend>
        { options.map( option => (
          <label
            key={ option.value }
            className={ `flex cursor-pointer gap-3 rounded-md border p-3 text-sm transition-colors has-[:checked]:border-foreground/40 has-[:checked]:bg-muted/40 ${ option.disabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted/30" }` }
          >
            <input
              type="radio"
              name="refund-choice"
              className="mt-0.5 accent-current"
              value={ option.value }
              checked={ choice === option.value }
              disabled={ option.disabled }
              onChange={ () => choose( option.value ) }
            />
            <span className="min-w-0">
              <span className="block font-medium">{ option.label }</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{ option.description }</span>
            </span>
          </label>
        ) ) }
      </fieldset>

      { choice !== "full" ? (
        <div className="grid gap-1.5">
          <label htmlFor="refund-amount" className="text-sm font-medium">Refund amount</label>
          <Input
            id="refund-amount"
            type="number"
            inputMode="decimal"
            min={ 0.01 }
            max={ remainingCents / 100 }
            step="0.01"
            value={ amount }
            onChange={ event => setAmount( event.target.value ) }
            disabled={ submitting }
          />
          <p className={ `text-xs ${ amountValid ? "text-muted-foreground" : "text-destructive" }` }>
            { amountValid ? `Up to ${ formatMoney( remainingCents, payment.currency ) } can still be refunded.` : `Enter an amount between $0.01 and ${ formatMoney( remainingCents, payment.currency ) }.` }
          </p>
        </div>
      ) : null }

      { needsManualConfirmation ? (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={ manualConfirmed } onCheckedChange={ checked => setManualConfirmed( checked === true ) } disabled={ submitting } className="mt-0.5" />
          <span>I have sent this refund to the customer through Zelle.</span>
        </label>
      ) : null }

      <DialogFooter>
        <Button variant="outline" onClick={ onClose } disabled={ submitting }>Cancel</Button>
        <Button variant="destructive" onClick={ submit } disabled={ submitting || !amountValid || ( needsManualConfirmation && !manualConfirmed ) }>
          { submitting ? <Loader2 className="animate-spin" /> : <RotateCcw /> }
          Refund { formatMoney( choice === "full" ? remainingCents : amountValid ? amountCents : 0, payment.currency ) }
        </Button>
      </DialogFooter>
    </>
  );
}
