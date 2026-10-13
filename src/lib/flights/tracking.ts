import { createHash } from "crypto";
import { getNotificationTimeZone } from "@/lib/admin-settings";
import { zonedDateTimeToDate } from "@/lib/notifications/time";
import { getPocketBaseClient } from "@/lib/pocketbase/client";
import { pocketBaseCollections } from "@/lib/pocketbase/collections";
import { createPocketBaseFlightAlert } from "@/lib/pocketbase/notifications";
import { first } from "@/lib/pocketbase/core";
import { lookupFlight } from "./service";
import { FlightDateUnavailableError } from "./providers";
import { findFlightSnapshotRecord, recordFlightMetric } from "./store";
import { flightLookupId, normalizeFlightLookupKey, relevantFlightTime, type FlightLookupKey, type FlightSnapshot } from "./types";
import { rideReference } from "@/lib/booking-legs";
import { FLIGHT_FIFTEEN_MINUTES, getFlightAlertChanges, getNextFlightCheck } from "./policy";

const INACTIVE_BOOKING_STATUSES = new Set( [ "completed", "cancelled", "rejected" ] );

type BookingRow = Record<string, unknown> & { id: string };
type TrackedLeg = "outbound" | "return";

/** A booking row seen as one leg; round trips keep the return leg in return* fields. */
interface LegRow {
  id: string;
  leg: TrackedLeg;
  reference: string;
  pickupDate: unknown;
  pickupTime: unknown;
  status: string;
  tripDetails: unknown;
  chauffeurUserId: string | null;
}

function object( value: unknown ): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray( value ) ? value as Record<string, unknown> : {};
}

function snapshotFrom( value: unknown ): FlightSnapshot | null {
  const record = object( value );
  const snapshot = record.snapshot;
  return snapshot && typeof snapshot === "object" ? snapshot as FlightSnapshot : null;
}

function legRow( booking: BookingRow, leg: TrackedLeg ): LegRow | null {
  if ( leg === "return" && !booking.returnDate ) return null;
  const isReturn = leg === "return";
  const override = String( ( isReturn ? booking.returnLegStatus : booking.outboundLegStatus ) || "" );
  return {
    id: booking.id,
    leg,
    reference: String( booking.reference || "" ),
    pickupDate: isReturn ? booking.returnDate : booking.pickupDate,
    pickupTime: isReturn ? booking.returnTime : booking.pickupTime,
    status: override || String( booking.status ),
    tripDetails: isReturn ? booking.returnTripDetails : booking.tripDetails,
    chauffeurUserId: chauffeurUserId( booking, isReturn ? "returnChauffeur" : "chauffeur" ),
  };
}

function bookingKey( booking: LegRow ): FlightLookupKey | null {
  const details = object( booking.tripDetails );
  return normalizeFlightLookupKey( {
    flightIata: details.flightNumber,
    flightDate: booking.pickupDate,
    direction: details.tripDirection,
  } );
}

function bookingTarget( booking: LegRow, snapshot: FlightSnapshot | null, timeZone: string ): number {
  const providerTime = snapshot ? Date.parse( relevantFlightTime( snapshot ) || "" ) : Number.NaN;
  if ( Number.isFinite( providerTime ) ) return providerTime;
  return zonedDateTimeToDate( String( booking.pickupDate ), String( booking.pickupTime ), timeZone ).getTime();
}

function fingerprint( snapshot: FlightSnapshot, changes: string[] ): string {
  return createHash( "sha256" ).update( JSON.stringify( { status: snapshot.status, changes } ) ).digest( "hex" ).slice( 0, 24 );
}

function chauffeurUserId( booking: BookingRow, relation: "chauffeur" | "returnChauffeur" ): string | null {
  const expanded = object( booking.expand );
  const chauffeur = object( expanded[ relation ] );
  return typeof chauffeur.user === "string" && chauffeur.user ? chauffeur.user : null;
}

export class FlightTrackingWorker {
  async verify(): Promise<void> {
    await getPocketBaseClient().collection( pocketBaseCollections.flightTracking ).getList( 1, 1 );
  }

