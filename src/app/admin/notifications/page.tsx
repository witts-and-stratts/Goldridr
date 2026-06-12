"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  Check,
  CircleAlert,
  Inbox,
  MailOpen,
  MessageSquareText,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useAdmin } from "../context";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/admin-ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import { MessageComposer } from "@/components/notifications/MessageComposer";
import { ReminderComposer } from "@/components/notifications/ReminderComposer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface NotificationItem {
  recipientId: number;
  category: string;
  title: string;
  body: string;
  bookingReference?: string | null;
  metadata: string;
  readAt: string | null;
  createdAt: string;
}

interface FailedDelivery {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  title: string;
  bookingReference?: string | null;
  lastError: string | null;
}

interface ReminderDelivery {
  id: number;
  channel: string;
  recipient: string;
  status: string;
  title: string;
  bookingReference: string | null;
  passengerName: string | null;
  pickupDate: string | null;
  pickupTime: string | null;
  scheduledAt: string;
  updatedAt: string;
  attempts: number;
  lastError: string | null;
  providerMessageId: string | null;
}

type Folder = "inbox" | "unread" | "bookings" | "reminders" | "messages" | "system" | "failures";

const folders: Array<{ value: Folder; label: string; icon: typeof Inbox }> = [
  { value: "inbox", label: "All notifications", icon: Inbox },
  { value: "unread", label: "Unread", icon: MailOpen },
  { value: "bookings", label: "Bookings", icon: BookOpen },
  { value: "reminders", label: "Reminder activity", icon: BellRing },
  { value: "messages", label: "Messages", icon: MessageSquareText },
  { value: "system", label: "System", icon: CircleAlert },
  { value: "failures", label: "Delivery failures", icon: AlertTriangle },
];

function relativeTime( value: string ) {
  const date = new Date( value );
  const delta = Date.now() - date.getTime();
  if ( delta < 60_000 ) return "Now";
  if ( delta < 3_600_000 ) return `${ Math.floor( delta / 60_000 ) }m`;
  if ( delta < 86_400_000 ) return `${ Math.floor( delta / 3_600_000 ) }h`;
  return date.toLocaleDateString( "en-US", { month: "short", day: "numeric" } );
}

function statusVariant( status: string ) {
  if ( status === "delivered" ) return "default";
  if ( status === "failed" || status === "dead_letter" ) return "destructive";
  return "outline";
}

