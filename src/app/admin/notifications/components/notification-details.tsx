"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Clock,
  DollarSign,
  Flag,
  Hash,
  MailOpen,
  MapPin,
  MoveRight,
  Phone,
  RefreshCw,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { cn } from "@/lib/utils";
import type { FailedDelivery, NotificationItem, ReminderDelivery } from "../types";
import { getString, humanizeKey, isRecord, parseNestedJson, statusVariant } from "../utils";
import styles from "@/styles/notification-details.module.css";

export function NotificationDetail( {
  item,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
  onMarkUnread: () => void;
  onDelete: () => void;
} ) {
  const [ detailsOpen, setDetailsOpen ] = useState( false );

  return (
    <article className={styles.article}>
      <div className={styles.detailHeader}>
        <div className={styles.badgeRow}>
          <Badge variant="outline" className="capitalize">{item.category}</Badge>
          {item.bookingReference && <Badge variant="secondary">{item.bookingReference}</Badge>}
        </div>
        <div className={styles.actionRow}>
          {item.readAt ? (
            <Button variant="ghost" size="sm" className={styles.ghostAction} onClick={onMarkUnread}>
              <MailOpen className="size-3.5" />Mark unread
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className={styles.ghostAction} onClick={onMarkRead}>
              <Check className="size-3.5" />Mark read
            </Button>
          )}
          <Button variant="ghost" size="sm" className={styles.destructiveAction} onClick={onDelete}>
            <Trash2 className="size-3.5" />Delete
          </Button>
        </div>
      </div>
      <h2 className={styles.heading}>{item.title}</h2>
      <p className={styles.timestamp}>{new Date( item.createdAt ).toLocaleString()}</p>
      <div className={styles.bodySection}>
        <button
          type="button"
          onClick={() => setDetailsOpen( current => !current )}
          className={styles.bodyToggle}
          aria-expanded={detailsOpen}
        >
          <ChevronDown className={cn( styles.chevron, !detailsOpen && styles.chevronClosed )} />
          <span>{item.body}</span>
        </button>
      </div>
      {detailsOpen && (
        <dl className={styles.detailGridPanel}>
          <Detail label="Status" value={item.readAt ? "Read" : "Unread"} />
          <Detail label="Received" value={new Date( item.createdAt ).toLocaleString()} />
          <Detail label="Booking" value={item.bookingReference || "Not attached"} />
        </dl>
      )}
      <MetadataPanel value={item.metadata} />
    </article>
  );
}

export function ReminderDetail( { reminder }: { reminder: ReminderDelivery } ) {
  return (
    <article className={styles.article}>
      <div className={styles.badgeRow}>
        <Badge variant={statusVariant( reminder.status )}>{reminder.status.replace( "_", " " )}</Badge>
        <Badge variant="outline">{reminder.channel.toUpperCase()}</Badge>
      </div>
      <h2 className={styles.heading}>{reminder.title}</h2>
      <p className={styles.mutedText}>{reminder.passengerName || reminder.recipient}</p>
      <dl className={styles.detailGrid}>
        <Detail label="Booking" value={reminder.bookingReference || "Not available"} />
        <Detail label="Recipient" value={reminder.recipient} />
        <Detail label="Pickup" value={reminder.pickupDate && reminder.pickupTime ? `${reminder.pickupDate} at ${reminder.pickupTime}` : "Not available"} />
        <Detail label="Scheduled" value={new Date( reminder.scheduledAt ).toLocaleString()} />
        <Detail label="Attempts" value={String( reminder.attempts )} />
        <Detail label="Provider message ID" value={reminder.providerMessageId || "Pending"} />
      </dl>
      { reminder.lastError && (
        <div className={styles.errorPanel}>
          <p className={styles.errorLabel}>Last delivery error</p>
          <p className={styles.errorText}>{reminder.lastError}</p>
        </div>
      ) }
    </article>
  );
}

