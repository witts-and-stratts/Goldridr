"use client";

import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BellRing, Check, CheckSquare, Inbox, MailOpen, RefreshCw, Search, Send, Trash2 } from "lucide-react";
import { MessageComposer } from "@/components/notifications/MessageComposer";
import { ReminderComposer } from "@/components/notifications/ReminderComposer";
import { Button } from "@/components/admin-ui/button";
import { Input } from "@/components/admin-ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/admin-ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/admin-ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { qk } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAdmin } from "../context";
import { ActiveNotificationDetail } from "./components/active-notification-detail";
import { NotificationList } from "./components/notification-list";
import { SummaryTile } from "./components/summary-tile";
import { activeReminderStatuses, folders } from "./constants";
import { useNotificationsInbox } from "./hooks/use-notifications-inbox";
import type { Folder, NotificationItem } from "./types";
import { filterFailures, filterNotifications, filterReminders } from "./utils";
import styles from "@/styles/notifications.module.css";

export default function NotificationsPage() {
  const { session } = useAdmin();
  const queryClient = useQueryClient();
  const {
    items,
    failed,
    reminders,
    load,
    markReadAfterOpen,
    markAllRead,
    markReadIds,
    markUnreadIds,
    deleteIds,
    retry,
  } = useNotificationsInbox();

  const [ folder, setFolder ] = useState<Folder>( "inbox" );
  const [ selectedNotificationId, setSelectedNotificationId ] = useState<number | null>( null );
  const [ selectedReminderId, setSelectedReminderId ] = useState<number | null>( null );
  const [ selectedFailureId, setSelectedFailureId ] = useState<number | null>( null );
  const [ composeOpen, setComposeOpen ] = useState( false );
  const [ reminderOpen, setReminderOpen ] = useState( false );
  const [ search, setSearch ] = useState( "" );
  const [ unreadOnly, setUnreadOnly ] = useState( false );
  const [ mobileDetailOpen, setMobileDetailOpen ] = useState( false );
  const [ isSelecting, setIsSelecting ] = useState( false );
  const [ selectedIds, setSelectedIds ] = useState<Set<number>>( new Set() );
  const [ openMenuId, setOpenMenuId ] = useState<number | null>( null );
  const lastClickedIndexRef = useRef<number | null>( null );

  const visibleItems = useMemo(
    () => filterNotifications( { folder, items, search, unreadOnly } ),
    [ folder, items, search, unreadOnly ]
  );
  const visibleReminders = useMemo( () => filterReminders( reminders, search ), [ reminders, search ] );
  const visibleFailures = useMemo( () => filterFailures( failed, search ), [ failed, search ] );

  const selectedNotification = visibleItems.find( item => item.recipientId === selectedNotificationId ) || visibleItems[ 0 ];
  const selectedReminder = visibleReminders.find( reminder => reminder.id === selectedReminderId ) || visibleReminders[ 0 ];
  const selectedFailure = visibleFailures.find( delivery => delivery.id === selectedFailureId ) || visibleFailures[ 0 ];
  const unreadCount = useMemo( () => items.filter( item => !item.readAt ).length, [ items ] );
  const queuedReminderCount = useMemo(
    () => reminders.filter( reminder => activeReminderStatuses.has( reminder.status ) ).length,
    [ reminders ]
  );
  const deliveredReminderCount = useMemo(
    () => reminders.filter( reminder => reminder.status === "delivered" ).length,
    [ reminders ]
  );
  const folderCounts = useMemo<Partial<Record<Folder, number>>>( () => ( {
    inbox: items.length,
    unread: unreadCount,
    bookings: items.filter( item => item.category === "bookings" ).length,
    reminders: reminders.length,
    messages: items.filter( item => item.category === "messages" ).length,
    system: items.filter( item => item.category === "system" ).length,
    failures: failed.length,
  } ), [ failed.length, items, reminders.length, unreadCount ] );
  const folderLabel = folders.find( item => item.value === folder )?.label || "notifications";

  const openMobileDetail = useCallback( () => {
    if ( window.matchMedia( "(max-width: 1023px)" ).matches ) setMobileDetailOpen( true );
  }, [] );

  useEffect( () => {
    const desktopQuery = window.matchMedia( "(min-width: 1024px)" );
    const closeOnDesktop = ( event: MediaQueryListEvent ) => {
      if ( event.matches ) setMobileDetailOpen( false );
    };
    desktopQuery.addEventListener( "change", closeOnDesktop );
    return () => desktopQuery.removeEventListener( "change", closeOnDesktop );
  }, [] );

  const setFolderAndClearSearch = useCallback( ( value: Folder ) => {
    setFolder( value );
    setSearch( "" );
  }, [] );

  const selectNotification = useCallback( async ( item: NotificationItem ) => {
    lastClickedIndexRef.current = visibleItems.findIndex( value => value.recipientId === item.recipientId );
    setSelectedNotificationId( item.recipientId );
    openMobileDetail();
    await markReadAfterOpen( item );
  }, [ markReadAfterOpen, openMobileDetail, visibleItems ] );

  const exitSelect = useCallback( () => {
    setIsSelecting( false );
    setSelectedIds( new Set() );
    lastClickedIndexRef.current = null;
  }, [] );

  const startSelecting = useCallback( ( id: number, index: number ) => {
    setIsSelecting( true );
    lastClickedIndexRef.current = index;
    setSelectedIds( new Set( [ id ] ) );
  }, [] );

  const handleRowClick = useCallback( ( item: NotificationItem, index: number, event: React.MouseEvent ) => {
    if ( event.shiftKey || isSelecting ) {
      if ( !isSelecting ) {
        setIsSelecting( true );
        if ( event.shiftKey && lastClickedIndexRef.current !== null ) {
          const lo = Math.min( lastClickedIndexRef.current, index );
          const hi = Math.max( lastClickedIndexRef.current, index );
          setSelectedIds( new Set( visibleItems.slice( lo, hi + 1 ).map( value => value.recipientId ) ) );
        } else {
          lastClickedIndexRef.current = index;
          setSelectedIds( new Set( [ item.recipientId ] ) );
        }
        return;
      }
      if ( event.shiftKey && lastClickedIndexRef.current !== null ) {
        const lo = Math.min( lastClickedIndexRef.current, index );
        const hi = Math.max( lastClickedIndexRef.current, index );
        const rangeIds = visibleItems.slice( lo, hi + 1 ).map( value => value.recipientId );
        setSelectedIds( current => {
          const next = new Set( current );
          rangeIds.forEach( id => next.add( id ) );
          return next;
        } );
      } else {
        setSelectedIds( current => {
          const next = new Set( current );
          if ( next.has( item.recipientId ) ) next.delete( item.recipientId );
          else next.add( item.recipientId );
          return next;
        } );
      }
      lastClickedIndexRef.current = index;
    } else {
      void selectNotification( item );
    }
  }, [ isSelecting, selectNotification, visibleItems ] );

  const toggleSelectAll = useCallback( () => {
    if ( selectedIds.size === visibleItems.length ) setSelectedIds( new Set() );
    else setSelectedIds( new Set( visibleItems.map( item => item.recipientId ) ) );
  }, [ selectedIds.size, visibleItems ] );

  useEffect( () => {
    const onKeyDown = ( event: KeyboardEvent ) => {
      const tag = ( event.target as HTMLElement ).tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";
      if ( ( event.metaKey || event.ctrlKey ) && event.key === "a" && !isTyping ) {
        event.preventDefault();
        if ( !isSelecting ) setIsSelecting( true );
        toggleSelectAll();
      }
      if ( event.key === "Escape" && isSelecting ) {
        exitSelect();
      }
    };
    window.addEventListener( "keydown", onKeyDown );
    return () => window.removeEventListener( "keydown", onKeyDown );
  }, [ exitSelect, isSelecting, toggleSelectAll ] );

  const markRead = useCallback( ( ids: number[] ) => {
    void markReadIds( ids );
  }, [ markReadIds ] );

  const markUnread = useCallback( ( ids: number[] ) => {
    void markUnreadIds( ids );
  }, [ markUnreadIds ] );

  const deleteNotifications = useCallback( async ( ids: number[] ) => {
    await deleteIds( ids );
    if ( selectedNotificationId && ids.includes( selectedNotificationId ) ) setSelectedNotificationId( null );
    setSelectedIds( current => {
      const next = new Set( current );
      ids.forEach( id => next.delete( id ) );
      return next;
    } );
  }, [ deleteIds, selectedNotificationId ] );

  const deleteSelected = useCallback( ( ids: number[] ) => {
    void deleteNotifications( ids );
  }, [ deleteNotifications ] );

  const selectReminder = useCallback( ( id: number ) => {
    setSelectedReminderId( id );
    openMobileDetail();
  }, [ openMobileDetail ] );

  const selectFailure = useCallback( ( id: number ) => {
    setSelectedFailureId( id );
    openMobileDetail();
  }, [ openMobileDetail ] );

  const visibleFolderCount = folder === "reminders"
    ? visibleReminders.length
    : folder === "failures"
      ? visibleFailures.length
      : visibleItems.length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Inbox</h1>
            <p className={styles.subtitle}>{unreadCount} unread notification{unreadCount === 1 ? "" : "s"}</p>
          </div>
          <div className={styles.actions}>
            <Button variant="outline" size="sm" onClick={() => setReminderOpen( true )}>
              <BellRing className="size-3.5" />Send reminder
            </Button>
            <Button size="sm" onClick={() => setComposeOpen( true )}>
              <Send className="size-3.5" />Send message
            </Button>
          </div>
        </div>
        <div className={styles.summaryGrid}>
          <SummaryTile icon={Inbox} label="Total notifications" value={items.length} detail={`${visibleItems.length} in current view`} />
          <SummaryTile icon={MailOpen} label="Unread" value={unreadCount} detail={unreadCount ? "Needs review" : "Inbox clear"} />
          <SummaryTile icon={BellRing} label="Reminder deliveries" value={reminders.length} detail={`${deliveredReminderCount} delivered, ${queuedReminderCount} queued`} />
          <SummaryTile icon={AlertTriangle} label="Failures" value={failed.length} detail={failed.length ? "Retry from failures" : "No blocked deliveries"} tone={failed.length ? "destructive" : "default"} />
        </div>
        <div className={styles.mobileFolderSelect}>
          <Select value={folder} onValueChange={value => setFolderAndClearSearch( value as Folder )}>
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

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <nav className={styles.sidebarNav}>
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
                    onClick={() => setFolderAndClearSearch( item.value )}
                    className={cn( styles.sidebarButton, folder === item.value && styles.sidebarButtonActive )}
                  >
                    <item.icon className="size-4" />
                    <span className="sr-only">{item.label}</span>
                    {count !== undefined && count > 0 && (
                      <span className={styles.sidebarBadge}>
                        {count > 99 ? "99+" : count}
                      </span>
                    )}
                  </button>
                );
              } ) }
          </nav>
          <div className={styles.sidebarFooter}>
            <Button variant="ghost" size="icon" className="w-full" onClick={() => { void markAllRead(); }} title="Mark all read">
              <Check className="size-3.5" /><span className="sr-only">Mark all read</span>
            </Button>
          </div>
        </aside>

        <section className={styles.listPane}>
          <div className={styles.listToolbar}>
            <div className={styles.listToolbarHeader}>
              <div>
                <span className={styles.folderTitle}>{folderLabel}</span>
                <p className={styles.folderMeta}>
                  {folderCounts[ folder ] || 0} total{search.trim() ? `, ${visibleFolderCount} matching search` : ""}
                </p>
              </div>
              <div className={styles.toolbarActions}>
                {isSelecting && (
                  <span className={styles.selectedCount}>{selectedIds.size} selected</span>
                )}
                <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh"><RefreshCw className="size-3.5" /></Button>
              </div>
            </div>
            {!["reminders", "failures"].includes( folder ) && (
              <div className={styles.unreadFilter}>
                {!isSelecting && (
                  <Label className={styles.unreadFilterLabel}>
                    Unread only
                    <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} className="shadow-none" />
                  </Label>
                )}
              </div>
            )}
            <div className={styles.searchWrap}>
              <Search className={styles.searchIcon} />
              <Input value={search} onChange={event => setSearch( event.target.value )} placeholder={`Search ${folderLabel.toLowerCase()}...`} className={styles.searchInput} />
            </div>
            {isSelecting && visibleItems.length > 0 && (
              <div className={styles.bulkBar}>
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  <CheckSquare className="size-3.5" />{selectedIds.size === visibleItems.length ? "Clear all" : "Select all"}
                </Button>
                <Button variant="ghost" size="sm" disabled={selectedIds.size === 0} onClick={() => markRead( [ ...selectedIds ] )}>
                  <Check className="size-3.5" />Mark read
                </Button>
                <Button variant="ghost" size="sm" disabled={selectedIds.size === 0} onClick={() => markUnread( [ ...selectedIds ] )}>
                  <MailOpen className="size-3.5" />Mark unread
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled={selectedIds.size === 0} onClick={() => deleteSelected( [ ...selectedIds ] )}>
                  <Trash2 className="size-3.5" />Delete
                </Button>
                <Button variant="ghost" size="sm" className={styles.bulkDone} onClick={exitSelect}>Done</Button>
              </div>
            )}
          </div>

          <NotificationList
            folder={folder}
            visibleItems={visibleItems}
            visibleReminders={visibleReminders}
            visibleFailures={visibleFailures}
            selectedNotificationId={selectedNotificationId}
            selectedReminderId={selectedReminderId}
            selectedFailureId={selectedFailureId}
            selectedIds={selectedIds}
            isSelecting={isSelecting}
            openMenuId={openMenuId}
            onReminderSelect={selectReminder}
            onFailureSelect={selectFailure}
            onNotificationRowClick={handleRowClick}
            onSetMenuId={setOpenMenuId}
            onMarkRead={markRead}
            onMarkUnread={markUnread}
            onDelete={deleteSelected}
            onStartSelecting={startSelecting}
            onExitSelect={exitSelect}
          />
        </section>

        <section className={styles.detailPane}>
          <ActiveNotificationDetail
            folder={folder}
            notification={selectedNotification}
            reminder={selectedReminder}
            failure={selectedFailure}
            emptyNotificationLabel="Select a notification to read it."
            onMarkRead={id => markRead( [ id ] )}
            onMarkUnread={id => markUnread( [ id ] )}
            onDelete={id => deleteSelected( [ id ] )}
            onRetry={id => { void retry( id ); }}
          />
        </section>
      </div>

      <MessageComposer open={composeOpen} onOpenChange={setComposeOpen} onSent={() => queryClient.invalidateQueries( { queryKey: qk.notifications() } )} />
      <ReminderComposer open={reminderOpen} onOpenChange={setReminderOpen} onSent={() => { setFolder( "reminders" ); queryClient.invalidateQueries( { queryKey: qk.notifications() } ); }} />
      <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <SheetContent side="right" className={styles.sheetContent}>
          <SheetTitle className="sr-only">Inbox detail</SheetTitle>
          <SheetDescription className="sr-only">Selected notification or reminder details.</SheetDescription>
          <ActiveNotificationDetail
            folder={folder}
            notification={selectedNotification}
            reminder={selectedReminder}
            failure={selectedFailure}
            emptyNotificationLabel="No detail available."
            onMarkRead={id => markRead( [ id ] )}
            onMarkUnread={id => markUnread( [ id ] )}
            onDelete={id => {
              deleteSelected( [ id ] );
              setMobileDetailOpen( false );
            }}
            onRetry={id => { void retry( id ); }}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