export default function NotificationsPage() {
  const { session } = useAdmin();
  const [ items, setItems ] = useState<NotificationItem[]>( [] );
  const [ failed, setFailed ] = useState<FailedDelivery[]>( [] );
  const [ reminders, setReminders ] = useState<ReminderDelivery[]>( [] );
  const [ folder, setFolder ] = useState<Folder>( "inbox" );
  const [ selectedNotificationId, setSelectedNotificationId ] = useState<number | null>( null );
  const [ selectedReminderId, setSelectedReminderId ] = useState<number | null>( null );
  const [ composeOpen, setComposeOpen ] = useState( false );
  const [ reminderOpen, setReminderOpen ] = useState( false );
  const [ search, setSearch ] = useState( "" );
  const [ unreadOnly, setUnreadOnly ] = useState( false );
  const [ mobileDetailOpen, setMobileDetailOpen ] = useState( false );

  const load = useCallback( async () => {
    const [ notificationResponse, reminderResponse ] = await Promise.all( [
      fetch( "/api/admin/notifications?limit=100" ),
      fetch( "/api/admin/reminders" ),
    ] );
    const [ notificationData, reminderData ] = await Promise.all( [
      notificationResponse.json(),
      reminderResponse.json(),
    ] );
    if ( notificationData.success ) {
      setItems( notificationData.notifications );
      setFailed( notificationData.failedDeliveries );
    }
    if ( reminderData.success ) setReminders( reminderData.reminders );
  }, [] );

  useEffect( () => {
    // Initial remote inbox hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [ load ] );

  const visibleItems = useMemo( () => {
    let result: NotificationItem[] = [];
    if ( folder === "inbox" ) result = items;
    if ( folder === "unread" ) result = items.filter( item => !item.readAt );
    if ( [ "bookings", "messages", "system" ].includes( folder ) ) {
      result = items.filter( item => item.category === folder );
    }
    if ( unreadOnly ) result = result.filter( item => !item.readAt );
    const query = search.trim().toLowerCase();
    if ( query ) {
      result = result.filter( item =>
        item.title.toLowerCase().includes( query )
        || item.body.toLowerCase().includes( query )
        || item.bookingReference?.toLowerCase().includes( query )
      );
    }
    return result;
  }, [ folder, items, search, unreadOnly ] );

  const visibleReminders = useMemo( () => {
    const query = search.trim().toLowerCase();
    if ( !query ) return reminders;
    return reminders.filter( reminder =>
      reminder.passengerName?.toLowerCase().includes( query )
      || reminder.recipient.toLowerCase().includes( query )
      || reminder.bookingReference?.toLowerCase().includes( query )
    );
  }, [ reminders, search ] );

  const visibleFailures = useMemo( () => {
    const query = search.trim().toLowerCase();
    if ( !query ) return failed;
    return failed.filter( delivery =>
      delivery.title.toLowerCase().includes( query )
      || delivery.recipient.toLowerCase().includes( query )
      || delivery.bookingReference?.toLowerCase().includes( query )
    );
  }, [ failed, search ] );

  const selectedNotification = visibleItems.find( item => item.recipientId === selectedNotificationId ) || visibleItems[ 0 ];
  const selectedReminder = visibleReminders.find( reminder => reminder.id === selectedReminderId ) || visibleReminders[ 0 ];

  // The detail sheet is mobile-only; desktop shows the inline detail pane instead.
  const openMobileDetail = () => {
    if ( window.matchMedia( "(max-width: 1023px)" ).matches ) setMobileDetailOpen( true );
  };

  useEffect( () => {
    const desktopQuery = window.matchMedia( "(min-width: 1024px)" );
    const closeOnDesktop = ( event: MediaQueryListEvent ) => {
      if ( event.matches ) setMobileDetailOpen( false );
    };
    desktopQuery.addEventListener( "change", closeOnDesktop );
    return () => desktopQuery.removeEventListener( "change", closeOnDesktop );
  }, [] );

  const selectNotification = async ( item: NotificationItem ) => {
    setSelectedNotificationId( item.recipientId );
    openMobileDetail();
    if ( item.readAt ) return;
    await fetch( "/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { action: "read", recipientIds: [ item.recipientId ] } ),
    } );
    setItems( current => current.map( value =>
      value.recipientId === item.recipientId ? { ...value, readAt: new Date().toISOString() } : value
    ) );
  };

  const markAllRead = async () => {
    await fetch( "/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { action: "read" } ),
    } );
    setItems( current => current.map( item => ( { ...item, readAt: item.readAt || new Date().toISOString() } ) ) );
  };

  const retry = async ( deliveryId: number ) => {
    const response = await fetch( "/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { action: "retry", deliveryId } ),
    } );
    if ( response.ok ) {
      setFailed( current => current.filter( delivery => delivery.id !== deliveryId ) );
      toast.success( "Delivery queued for retry" );
    } else toast.error( "Unable to retry delivery" );
  };

  const unreadCount = items.filter( item => !item.readAt ).length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setReminderOpen( true )}>
            <BellRing className="size-3.5" />Send reminder
          </Button>
          <Button size="sm" onClick={() => setComposeOpen( true )}>
            <Send className="size-3.5" />Send message
          </Button>
        </div>
        <div className="w-full lg:hidden">
          <Select value={folder} onValueChange={value => { setFolder( value as Folder ); setSearch( "" ); }}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              { folders
                .filter( item => session.role === "admin" || item.value !== "failures" )
                .map( item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem> ) }
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[56px_350px_minmax(360px,1fr)]">
        <aside className="hidden border-r bg-sidebar p-1.5 text-sidebar-foreground lg:flex lg:flex-col">
          <nav className="space-y-1">
            { folders
              .filter( item => session.role === "admin" || item.value !== "failures" )
              .map( item => {
                const count = item.value === "unread"
                  ? unreadCount
                  : item.value === "reminders"
                    ? reminders.length
                    : item.value === "failures"
                      ? failed.length
                      : undefined;
                return (
                  <button
                    key={item.value}
                    type="button"
                    title={item.label}
                    onClick={() => {
                      setFolder( item.value );
                      setSearch( "" );
                    }}
                    className={cn(
                      "relative flex size-10 w-full items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      folder === item.value && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span className="sr-only">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className="absolute right-0.5 top-0.5 flex min-w-3.5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[8px] leading-3.5 text-sidebar-primary-foreground">
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              } ) }
          </nav>
          <div className="mt-auto border-t pt-1.5">
            <Button variant="ghost" size="icon" className="w-full" onClick={markAllRead} title="Mark all read">
              <Check className="size-3.5" /><span className="sr-only">Mark all read</span>
            </Button>
          </div>
        </aside>

        <section className="min-h-0 overflow-auto border-r bg-sidebar/40">
          <div className="sticky top-0 z-10 space-y-3 border-b bg-background/95 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-medium">
                {folders.find( item => item.value === folder )?.label}
              </span>
              <div className="flex items-center gap-2">
                {!["reminders", "failures"].includes( folder ) && (
                  <Label className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    Unread
                    <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} className="shadow-none" />
                  </Label>
                )}
                <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh inbox"><RefreshCw className="size-3.5" /></Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={event => setSearch( event.target.value )} placeholder="Search inbox..." className="bg-background pl-9" />
            </div>
          </div>

          { folder === "reminders" ? (
            visibleReminders.length ? visibleReminders.map( reminder => (
              <button
                key={reminder.id}
                type="button"
                onClick={() => {
                  setSelectedReminderId( reminder.id );
                  openMobileDetail();
                }}
                className={cn(
                  "flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-muted/40",
                  selectedReminderId === reminder.id && "bg-muted/60"
                )}
              >
                <BellRing className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{reminder.passengerName || reminder.recipient}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime( reminder.updatedAt )}</span>
                  </span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">{reminder.bookingReference} · {reminder.channel.toUpperCase()}</span>
                  <Badge variant={statusVariant( reminder.status )} className="mt-2">{reminder.status.replace( "_", " " )}</Badge>
                </span>
              </button>
            ) ) : <EmptyList label="No reminder deliveries yet." />
          ) : folder === "failures" ? (
            visibleFailures.length ? visibleFailures.map( delivery => (
              <div key={delivery.id} className="border-b px-4 py-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{delivery.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{delivery.channel.toUpperCase()} · {delivery.recipient}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{delivery.lastError}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => retry( delivery.id )}>
                      <RefreshCw className="size-3.5" />Retry now
                    </Button>
                  </div>
                </div>
              </div>
            ) ) : <EmptyList label="No delivery failures." />
          ) : visibleItems.length ? visibleItems.map( item => (
            <button
              key={item.recipientId}
              type="button"
              onClick={() => selectNotification( item )}
              className={cn(
                "flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-muted/40",
                selectedNotificationId === item.recipientId && "bg-muted/60"
              )}
            >
              <span className={cn( "mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-border" : "bg-primary" )} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3">
                  <span className={cn( "truncate text-sm", !item.readAt && "font-semibold" )}>{item.title}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{relativeTime( item.createdAt )}</span>
                </span>
                <span className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.body}</span>
                <span className="mt-1.5 block text-[11px] capitalize text-muted-foreground">{item.category}</span>
              </span>
            </button>
          ) ) : <EmptyList label="No notifications in this folder." /> }
        </section>

        <section className="hidden min-h-0 overflow-auto lg:block">
          { folder === "reminders" ? (
            selectedReminder ? <ReminderDetail reminder={selectedReminder} /> : <EmptyDetail label="Select a reminder delivery." />
          ) : folder === "failures" ? (
            <EmptyDetail label="Delivery failures can be retried from the list." />
          ) : selectedNotification ? (
            <NotificationDetail item={selectedNotification} />
          ) : (
            <EmptyDetail label="Select a notification to read it." />
          ) }
        </section>
      </div>

      <MessageComposer open={composeOpen} onOpenChange={setComposeOpen} onSent={load} />
      <ReminderComposer open={reminderOpen} onOpenChange={setReminderOpen} onSent={() => { setFolder( "reminders" ); void load(); }} />
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Inbox detail</SheetTitle>
          <SheetDescription className="sr-only">Selected notification or reminder details.</SheetDescription>
          { folder === "reminders" && selectedReminder
            ? <ReminderDetail reminder={selectedReminder} />
            : selectedNotification
              ? <NotificationDetail item={selectedNotification} />
              : <EmptyDetail label="No detail available." /> }
        </SheetContent>
      </Sheet>
    </div>
  );
}

