"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Clock3, ExternalLink, Loader2, XCircle } from "lucide-react";

type Payment = {
  status: string;
  method: string;
  provider: string;
  amountCents: number;
  currency: string;
  paymentReference: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  cardExpiryMonth: number | null;
  cardExpiryYear: number | null;
  walletType: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  failureMessage: string | null;
};

type Confirmation = {
  reference: string;
  status: string;
  totalCents: number;
  currency: string;
  payment: Payment | null;
};

function money( cents: number, currency: string ) {
  return new Intl.NumberFormat( "en-US", { style: "currency", currency } ).format( cents / 100 );
}

function methodLabel( payment: Payment ) {
  if ( payment.cardLast4 ) return `${ payment.cardBrand || "Card" } ending in ${ payment.cardLast4 }`;
  if ( payment.walletType ) return payment.walletType.replaceAll( "_", " " );
  return payment.method.replaceAll( "_", " " );
}

export function PaymentConfirmationClient( { token }: { token: string } ) {
  const [ confirmation, setConfirmation ] = useState<Confirmation | null>( null );
  const [ error, setError ] = useState( "" );

  const load = useCallback( async () => {
    const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }`, { cache: "no-store" } );
    const data = await response.json().catch( () => ( {} ) );
    if ( !response.ok || !data.success ) throw new Error( data.error || "Unable to verify this payment" );
    setConfirmation( data.checkout as Confirmation );
    setError( "" );
    return data.checkout as Confirmation;
  }, [ token ] );

  useEffect( () => {
    let stopped = false;
    let timer = 0;
    const poll = async () => {
      try {
        const current = await load();
        const terminal = current.payment?.status === "paid" || current.payment?.status === "failed" || current.payment?.status === "refunded" || [ "confirmed", "cancelled", "rejected", "payment_expired" ].includes( current.status );
        if ( !stopped && !terminal ) timer = window.setTimeout( poll, 2000 );
      } catch ( cause ) {
        if ( !stopped ) {
          setError( cause instanceof Error ? cause.message : "Unable to verify this payment" );
          timer = window.setTimeout( poll, 3000 );
        }
      }
    };
    poll();
    return () => { stopped = true; window.clearTimeout( timer ); };
  }, [ load ] );

  if ( error && !confirmation ) return <ConfirmationShell icon={ XCircle } title="We could not verify this payment" body={ error } />;
  if ( !confirmation ) return <ConfirmationShell icon={ Loader2 } title="Confirming your payment" body="Please keep this page open while we receive secure confirmation from the payment provider." spinning />;

  const payment = confirmation.payment;
  if ( payment?.status === "failed" || [ "cancelled", "rejected", "payment_expired" ].includes( confirmation.status ) ) {
    return <ConfirmationShell icon={ XCircle } title="Payment was not completed" body={ payment?.failureMessage || "The payment provider did not complete this payment. Please return to your payment link or contact us for help." } />;
  }

  if ( payment?.status !== "paid" || confirmation.status !== "confirmed" ) {
    return <ConfirmationShell icon={ Clock3 } title="Payment is processing" body="Your payment was submitted and is awaiting verified confirmation. This page will update automatically." />;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-black px-5 py-12 text-white">
      <section className="w-full max-w-xl border-y border-white/10 py-10">
        <Check className="size-10 text-[#C29E66]" />
        <p className="mt-7 font-wide text-xs uppercase tracking-[0.16em] text-[#C29E66]">Payment confirmed</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight md:text-5xl">Your ride is confirmed.</h1>
        <p className="mt-4 text-sm leading-6 text-white/60">We received your payment and sent your booking confirmation.</p>
        <dl className="mt-9 divide-y divide-white/10 border-y border-white/10 text-sm">
          <Detail label="Booking" value={ confirmation.reference } mono />
          <Detail label="Amount" value={ money( payment.amountCents, payment.currency ) } />
          <Detail label="Payment method" value={ methodLabel( payment ) } capitalize />
          { payment.cardExpiryMonth && payment.cardExpiryYear ? <Detail label="Card expiry" value={ `${ String( payment.cardExpiryMonth ).padStart( 2, "0" ) }/${ String( payment.cardExpiryYear ).slice( -2 ) }` } /> : null }
          <Detail label="Payment reference" value={ payment.paymentReference || "Recorded" } mono />
          <Detail label="Provider" value={ payment.provider } capitalize />
          { payment.paidAt ? <Detail label="Paid" value={ new Date( payment.paidAt ).toLocaleString( "en-US", { dateStyle: "medium", timeStyle: "short" } ) } /> : null }
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="inline-flex h-11 items-center bg-[#C29E66] px-6 font-wide text-xs uppercase tracking-[0.12em] text-black hover:bg-[#d1b17c]">Return home</Link>
          { payment.receiptUrl ? <a href={ payment.receiptUrl } target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 border border-white/20 px-6 font-wide text-xs uppercase tracking-[0.12em] text-white hover:border-[#C29E66]"><ExternalLink className="size-3.5" />Provider receipt</a> : null }
        </div>
      </section>
    </main>
  );
}

function Detail( { label, value, mono = false, capitalize = false }: { label: string; value: string; mono?: boolean; capitalize?: boolean } ) {
  return <div className="grid grid-cols-[8rem_1fr] gap-4 py-4"><dt className="text-xs uppercase tracking-[0.12em] text-white/40">{ label }</dt><dd className={`text-right text-white/80 ${ mono ? "font-mono text-xs" : "" } ${ capitalize ? "capitalize" : "" }`}>{ value }</dd></div>;
}

function ConfirmationShell( { icon: Icon, title, body, spinning = false }: { icon: typeof Check; title: string; body: string; spinning?: boolean } ) {
  return <main className="grid min-h-screen place-items-center bg-black px-5 text-white"><section className="max-w-xl border-y border-white/10 py-12 text-center"><Icon className={`mx-auto size-10 text-[#C29E66] ${ spinning ? "animate-spin" : "" }`} /><h1 className="mt-7 font-serif text-4xl">{ title }</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/60">{ body }</p>{ !spinning ? <Link href="/" className="mt-8 inline-flex h-11 items-center border border-[#C29E66]/60 px-6 font-wide text-xs uppercase tracking-[0.12em] text-[#C29E66] hover:bg-[#C29E66] hover:text-black">Return home</Link> : null }</section></main>;
}
