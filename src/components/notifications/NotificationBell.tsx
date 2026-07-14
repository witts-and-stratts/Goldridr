"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/admin-ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";

interface NotificationItem {
  recipientId: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [ items, setItems ] = useState<NotificationItem[]>( [] );
  const [ unreadCount, setUnreadCount ] = useState( 0 );

  useEffect( () => {
    let active = true;
    let stream: EventSource | undefined;
    const seenIds = new Set<number>();
    void fetch( "/api/admin/notifications?limit=5" )
      .then( response => response.json() )
      .then( data => {
        if ( !active || !data.success ) return;
        const notifications = data.notifications as NotificationItem[];
        notifications.forEach( item => seenIds.add( item.recipientId ) );
        setItems( notifications );
        setUnreadCount( data.unreadCount );
        const after = Math.max( 0, ...notifications.map( item => item.recipientId ) );
        stream = new EventSource( `/api/admin/notifications/stream?after=${ after }` );
        stream.addEventListener( "notification", event => {
          const notification = JSON.parse( ( event as MessageEvent ).data ) as NotificationItem;
          if ( seenIds.has( notification.recipientId ) ) return;
          seenIds.add( notification.recipientId );
          setItems( current => [ notification, ...current ].slice( 0, 5 ) );
          setUnreadCount( count => count + ( notification.readAt ? 0 : 1 ) );
        } );
      } )
      .catch( () => {} );
    return () => {
      active = false;
      stream?.close();
    };
  }, [] );

  const markVisibleRead = async () => {
    const ids = items.filter( item => !item.readAt ).map( item => item.recipientId );
    if ( ids.length === 0 ) return;
    await fetch( "/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { action: "read", recipientIds: ids } ),
    } );
    setItems( current => current.map( item => ( { ...item, readAt: item.readAt || new Date().toISOString() } ) ) );
    setUnreadCount( count => Math.max( 0, count - ids.length ) );
  };

  return (
    <Popover onOpenChange={ open => { if ( open ) void markVisibleRead(); } }>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ml-auto" aria-label={`${ unreadCount } unread notifications`}>
          <Bell className="size-4" />
          { unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-4 h-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-semibold text-destructive-foreground">
              { unreadCount > 99 ? "99+" : unreadCount }
            </span>
          ) }
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Link href="/admin/notifications" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
        </div>
        <div className="max-h-80 overflow-auto">
          { items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : items.map( item => (
            <div key={ item.recipientId } className="border-b px-4 py-3 last:border-b-0">
              <p className="text-sm font-medium">{ item.title }</p>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{ item.body }</p>
            </div>
          ) ) }
        </div>
      </PopoverContent>
    </Popover>
  );
}