export function FailureDetail( {
  delivery,
  onRetry,
}: {
  delivery: FailedDelivery;
  onRetry: () => void;
} ) {
  return (
    <article className={styles.article}>
      <div className={styles.detailHeader}>
        <div className={styles.badgeRow}>
          <Badge variant="destructive">{delivery.status.replace( "_", " " )}</Badge>
          <Badge variant="outline">{delivery.channel.toUpperCase()}</Badge>
          {delivery.bookingReference && <Badge variant="secondary">{delivery.bookingReference}</Badge>}
        </div>
        <Button size="sm" onClick={onRetry}>
          <RefreshCw className="size-3.5" />Retry now
        </Button>
      </div>
      <h2 className={styles.heading}>{delivery.title}</h2>
      <p className={styles.mutedText}>{delivery.recipient}</p>
      <div className={styles.failureErrorPanel}>
        <p className={styles.errorLabel}>Last delivery error</p>
        <p className={styles.failureErrorText}>{delivery.lastError || "No provider error was recorded."}</p>
      </div>
      <dl className={styles.detailGrid}>
        <Detail label="Delivery ID" value={String( delivery.id )} />
        <Detail label="Channel" value={delivery.channel.toUpperCase()} />
        <Detail label="Recipient" value={delivery.recipient} />
        <Detail label="Booking" value={delivery.bookingReference || "Not attached"} />
      </dl>
    </article>
  );
}

function Detail( { label, value }: { label: string; value: string } ) {
  return (
    <div>
      <dt className={styles.detailLabel}>{label}</dt>
      <dd className={styles.detailValue}>{value}</dd>
    </div>
  );
}

function MetadataPanel( { value }: { value: string } ) {
  const metadata = parseMetadata( value );
  const booking = getBookingSummary( metadata.value );
  const [ expanded, setExpanded ] = useState( false );
  const extraEntries = booking
    ? metadata.entries.filter( entry => !booking.consumedKeys.has( entry.key ) ).concat( booking.extraEntries )
    : metadata.entries;

  return (
    <section className={styles.metadata}>
      <div className={styles.metadataHead}>
        <h3 className={styles.metadataTitle}>Metadata</h3>
      </div>

      {booking ? (
        <>
          <BookingCard booking={booking} />
          {extraEntries.length > 0 && (
            <div className="mt-3">
              <Button variant="ghost" size="sm" onClick={() => setExpanded( current => !current )}>
                {expanded ? "Show less" : "Show more"}
              </Button>
            </div>
          )}
          {expanded && <MetadataRows entries={extraEntries} />}
        </>
      ) : metadata.entries.length > 0 ? (
        <MetadataRows entries={extraEntries} />
      ) : (
        <p className={styles.metadataEmpty}>No metadata attached.</p>
      )}
    </section>
  );
}

function MetadataRows( { entries }: { entries: Array<{ key: string; value: unknown }> } ) {
  if ( entries.length === 0 ) return null;

  return (
    <dl className={styles.metadataRows}>
      {entries.map( entry => (
        <div key={entry.key} className={styles.metadataRow}>
          <dt className={styles.detailLabel}>{humanizeKey( entry.key )}</dt>
          <dd className={styles.metadataValue}>
            <MetadataValue value={entry.value} />
          </dd>
        </div>
      ) )}
    </dl>
  );
}

interface BookingSummary {
  reference?: string;
  passenger?: string;
  contact?: string;
  pickupDateTime?: string;
  service?: string;
  status?: string;
  previousStatus?: string;
  pickup?: string;
  dropoff?: string;
  terminal?: string;
  passengers?: string;
  duration?: string;
  estimate?: string;
  driverName?: string;
  driverContact?: string;
  consumedKeys: Set<string>;
  extraEntries: Array<{ key: string; value: unknown }>;
}

function BookingCard( { booking }: { booking: BookingSummary } ) {
  return (
    <div className={styles.bookingCard}>
      <div className={styles.bookingCardHead}>
        <div className={styles.bookingTitleWrap}>
          <p className={styles.bookingEyebrow}>Booking Card</p>
          <h4 className={styles.bookingTitle}>
            <Hash className={styles.bookingTitleIcon} />
            <span className={styles.bookingTitleText}>{booking.reference || "Booking"}</span>
          </h4>
        </div>
        <div className={styles.bookingBadges}>
          {booking.status && <Badge variant={booking.status === "cancelled" || booking.status === "rejected" ? "destructive" : "secondary"}>{humanizeKey( booking.status )}</Badge>}
          {booking.service && <Badge variant="outline">{humanizeKey( booking.service )}</Badge>}
          {booking.previousStatus && <Badge variant="outline">Was {humanizeKey( booking.previousStatus )}</Badge>}
        </div>
      </div>

      {( booking.passenger || booking.contact ) && <RiderFact name={booking.passenger} contact={booking.contact} />}
      {( booking.pickup || booking.dropoff ) && <RouteFact pickup={booking.pickup} dropoff={booking.dropoff} />}
      {( booking.driverName || booking.driverContact ) && <DriverFact name={booking.driverName} contact={booking.driverContact} />}

      <dl className={styles.cardFacts}>
        {booking.pickupDateTime && <CardFact icon={Clock} label="Pickup time" value={booking.pickupDateTime} />}
        {booking.passengers && <CardFact icon={Users} label="Passengers" value={booking.passengers} />}
        {booking.terminal && <CardFact icon={MapPin} label="Terminal" value={booking.terminal} />}
        {booking.duration && <CardFact icon={Clock} label="Duration" value={booking.duration} />}
        {booking.estimate && <CardFact icon={DollarSign} label="Estimate" value={booking.estimate} />}
      </dl>
    </div>
  );
}

