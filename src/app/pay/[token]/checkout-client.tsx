"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronRight, Clock3, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { siApplepay, siCashapp, siMastercard, siVenmo, siVisa, siZelle, type SimpleIcon } from "simple-icons";
import { InteractiveRouteMap } from "@/components/booking/InteractiveRouteMap";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Method = "card" | "apple_pay" | "cash_app" | "venmo" | "zelle";
type Checkout = {
  reference: string;
  status: string;
  date: string;
  time: string;
  tripType: string;
  pickup: string;
  destination: string;
  distance: string | number;
  driveTime: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  holdExpiresAt: string | null;
  enabledMethods: Method[];
  activeProcessor: "stripe" | "square";
  zelleRecipient: string;
  zelleInstructions: string;
  square: { applicationId: string; locationId: string; environment: "production" | "sandbox" } | null;
  paypal: { clientId: string; environment: "production" | "sandbox" } | null;
  credentialHealth: { stripe: boolean; square: boolean; paypal: boolean };
};

type SquareTokenResult = { status: string; token?: string; errors?: Array<{ message?: string }> };
type SquarePaymentMethod = { attach?: ( target: string ) => Promise<void>; tokenize?: ( details?: unknown ) => Promise<SquareTokenResult>; addEventListener?: ( name: string, listener: ( event: { detail: { tokenResult: SquareTokenResult; error?: unknown } } ) => void ) => void };
type SquarePayments = { paymentRequest: ( options: unknown ) => unknown; card: () => Promise<SquarePaymentMethod>; applePay: ( request: unknown ) => Promise<SquarePaymentMethod>; cashAppPay: ( request: unknown, options: unknown ) => Promise<SquarePaymentMethod> };
type PayPalButtons = { isEligible: () => boolean; render: ( target: string ) => Promise<void> };

declare global {
  interface Window {
    Square?: { payments: ( appId: string, locationId: string ) => SquarePayments };
    paypal?: { FUNDING: { VENMO: string }; Buttons: ( options: Record<string, unknown> ) => PayPalButtons };
  }
}

const METHODS: Record<Method, { label: string; detail: string }> = {
  card: { label: "Credit or debit card", detail: "Secure card checkout" },
  apple_pay: { label: "Apple Pay", detail: "Available on eligible Apple devices" },
  cash_app: { label: "Cash App Pay", detail: "Authorize with Cash App" },
  venmo: { label: "Venmo", detail: "Authorize in Venmo or by QR code" },
  zelle: { label: "Zelle", detail: "Send through your bank, then submit the reference" },
};

function BrandIcon( { icon, className = "size-5" }: { icon: SimpleIcon; className?: string } ) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={ className } fill="currentColor"><path d={ icon.path } /></svg>;
}

function PaymentMethodIcon( { method }: { method: Method } ) {
  if ( method === "card" ) {
    return <span aria-hidden="true" className="flex items-center gap-1">
      <BrandIcon icon={ siVisa } className="h-3.5 w-6" />
      <BrandIcon icon={ siMastercard } className="size-4" />
    </span>;
  }
  const icon = { apple_pay: siApplepay, cash_app: siCashapp, venmo: siVenmo, zelle: siZelle }[ method ];
  return <BrandIcon icon={ icon } className={ method === "apple_pay" ? "h-5 w-7" : "size-5" } />;
}

function money( cents: number, currency: string ) {
  return new Intl.NumberFormat( "en-US", { style: "currency", currency } ).format( cents / 100 );
}

function distanceLabel( distance: string | number ) {
  if ( distance === "" ) return "";
  if ( typeof distance === "number" ) return `${ Math.round( distance ) } mi`;
  const numeric = Number.parseFloat( distance );
  return Number.isFinite( numeric ) ? `${ Math.round( numeric ) } mi` : distance;
}

function loadScript( id: string, src: string ): Promise<void> {
  const existing = document.getElementById( id ) as HTMLScriptElement | null;
  if ( existing?.dataset.loaded === "true" ) return Promise.resolve();
  return new Promise( ( resolve, reject ) => {
    const script = existing || document.createElement( "script" );
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => { script.dataset.loaded = "true"; resolve(); };
    script.onerror = () => reject( new Error( "The secure payment service could not be loaded" ) );
    if ( !existing ) document.head.appendChild( script );
  } );
}