  private async syncBookings(): Promise<number> {
    const pb = getPocketBaseClient();
    const bookings = await pb.collection( pocketBaseCollections.bookings ).getFullList( {
      filter: "tripType = 'airport' && status != 'completed' && status != 'cancelled' && status != 'rejected'",
      fields: "id,reference,pickupDate,pickupTime,status,tripDetails,outboundLegStatus,returnDate,returnTime,returnTripDetails,returnLegStatus",
    } ) as BookingRow[];
    let synced = 0;
    const legs = bookings.flatMap( booking => [ legRow( booking, "outbound" ), legRow( booking, "return" ) ] ).filter( ( leg ): leg is LegRow => Boolean( leg ) );
    for ( const booking of legs ) {
      const key = bookingKey( booking );
      if ( !key || INACTIVE_BOOKING_STATUSES.has( booking.status ) ) continue;
      const existing = await first( pocketBaseCollections.flightTracking, "booking = {:booking} && leg = {:leg}", { booking: booking.id, leg: booking.leg } );
      const data = { booking: booking.id, leg: booking.leg, lookupKey: flightLookupId( key ), active: true, nextCheckAt: existing?.nextCheckAt || new Date().toISOString() };
      if ( existing ) {
        if ( existing.lookupKey !== data.lookupKey ) await pb.collection( pocketBaseCollections.flightTracking ).update( String( existing.id ), data );
      } else {
        await pb.collection( pocketBaseCollections.flightTracking ).create( data );
      }
      synced++;
    }
    return synced;
  }

  async runOnce( limit = 50 ): Promise<{ synced: number; checked: number; alerted: number; failed: number }> {
    const pb = getPocketBaseClient();
    const timeZone = await getNotificationTimeZone();
    const synced = await this.syncBookings();
    const due = await pb.collection( pocketBaseCollections.flightTracking ).getList( 1, limit, {
      filter: pb.filter( "active = true && nextCheckAt <= {:now}", { now: new Date().toISOString() } ),
      sort: "nextCheckAt",
      expand: "booking,booking.chauffeur,booking.returnChauffeur,snapshot",
    } );
    let checked = 0, alerted = 0, failed = 0;
    for ( const tracking of due.items ) {
      const expanded = object( tracking.expand );
      const booking = legRow( object( expanded.booking ) as BookingRow, tracking.leg === "return" ? "return" : "outbound" );
      if ( !booking || INACTIVE_BOOKING_STATUSES.has( booking.status ) ) {
        await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, { active: false } );
        continue;
      }
      const key = bookingKey( booking );
      if ( !key ) {
        await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, { active: false, lastError: "Booking has an invalid flight lookup key" } );
        continue;
      }
      const previous = snapshotFrom( expanded.snapshot );
      const baseline = tracking.alertBaseline && typeof tracking.alertBaseline === "object"
        ? tracking.alertBaseline as FlightSnapshot
        : previous;
      const target = bookingTarget( booking, previous, timeZone );
      const schedule = getNextFlightCheck( target, previous );
      if ( !schedule.active ) {
        await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, { active: false, nextCheckAt: schedule.at } );
        continue;
      }
      try {
        const result = await lookupFlight( key ).catch( error => {
          if ( error instanceof FlightDateUnavailableError ) return { flight: null, unavailableDate: true as const };
          throw error;
        } );
        checked++;
        if ( !result.flight ) {
          const lastError = "unavailableDate" in result
            ? "Flight data for this date is not published by the provider yet"
            : "No approved flight provider is enabled";
          await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, { nextCheckAt: schedule.at, lastCheckedAt: new Date().toISOString(), lastError } );
          continue;
        }
        const current = result.flight;
        const changes = getFlightAlertChanges( baseline, current );
        const alertFingerprint = changes.length ? fingerprint( current, changes ) : "";
        if ( changes.length && tracking.lastAlertFingerprint !== alertFingerprint ) {
          const title = `${ current.flightIata } flight update`;
          const body = changes.join( "; " );
          await createPocketBaseFlightAlert( { bookingReference: booking.reference, chauffeurUserId: booking.chauffeurUserId, title, body, fingerprint: alertFingerprint, metadata: { flight: current, changes, leg: booking.leg, rideReference: rideReference( booking.reference, booking.leg ) } } );
          await recordFlightMetric( { eventType: "alert", key, provider: current.provider, success: true, metadata: { bookingReference: booking.reference, changes } } );
          alerted++;
        }
        const snapshotRecord = await findFlightSnapshotRecord( key );
        const next = getNextFlightCheck( bookingTarget( booking, current, timeZone ), current );
        await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, {
          snapshot: snapshotRecord?.id || "",
          active: next.active,
          nextCheckAt: next.at,
          lastCheckedAt: new Date().toISOString(),
          lastAlertFingerprint: alertFingerprint || tracking.lastAlertFingerprint || "",
          alertBaseline: changes.length || !tracking.alertBaseline ? current : tracking.alertBaseline,
          lastStatus: current.status,
          lastError: "",
        } );
      } catch ( error ) {
        failed++;
        await pb.collection( pocketBaseCollections.flightTracking ).update( tracking.id, {
          nextCheckAt: new Date( Date.now() + FLIGHT_FIFTEEN_MINUTES ).toISOString(),
          lastCheckedAt: new Date().toISOString(),
          lastError: error instanceof Error ? error.message : String( error ),
        } );
      }
    }
    return { synced, checked, alerted, failed };
  }
}