function EmptyList( { label }: { label: string } ) {
  return <p className="px-5 py-16 text-center text-sm text-muted-foreground">{label}</p>;
}

function EmptyDetail( { label }: { label: string } ) {
  return (
    <div className="flex h-full min-h-80 items-center justify-center p-8 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function NotificationDetail( { item }: { item: NotificationItem } ) {
  return (
    <article className="mx-auto max-w-3xl p-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="capitalize">{item.category}</Badge>
        {item.bookingReference && <Badge variant="secondary">{item.bookingReference}</Badge>}
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">{item.title}</h2>
      <p className="mt-2 text-xs text-muted-foreground">{new Date( item.createdAt ).toLocaleString()}</p>
      <div className="mt-8 border-t pt-6">
        <p className="max-w-2xl text-sm leading-7 text-foreground/90">{item.body}</p>
      </div>
    </article>
  );
}

function ReminderDetail( { reminder }: { reminder: ReminderDelivery } ) {
  return (
    <article className="mx-auto max-w-3xl p-8">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant( reminder.status )}>{reminder.status.replace( "_", " " )}</Badge>
        <Badge variant="outline">{reminder.channel.toUpperCase()}</Badge>
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">{reminder.title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{reminder.passengerName || reminder.recipient}</p>
      <dl className="mt-8 grid gap-5 border-t pt-6 sm:grid-cols-2">
        <Detail label="Booking" value={reminder.bookingReference || "Not available"} />
        <Detail label="Recipient" value={reminder.recipient} />
        <Detail label="Pickup" value={reminder.pickupDate && reminder.pickupTime ? `${reminder.pickupDate} at ${reminder.pickupTime}` : "Not available"} />
        <Detail label="Scheduled" value={new Date( reminder.scheduledAt ).toLocaleString()} />
        <Detail label="Attempts" value={String( reminder.attempts )} />
        <Detail label="Provider message ID" value={reminder.providerMessageId || "Pending"} />
      </dl>
      { reminder.lastError && (
        <div className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-xs font-medium text-destructive">Last delivery error</p>
          <p className="mt-1 text-sm text-muted-foreground">{reminder.lastError}</p>
        </div>
      ) }
    </article>
  );
}

function Detail( { label, value }: { label: string; value: string } ) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}
