"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";

type NativeNotificationState = "checking" | "unsupported" | "blocked" | "disabled" | "enabled" | "error";

function applicationServerKey( value: string ): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat( ( 4 - value.length % 4 ) % 4 );
  const base64 = ( value + padding ).replaceAll( "-", "+" ).replaceAll( "_", "/" );
  const raw = window.atob( base64 );
  return Uint8Array.from( raw, character => character.charCodeAt( 0 ) );
}

function isIosDevice(): boolean {
  return /iPad|iPhone|iPod/.test( navigator.userAgent )
    || ( navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1 );
}

function isStandalone(): boolean {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia( "(display-mode: standalone)" ).matches || navigatorWithStandalone.standalone === true;
}

async function serviceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register( "/admin-sw.js", { scope: "/", updateViaCache: "none" } );
  return navigator.serviceWorker.ready;
}

async function apiRequest( method: "PUT" | "POST" | "DELETE", subscription: PushSubscription ) {
  const body = method === "PUT" ? subscription.toJSON() : { endpoint: subscription.endpoint };
  const response = await fetch( "/api/admin/push-subscription", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( body ),
  } );
  if ( !response.ok ) {
    const data = await response.json().catch( () => ( {} ) );
    throw new Error( typeof data.error === "string" ? data.error : "Unable to update native notifications" );
  }
}

export function NativeNotificationSettings() {
  const [ vapidPublicKey, setVapidPublicKey ] = useState( "" );
  const [ state, setState ] = useState<NativeNotificationState>( "checking" );
  const [ busy, setBusy ] = useState<"enable" | "disable" | "test" | null>( null );
  const [ detail, setDetail ] = useState( "Checking this device…" );

  const inspect = useCallback( async () => {
    if ( !( "Notification" in window ) || !( "serviceWorker" in navigator ) || !( "PushManager" in window ) ) {
      setState( "unsupported" );
      setDetail( "This browser does not support Web Push notifications." );
      return;
    }
    try {
      const response = await fetch( "/api/admin/push-subscription", { cache: "no-store" } );
      const configuration = await response.json().catch( () => ( {} ) ) as { configured?: boolean; publicKey?: string; missing?: string[]; error?: string };
      if ( !response.ok ) throw new Error( configuration.error || "Unable to check Web Push configuration" );
      if ( !configuration.configured || !configuration.publicKey ) {
        setState( "unsupported" );
        setDetail( configuration.missing?.length
          ? `Web Push is missing ${ configuration.missing.join( ", " ) } on the web service.`
          : "Web Push has not been configured on this deployment." );
        return;
      }
      setVapidPublicKey( configuration.publicKey );
    } catch ( error ) {
      setState( "error" );
      setDetail( error instanceof Error ? error.message : "Unable to check Web Push configuration." );
      return;
    }
    if ( isIosDevice() && !isStandalone() ) {
      setState( "unsupported" );
      setDetail( "On iPhone and iPad, install GoldRidr Admin from Safari before enabling notifications." );
      return;
    }
    if ( Notification.permission === "denied" ) {
      setState( "blocked" );
      setDetail( "Notifications are blocked. Allow them in this browser's site settings, then reload this page." );
      return;
    }

    try {
      const registration = await serviceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if ( subscription ) {
        await apiRequest( "PUT", subscription );
        setState( "enabled" );
        setDetail( "This device receives every new admin inbox alert." );
      } else {
        setState( "disabled" );
        setDetail( "Enable native alerts for bookings, payments, cancellations, messages, and system events." );
      }
    } catch {
      setState( "error" );
      setDetail( "This device could not connect to the notification service. Try again." );
    }
  }, [] );

  useEffect( () => {
    const frame = window.requestAnimationFrame( () => {
      void inspect();
    } );
    return () => window.cancelAnimationFrame( frame );
  }, [ inspect ] );

  const enable = async () => {
    setBusy( "enable" );
    try {
      if ( !vapidPublicKey ) throw new Error( "Web Push configuration is unavailable. Reload the page and try again." );
      const permission = await Notification.requestPermission();
      if ( permission !== "granted" ) {
        setState( permission === "denied" ? "blocked" : "disabled" );
        setDetail( permission === "denied"
          ? "Notifications are blocked. Allow them in this browser's site settings, then reload this page."
          : "Permission was not granted. You can enable notifications whenever you're ready." );
        return;
      }
      const registration = await serviceWorkerRegistration();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe( {
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey( vapidPublicKey ),
      } );
      await apiRequest( "PUT", subscription );
      setState( "enabled" );
      setDetail( "This device receives every new admin inbox alert." );
      toast.success( "Native notifications enabled" );
    } catch ( error ) {
      setState( "error" );
      setDetail( error instanceof Error ? error.message : "Unable to enable notifications. Try again." );
    } finally {
      setBusy( null );
    }
  };

  const disable = async () => {
    setBusy( "disable" );
    try {
      const registration = await serviceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if ( subscription ) {
        await subscription.unsubscribe();
        await apiRequest( "DELETE", subscription );
      }
      setState( "disabled" );
      setDetail( "Native notifications are off for this device." );
      toast.success( "Native notifications disabled" );
    } catch ( error ) {
      setState( "error" );
      setDetail( error instanceof Error ? error.message : "Unable to disable notifications. Try again." );
    } finally {
      setBusy( null );
    }
  };

  const sendTest = async () => {
    setBusy( "test" );
    try {
      const registration = await serviceWorkerRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if ( !subscription ) throw new Error( "This device is no longer subscribed. Enable notifications again." );
      await apiRequest( "POST", subscription );
      toast.success( "Test notification sent" );
    } catch ( error ) {
      setState( "error" );
      setDetail( error instanceof Error ? error.message : "Unable to send the test notification." );
    } finally {
      setBusy( null );
    }
  };

  const active = state === "enabled";
  const statusLabel = state === "checking" ? "Checking"
    : active ? "Enabled"
      : state === "blocked" ? "Blocked"
        : state === "unsupported" ? "Unavailable"
          : state === "error" ? "Needs attention"
            : "Off";

  return (
    <section className="overflow-hidden rounded-lg border" aria-labelledby="native-notifications-title">
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-foreground" aria-hidden="true">
            <Smartphone className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="native-notifications-title" className="text-sm font-semibold">Native notifications</h2>
              <Badge variant="outline" className="gap-1.5">
                {active ? <CheckCircle2 className="size-3 text-emerald-500" /> : state === "blocked" || state === "error" ? <CircleAlert className="size-3 text-destructive" /> : <BellRing className="size-3" />}
                {statusLabel}
              </Badge>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground" aria-live="polite">{detail}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          {active ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={sendTest} disabled={busy !== null}>
                {busy === "test" ? "Sending…" : "Send test"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={disable} disabled={busy !== null}>
                {busy === "disable" ? "Disabling…" : "Disable"}
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" onClick={enable} disabled={busy !== null || [ "checking", "unsupported", "blocked" ].includes( state )}>
              {busy === "enable" ? "Enabling…" : state === "error" ? "Try again" : "Enable on this device"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