function RiderFact( { name, contact }: { name?: string; contact?: string } ) {
  return (
    <div className={styles.factBox}>
      <Phone className={styles.factIcon} />
      <div className={styles.factContent}>
        <p className={styles.factLabel}>Rider</p>
        {name && <p className={styles.factPrimary}>{name}</p>}
        {contact && <p className={styles.factSecondary}>{contact}</p>}
      </div>
    </div>
  );
}

function DriverFact( { name, contact }: { name?: string; contact?: string } ) {
  return (
    <div className={styles.factBox}>
      <UserRound className={styles.factIcon} />
      <div className={styles.factContent}>
        <p className={styles.factLabel}>Driver</p>
        {name && <p className={styles.factPrimary}>{name}</p>}
        {contact && <p className={styles.factSecondary}>{contact}</p>}
      </div>
    </div>
  );
}

function RouteFact( { pickup, dropoff }: { pickup?: string; dropoff?: string } ) {
  return (
    <div className={styles.routeFact}>
      <div className={styles.routeLocation}>
        <MapPin className={styles.factIcon} />
        <div className={styles.factContent}>
          <p className={styles.factLabel}>Pickup</p>
          <p className={styles.detailValue}>{pickup || "Not provided"}</p>
        </div>
      </div>

      <div className={styles.routeDivider}>
        <div className={styles.routeDividerLine} />
        <span className={styles.routeDividerIcon}>
          <MoveRight className="size-4 text-muted-foreground" />
        </span>
      </div>

      <div className={styles.routeDropoff}>
        <Flag className={styles.factIcon} />
        <div className={styles.factContent}>
          <p className={styles.factLabel}>Dropoff</p>
          <p className={styles.detailValue}>{dropoff || "Not provided"}</p>
        </div>
      </div>
    </div>
  );
}

function CardFact( {
  icon: Icon,
  label,
  value,
  wide,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  wide?: boolean;
} ) {
  return (
    <div className={cn( styles.cardFact, wide && styles.cardFactWide )}>
      <Icon className={styles.factIcon} />
      <div className={styles.factContent}>
        <dt className={styles.factLabel}>{label}</dt>
        <dd className={styles.detailValue}>{value}</dd>
      </div>
    </div>
  );
}

function parseMetadata( value: string ): { kind: string; value: unknown; entries: Array<{ key: string; value: unknown }> } {
  if ( !value ) return { kind: "Empty", value: null, entries: [] };

  try {
    const parsed = normalizeMetadataValue( JSON.parse( value ) as unknown );
    if ( parsed && typeof parsed === "object" && !Array.isArray( parsed ) ) {
      return {
        kind: "JSON",
        value: parsed,
        entries: Object.entries( parsed ).map( ( [ key, entryValue ] ) => ( {
          key,
          value: entryValue,
        } ) ),
      };
    }
    return {
      kind: "JSON",
      value: parsed,
      entries: [ { key: "value", value: parsed } ],
    };
  } catch {
    return {
      kind: "Text",
      value,
      entries: [ { key: "value", value } ],
    };
  }
}