export function CheckoutClient( { token }: { token: string } ) {
  const [ checkout, setCheckout ] = useState<Checkout | null>( null );
  const [ selected, setSelected ] = useState<Method | null>( null );
  const [ loading, setLoading ] = useState( true );
  const [ submitting, setSubmitting ] = useState( false );
  const [ error, setError ] = useState( "" );
  const [ seconds, setSeconds ] = useState( 0 );
  const [ senderName, setSenderName ] = useState( "" );
  const [ confirmationReference, setConfirmationReference ] = useState( "" );
  const [ zelleOpen, setZelleOpen ] = useState( false );
  const squareMethod = useRef<SquarePaymentMethod | null>( null );
  const paypalRendered = useRef( false );

  const loadCheckout = useCallback( async () => {
    const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }`, { cache: "no-store" } );
    const data = await response.json().catch( () => ( {} ) );
    if ( !response.ok || !data.success ) throw new Error( data.error || "This payment link is unavailable" );
    const expiresAt = data.checkout.holdExpiresAt ? new Date( data.checkout.holdExpiresAt ).getTime() : 0;
    setSeconds( expiresAt ? Math.max( 0, Math.floor( ( expiresAt - Date.now() ) / 1000 ) ) : 0 );
    setCheckout( data.checkout );
    return data.checkout as Checkout;
  }, [ token ] );

  useEffect( () => {
    const timer = window.setTimeout( () => {
      loadCheckout().catch( cause => setError( cause instanceof Error ? cause.message : "Unable to load checkout" ) ).finally( () => setLoading( false ) );
    }, 0 );
    return () => window.clearTimeout( timer );
  }, [ loadCheckout ] );
  useEffect( () => {
    if ( !checkout?.holdExpiresAt ) return;
    const update = () => setSeconds( Math.max( 0, Math.floor( ( new Date( checkout.holdExpiresAt! ).getTime() - Date.now() ) / 1000 ) ) );
    update();
    const timer = window.setInterval( update, 1000 );
    return () => window.clearInterval( timer );
  }, [ checkout?.holdExpiresAt ] );

  const pollForConfirmation = useCallback( async () => {
    for ( let attempt = 0; attempt < 30; attempt++ ) {
      const current = await loadCheckout();
      if ( [ "confirmed", "payment_review", "payment_expired", "cancelled" ].includes( current.status ) ) return;
      await new Promise( resolve => window.setTimeout( resolve, 2000 ) );
    }
  }, [ loadCheckout ] );

  useEffect( () => {
    if ( new URLSearchParams( window.location.search ).get( "payment" ) === "success" ) {
      const timer = window.setTimeout( () => pollForConfirmation().catch( cause => setError( cause instanceof Error ? cause.message : "Unable to verify payment" ) ), 0 );
      return () => window.clearTimeout( timer );
    }
  }, [ pollForConfirmation ] );

  const processSquareSource = useCallback( async ( method: Method, sourceId: string ) => {
    const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }/square`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { method, sourceId } ) } );
    const data = await response.json();
    if ( !response.ok ) throw new Error( data.error || "Square could not complete the payment" );
    await pollForConfirmation();
  }, [ pollForConfirmation, token ] );

  useEffect( () => {
    squareMethod.current = null;
    if ( !checkout || checkout.activeProcessor !== "square" || !checkout.square || !selected || ![ "card", "apple_pay", "cash_app" ].includes( selected ) ) return;
    let cancelled = false;
    const initialize = async () => {
      setError( "" );
      const scriptUrl = checkout.square!.environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
      await loadScript( "square-web-payments", scriptUrl );
      const payments = window.Square!.payments( checkout.square!.applicationId, checkout.square!.locationId );
      const request = payments.paymentRequest( { countryCode: "US", currencyCode: "USD", total: { amount: ( checkout.totalCents / 100 ).toFixed( 2 ), label: `Booking ${ checkout.reference }` } } );
      const method = selected === "card" ? await payments.card() : selected === "apple_pay" ? await payments.applePay( request ) : await payments.cashAppPay( request, { redirectURL: window.location.href, referenceId: checkout.reference } );
      if ( cancelled ) return;
      squareMethod.current = method;
      if ( selected === "card" && method.attach ) await method.attach( "#square-card" );
      if ( selected === "cash_app" && method.attach ) {
        method.addEventListener?.( "ontokenization", event => {
          const result = event.detail.tokenResult;
          if ( result.status !== "OK" || !result.token ) { setError( result.errors?.[ 0 ]?.message || "Cash App authorization failed" ); return; }
          setSubmitting( true );
          processSquareSource( "cash_app", result.token ).catch( cause => setError( cause instanceof Error ? cause.message : "Cash App payment failed" ) ).finally( () => setSubmitting( false ) );
        } );
        await method.attach( "#square-cash-app" );
      }
    };
    initialize().catch( cause => setError( cause instanceof Error ? cause.message : "Square is unavailable" ) );
    return () => { cancelled = true; };
  }, [ checkout, processSquareSource, selected ] );

  useEffect( () => {
    if ( selected !== "venmo" || !checkout?.paypal || paypalRendered.current ) return;
    const src = `https://www.paypal.com/sdk/js?client-id=${ encodeURIComponent( checkout.paypal.clientId ) }&currency=USD&components=buttons&enable-funding=venmo`;
    loadScript( "paypal-checkout", src ).then( () => {
      const paypal = window.paypal!;
      const buttons = paypal.Buttons( {
        fundingSource: paypal.FUNDING.VENMO,
        createOrder: async () => {
          const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { method: "venmo" } ) } );
          const data = await response.json();
          if ( !response.ok ) throw new Error( data.error || "Unable to start Venmo" );
          return data.orderId;
        },
        onApprove: async ( data: { orderID?: string } ) => {
          setSubmitting( true );
          const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }/paypal-capture`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { orderId: data.orderID } ) } );
          if ( !response.ok ) throw new Error( "Venmo could not be captured" );
          await pollForConfirmation();
          setSubmitting( false );
        },
        onError: ( cause: unknown ) => setError( cause instanceof Error ? cause.message : "Venmo could not complete the payment" ),
      } );
      if ( !buttons.isEligible() ) { setError( "Venmo is not eligible on this device or account." ); return; }
      paypalRendered.current = true;
      return buttons.render( "#venmo-button" );
    } ).catch( cause => setError( cause instanceof Error ? cause.message : "Venmo is unavailable" ) );
  }, [ checkout?.paypal, pollForConfirmation, selected, token ] );

  const onlinePay = async () => {
    if ( !checkout || !selected || selected === "venmo" || selected === "zelle" ) return;
    setSubmitting( true );
    setError( "" );
    try {
      if ( checkout.activeProcessor === "square" ) {
        if ( !squareMethod.current?.tokenize ) throw new Error( "The payment control is still loading" );
        const tokenResult = await squareMethod.current.tokenize( selected === "card" ? { amount: ( checkout.totalCents / 100 ).toFixed( 2 ), currencyCode: "USD", intent: "CHARGE", customerInitiated: true, sellerKeyedIn: false } : undefined );
        if ( tokenResult.status !== "OK" || !tokenResult.token ) throw new Error( tokenResult.errors?.[ 0 ]?.message || "Payment authorization failed" );
        await processSquareSource( selected, tokenResult.token );
        return;
      }
      const sessionResponse = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { method: selected } ) } );
      const session = await sessionResponse.json();
      if ( !sessionResponse.ok ) throw new Error( session.error || "Unable to start payment" );
      if ( session.provider === "stripe" ) { window.location.assign( session.redirectUrl ); return; }
    } catch ( cause ) { setError( cause instanceof Error ? cause.message : "Payment could not be completed" ); }
    finally { setSubmitting( false ); }
  };

  const submitZelle = async ( event: React.FormEvent ) => {
    event.preventDefault();
    setSubmitting( true ); setError( "" );
    try {
      const response = await fetch( `/api/payments/checkout/${ encodeURIComponent( token ) }/zelle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify( { senderName, confirmationReference } ) } );
      const data = await response.json();
      if ( !response.ok ) throw new Error( data.error || "Unable to submit Zelle payment" );
      setZelleOpen( false );
      await loadCheckout();
    } catch ( cause ) { setError( cause instanceof Error ? cause.message : "Unable to submit Zelle payment" ); }
    finally { setSubmitting( false ); }
  };

  const countdown = useMemo( () => `${ String( Math.floor( seconds / 3600 ) ).padStart( 2, "0" ) }:${ String( Math.floor( seconds % 3600 / 60 ) ).padStart( 2, "0" ) }:${ String( seconds % 60 ).padStart( 2, "0" ) }`, [ seconds ] );

  if ( loading ) return <main className="grid min-h-screen place-items-center bg-black text-white"><Loader2 className="size-6 animate-spin text-[#C29E66]" aria-label="Loading checkout" /></main>;
  if ( !checkout ) return <StatusPage icon={ XCircle } title="Payment link unavailable" body={ error || "This link is invalid or no longer available." } />;
  if ( checkout.status === "confirmed" ) return <StatusPage icon={ Check } title="Your ride is confirmed" body={ `Payment for booking ${ checkout.reference } was received. Your confirmation is on its way.` } />;
  if ( checkout.status === "payment_review" ) return <StatusPage icon={ Clock3 } title="Payment under review" body="Your Zelle details were received. We are holding your chauffeur while our team verifies the transfer." />;
  const holdExpired = Boolean( checkout.holdExpiresAt && seconds === 0 );
  if ( [ "payment_expired", "cancelled", "rejected" ].includes( checkout.status ) || holdExpired ) return <StatusPage icon={ XCircle } title="This hold has expired" body="The chauffeur slot is no longer reserved. Please start a new booking or contact us for assistance." />;

  return (
    <Dialog open={ zelleOpen } onOpenChange={ open => { setZelleOpen( open ); if ( !open ) setError( "" ); } }>
      <main className="min-h-screen bg-black px-5 py-10 text-white md:px-10 md:py-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex items-center justify-between border-b border-white/10 pb-5">
          <Link href="/" className="font-wide text-sm uppercase tracking-[0.2em] text-[#C29E66]">Goldridr</Link>
          <div className="flex items-center gap-2 text-sm text-white/65"><Clock3 className="size-4 text-[#C29E66]" /><span className="tabular-nums">{ countdown }</span><span className="hidden sm:inline">remaining</span></div>
        </header>

        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <aside className="lg:sticky lg:top-12 lg:self-start">
            <h1 className="max-w-md font-serif text-4xl leading-[1.05] text-balance md:text-5xl">Confirm your chauffeur.</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/60">Complete the full fare before the hold expires. Confirmation follows verified payment.</p>
            <div className="relative mt-8 h-56 overflow-hidden border-y border-white/10 md:h-64">
              <InteractiveRouteMap
                pickupLocation={ checkout.pickup }
                dropoffLocation={ checkout.tripType === "hourly" ? undefined : checkout.destination }
                className="absolute inset-0"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-linear-to-t from-black via-black/80 to-transparent px-5 pb-5 pt-16">
                <MapStat label={ checkout.tripType === "hourly" ? "Service" : "Distance" } value={ checkout.tripType === "hourly" ? "As directed" : distanceLabel( checkout.distance ) } />
                <MapStat label={ checkout.tripType === "hourly" ? "Booking" : "Drive time" } value={ checkout.tripType === "hourly" ? "Hourly" : checkout.driveTime } align="right" />
              </div>
            </div>
            <dl className="mt-10 divide-y divide-white/10 border-y border-white/10">
              <TripLine label="Booking" value={ checkout.reference } />
              <TripLine label="Pickup" value={ `${ checkout.date } · ${ checkout.time }` } />
              <TripLine label="From" value={ checkout.pickup } />
              { checkout.destination ? <TripLine label="To" value={ checkout.destination } /> : null }
            </dl>
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-sm text-white/55"><span>Fare</span><span>{ money( checkout.subtotalCents, checkout.currency ) }</span></div>
              { checkout.discountCents > 0 ? <div className="flex justify-between text-sm text-white/55"><span>Discount</span><span>−{ money( checkout.discountCents, checkout.currency ) }</span></div> : null }
              <div className="flex justify-between border-t border-white/10 pt-4 text-xl"><span>Total due</span><strong className="font-medium text-[#C29E66]">{ money( checkout.totalCents, checkout.currency ) }</strong></div>
            </div>
          </aside>

          <section aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="text-xl font-medium">Choose how to pay</h2>
            <p className="mt-2 text-sm text-white/55">Only eligible methods are completed online. Zelle is verified by our team.</p>
            <div className="mt-7 border-y border-white/10">
              { checkout.enabledMethods.map( method => {
                const item = METHODS[ method ]; const active = selected === method;
                const unavailable = method === "venmo" ? !checkout.credentialHealth.paypal : method !== "zelle" && !checkout.credentialHealth[ checkout.activeProcessor ];
                const button = <button key={ method } type="button" disabled={ unavailable } onClick={ () => { setSelected( method ); setError( "" ); paypalRendered.current = false; } } className={`flex w-full items-center gap-4 border-b border-white/10 px-1 py-5 text-left transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C29E66] ${ active ? "bg-white/[0.06] text-white" : "text-white/75 hover:bg-white/[0.035]" } disabled:cursor-not-allowed disabled:opacity-35`}>
                  <span className={`grid size-10 place-items-center border ${ active ? "border-[#C29E66] text-[#C29E66]" : "border-white/15" }`}><PaymentMethodIcon method={ method } /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{ item.label }</span><span className="mt-1 block text-xs text-white/45">{ unavailable ? "Temporarily unavailable" : item.detail }</span></span>
                  <ChevronRight className={`size-4 ${ active ? "text-[#C29E66]" : "text-white/30" }`} />
                </button>;
                return method === "zelle" ? <DialogTrigger key={ method } render={ button } /> : button;
              } ) }
            </div>

            { error && !zelleOpen ? <div role="alert" className="mt-6 flex gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><XCircle className="mt-0.5 size-4 shrink-0" />{ error }</div> : null }

            { selected && selected !== "zelle" && selected !== "venmo" ? <div className="mt-7">
              { checkout.activeProcessor === "square" && selected === "card" ? <div id="square-card" className="mb-5 min-h-20" /> : null }
              { checkout.activeProcessor === "square" && selected === "cash_app" ? <div id="square-cash-app" className="mb-5 min-h-12" /> : null }
              { selected !== "cash_app" ? <ActionButton loading={ submitting } onClick={ onlinePay }>Pay { money( checkout.totalCents, checkout.currency ) }</ActionButton> : submitting ? <p className="mt-3 text-sm text-white/55">Waiting for verified confirmation…</p> : null }
            </div> : null }

            { selected === "venmo" ? <div className="mt-7"><div id="venmo-button" className="min-h-12" />{ submitting ? <p className="mt-3 text-sm text-white/55">Waiting for verified confirmation…</p> : null }</div> : null }

          </section>
        </div>
      </div>
      </main>

      <DialogContent className="gap-0 rounded-none bg-[#090909] p-0 text-white ring-white/15 shadow-none sm:max-w-lg sm:rounded-none">
        <DialogHeader className="border-b border-white/10 px-6 py-6 pr-16 text-left md:px-8">
          <DialogTitle className="font-serif text-3xl font-normal leading-tight">Pay with Zelle</DialogTitle>
          <DialogDescription className="max-w-md text-sm leading-6 text-white/55">
            Send the full fare through your bank, then share the transfer details so our team can verify it.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={ submitZelle } className="px-6 py-6 md:px-8 md:py-7">
          <div className="border-y border-white/10 py-5">
            <div className="flex items-baseline justify-between gap-6">
              <span className="text-xs uppercase tracking-[0.12em] text-white/45">Amount</span>
              <strong className="font-wide text-lg font-medium text-[#C29E66]">{ money( checkout.totalCents, checkout.currency ) }</strong>
            </div>
            <div className="mt-4 flex items-start justify-between gap-6">
              <span className="text-xs uppercase tracking-[0.12em] text-white/45">Recipient</span>
              <strong className="max-w-[70%] text-right text-sm font-medium leading-5 text-white">{ checkout.zelleRecipient || "Provided by Goldridr" }</strong>
            </div>
          </div>
          { checkout.zelleInstructions ? <p className="mt-5 text-sm leading-6 text-white/60">{ checkout.zelleInstructions }</p> : null }
          <label className="mt-6 block text-xs uppercase tracking-[0.12em] text-white/55">Sender name<input required autoComplete="name" value={ senderName } onChange={ event => setSenderName( event.target.value ) } className="mt-2 h-12 w-full border border-white/15 bg-transparent px-4 text-sm normal-case tracking-normal text-white outline-none focus:border-[#C29E66] focus:ring-1 focus:ring-[#C29E66]" /></label>
          <label className="mt-5 block text-xs uppercase tracking-[0.12em] text-white/55">Confirmation reference<input required autoComplete="off" value={ confirmationReference } onChange={ event => setConfirmationReference( event.target.value ) } className="mt-2 h-12 w-full border border-white/15 bg-transparent px-4 text-sm normal-case tracking-normal text-white outline-none focus:border-[#C29E66] focus:ring-1 focus:ring-[#C29E66]" /></label>
          { error ? <div role="alert" className="mt-5 flex gap-3 border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"><XCircle className="mt-0.5 size-4 shrink-0" />{ error }</div> : null }
          <div className="mt-6"><ActionButton loading={ submitting } type="submit">Submit for verification</ActionButton></div>
          <p className="mt-4 text-center text-xs leading-5 text-white/40">Your chauffeur remains on hold while the transfer is reviewed.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TripLine( { label, value }: { label: string; value: string } ) { return <div className="grid grid-cols-[5.5rem_1fr] gap-4 py-4"><dt className="text-xs uppercase tracking-[0.12em] text-white/40">{ label }</dt><dd className="text-sm leading-6 text-white/80">{ value }</dd></div>; }

function MapStat( { label, value, align = "left" }: { label: string; value: string; align?: "left" | "right" } ) {
  if ( !value ) return null;
  return <div className={ align === "right" ? "text-right" : "text-left" }><span className="block text-xs uppercase tracking-[0.12em] text-white/45">{ label }</span><strong className="mt-1 block font-wide text-sm font-medium uppercase tracking-[0.08em] text-white">{ value }</strong></div>;
}

function ActionButton( { children, loading, onClick, type = "button" }: { children: React.ReactNode; loading: boolean; onClick?: () => void; type?: "button" | "submit" } ) { return <button type={ type } onClick={ onClick } disabled={ loading } className="flex h-12 w-full items-center justify-center gap-2 bg-[#C29E66] px-5 font-wide text-xs uppercase tracking-[0.12em] text-black transition-colors hover:bg-[#d1b17c] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C29E66] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-wait disabled:opacity-50">{ loading ? <Loader2 className="size-4 animate-spin" /> : null }{ children }</button>; }

function StatusPage( { icon: Icon, title, body }: { icon: typeof Check; title: string; body: string } ) { return <main className="grid min-h-screen place-items-center bg-black px-5 text-white"><section className="max-w-xl border-y border-white/10 py-12 text-center"><Icon className="mx-auto size-10 text-[#C29E66]" /><h1 className="mt-7 font-serif text-4xl">{ title }</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-white/60">{ body }</p><Link href="/" className="mt-8 inline-flex h-11 items-center border border-[#C29E66]/60 px-6 font-wide text-xs uppercase tracking-[0.12em] text-[#C29E66] hover:bg-[#C29E66] hover:text-black">Return home</Link></section></main>; }
