"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/admin-ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/admin-ui/popover";
import { foregroundNotificationDetails } from "@/lib/notifications/foreground";

interface NotificationItem {
  recipientId: number;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const router = useRouter();
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
          const foreground = foregroundNotificationDetails( notification );
          toast.info( foreground.title, {
            id: foreground.id,
            description: foreground.description,
            duration: 8_000,
            action: {
              label: "View",
              onClick: () => router.push( foreground.href ),
            },
          } );
        } );
      } )
      .catch( () => {} );
    return () => {
      active = false;
      stream?.close();
    };
  }, [ router ] );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative ml-auto" aria-label={`${ unreadCount } unread inbox items`}>
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
          <p className="text-sm font-semibold">Inbox</p>
          <Link href="/admin/notifications" className="text-xs text-muted-foreground hover:text-foreground">View inbox</Link>
        </div>
        <div className="max-h-80 overflow-auto">
          { items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No inbox items yet.</p>
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