function getBookingSummary( value: unknown ): BookingSummary | null {
  if ( !isRecord( value ) ) return null;

  const tripDetails = isRecord( value.tripDetails ) ? value.tripDetails : {};
  const reference = getString( value.bookingReference );
  const passenger = getString( value.passengerName );
  const status = getString( value.status );
  const previousStatus = getString( value.previousStatus );
  const service = getString( value.tripType );
  const date = getString( value.date );
  const time = getString( value.time );
  const pickup = getString( tripDetails.pickupLocation ) || getString( tripDetails.pickup );
  const dropoff = getString( tripDetails.dropoffLocation ) || getString( tripDetails.destination );
  const terminal = getString( tripDetails.terminal );
  const passengers = getString( tripDetails.passengers );
  const duration = getString( value.duration )
    || getString( tripDetails.durationHours )
    || getString( tripDetails.duration );
  const estimate = getString( tripDetails.estimatedTotal ) || getString( tripDetails.estimatedPrice );
  const passengerEmail = getString( value.passengerEmail );
  const passengerPhone = getString( value.passengerPhone );
  const contact = [ passengerEmail, passengerPhone ].filter( Boolean ).join( " · " );
  const driverName = getString( value.chauffeurName )
    || getString( value.driverName );
  const driverEmail = getString( value.chauffeurEmail )
    || getString( value.driverEmail );
  const driverPhone = getString( value.chauffeurPhone )
    || getString( value.driverPhone );
  const driverContact = [ driverEmail, driverPhone ].filter( Boolean ).join( " · " );

  if ( !reference && !passenger && !pickup && !dropoff ) return null;

  const consumedKeys = new Set( [
    "bookingReference",
    "passengerName",
    "passengerEmail",
    "passengerPhone",
    "date",
    "time",
    "duration",
    "tripType",
    "status",
    "previousStatus",
    "chauffeurName",
    "chauffeurEmail",
    "chauffeurPhone",
    "driverName",
    "driverEmail",
    "driverPhone",
    "appUrl",
    "tripDetails",
  ] );
  const consumedTripDetailKeys = new Set( [
    "pickupLocation",
    "pickup",
    "dropoffLocation",
    "destination",
    "terminal",
    "passengers",
    "durationHours",
    "duration",
    "estimatedTotal",
    "estimatedPrice",
  ] );

  return {
    reference,
    passenger,
    contact,
    pickupDateTime: [ date, time ].filter( Boolean ).join( " at " ),
    service,
    status,
    previousStatus,
    pickup,
    dropoff,
    terminal,
    passengers,
    duration,
    estimate,
    driverName,
    driverContact,
    consumedKeys,
    extraEntries: Object.entries( tripDetails )
      .filter( ( [ key ] ) => !consumedTripDetailKeys.has( key ) )
      .map( ( [ key, entryValue ] ) => ( { key: `tripDetails.${ key }`, value: entryValue } ) ),
  };
}

function normalizeMetadataValue( value: unknown ): unknown {
  if ( typeof value === "string" ) {
    const parsed = parseNestedJson( value );
    return parsed.parsed ? normalizeMetadataValue( parsed.value ) : value;
  }
  if ( Array.isArray( value ) ) return value.map( item => normalizeMetadataValue( item ) );
  if ( isRecord( value ) ) {
    return Object.fromEntries( Object.entries( value ).map( ( [ key, entryValue ] ) => [ key, normalizeMetadataValue( entryValue ) ] ) );
  }
  return value;
}

function MetadataValue( { value }: { value: unknown } ) {
  if ( value === null || value === undefined || value === "" ) {
    return <span className={styles.noneText}>None</span>;
  }

  if ( typeof value === "string" ) {
    const parsed = parseNestedJson( value );
    if ( parsed.parsed ) return <MetadataValue value={parsed.value} />;
    return <span>{value}</span>;
  }

  if ( typeof value === "number" || typeof value === "boolean" ) {
    return <span>{String( value )}</span>;
  }

  if ( Array.isArray( value ) ) {
    if ( value.length === 0 ) return <span className={styles.noneText}>Empty list</span>;
    return (
      <ul className={styles.metadataList}>
        {value.map( ( item, index ) => (
          <li key={index} className={styles.metadataListItem}>
            <MetadataValue value={item} />
          </li>
        ) )}
      </ul>
    );
  }

  if ( typeof value === "object" ) {
    const entries = Object.entries( value );
    if ( entries.length === 0 ) return <span className={styles.noneText}>Empty object</span>;
    return (
      <dl className={styles.metadataNested}>
        {entries.map( ( [ key, entryValue ] ) => (
          <div key={key} className={styles.metadataNestedRow}>
            <dt className={styles.detailLabel}>{humanizeKey( key )}</dt>
            <dd className={styles.metadataValue}>
              <MetadataValue value={entryValue} />
            </dd>
          </div>
        ) )}
      </dl>
    );
  }

  return <span>{String( value )}</span>;
}
