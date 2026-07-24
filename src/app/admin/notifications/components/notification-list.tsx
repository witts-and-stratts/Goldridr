"use client";

import type React from "react";
import { AlertTriangle, BellRing, Check, CheckSquare, MailOpen, MoreHorizontal, Square, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/admin-ui/badge";
import { Button } from "@/components/admin-ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/admin-ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { FailedDelivery, Folder, NotificationItem, ReminderDelivery } from "../types";
import { relativeTime, statusVariant } from "../utils";
import { EmptyList } from "./empty-states";
import { ListSkeleton } from "./list-skeleton";
import styles from "@/styles/notification-list.module.css";

interface NotificationListProps {
  folder: Folder;
  isLoading: boolean;
  visibleItems: NotificationItem[];
  visibleReminders: ReminderDelivery[];
  visibleFailures: FailedDelivery[];
  selectedNotificationId: number | null;
  selectedReminderId: number | null;
  selectedFailureId: number | null;
  selectedIds: Set<number>;
  isSelecting: boolean;
  openMenuId: number | null;
  onReminderSelect: ( id: number ) => void;
  onFailureSelect: ( id: number ) => void;
  onNotificationRowClick: ( item: NotificationItem, index: number, event: React.MouseEvent ) => void;
  onSetMenuId: ( id: number | null ) => void;
  onMarkRead: ( ids: number[] ) => void;
  onMarkUnread: ( ids: number[] ) => void;
  onDelete: ( ids: number[] ) => void;
  onStartSelecting: ( id: number, index: number ) => void;
  onExitSelect: () => void;
}

export function NotificationList( {
  folder,
  isLoading,
  visibleItems,
  visibleReminders,
  visibleFailures,
  selectedNotificationId,
  selectedReminderId,
  selectedFailureId,
  selectedIds,
  isSelecting,
  openMenuId,
  onReminderSelect,
  onFailureSelect,
  onNotificationRowClick,
  onSetMenuId,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onStartSelecting,
  onExitSelect,
}: NotificationListProps ) {
  if ( isLoading ) {
    return <ListSkeleton />;
  }

  if ( folder === "reminders" ) {
    return visibleReminders.length
      ? (
        <AnimatePresence initial={false} mode="popLayout">
          {visibleReminders.map( reminder => (
            <motion.button
              key={reminder.id}
              layout
              initial={rowInitial}
              animate={rowAnimate}
              exit={rowExit}
              transition={rowTransition}
              type="button"
              onClick={() => onReminderSelect( reminder.id )}
              className={cn( styles.reminderRow, selectedReminderId === reminder.id && styles.rowActive )}
            >
              <BellRing className={styles.rowIcon} />
              <span className={styles.rowBody}>
                <span className={styles.rowHead}>
                  <span className="truncate text-sm font-medium">{reminder.passengerName || reminder.recipient}</span>
                  <span className={styles.rowTime}>{relativeTime( reminder.updatedAt )}</span>
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{reminder.bookingReference} · {reminder.channel.toUpperCase()}</span>
                <Badge variant={statusVariant( reminder.status )} className="mt-2">{reminder.status.replace( "_", " " )}</Badge>
              </span>
            </motion.button>
          ) )}
        </AnimatePresence>
      )
      : <EmptyList label="No reminder deliveries yet." />;
  }

  if ( folder === "failures" ) {
    return visibleFailures.length
      ? (
        <AnimatePresence initial={false} mode="popLayout">
          {visibleFailures.map( delivery => (
            <motion.button
              key={delivery.id}
              layout
              initial={rowInitial}
              animate={rowAnimate}
              exit={rowExit}
              transition={rowTransition}
              type="button"
              onClick={() => onFailureSelect( delivery.id )}
              className={cn( styles.failureRow, selectedFailureId === delivery.id && styles.rowActive )}
            >
              <div className={styles.failureLayout}>
                <AlertTriangle className={styles.failureIcon} />
                <div className={styles.rowBody}>
                  <div className={styles.rowHead}>
                    <p className="truncate text-sm font-medium">{delivery.title}</p>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{delivery.channel.toUpperCase()} · {delivery.recipient}</p>
                  <p className={styles.failureError}>{delivery.lastError}</p>
                </div>
              </div>
            </motion.button>
          ) )}
        </AnimatePresence>
      )
      : <EmptyList label="No delivery failures." />;
  }

  return visibleItems.length
    ? (
      <AnimatePresence initial={false} mode="popLayout">
        {visibleItems.map( ( item, index ) => (
          <NotificationRow
            key={item.recipientId}
            item={item}
            index={index}
            visibleItems={visibleItems}
            selectedNotificationId={selectedNotificationId}
            selectedIds={selectedIds}
            isSelecting={isSelecting}
            openMenuId={openMenuId}
            onRowClick={onNotificationRowClick}
            onSetMenuId={onSetMenuId}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            onDelete={onDelete}
            onStartSelecting={onStartSelecting}
            onExitSelect={onExitSelect}
          />
        ) )}
      </AnimatePresence>
    )
    : <EmptyList label="No notifications in this folder." />;
}

const rowInitial = { opacity: 0, y: -10, scale: 0.98 };
const rowAnimate = { opacity: 1, y: 0, scale: 1 };
const rowExit = { opacity: 0, scale: 0.96, transition: { duration: 0.15 } };
const rowTransition = { duration: 0.22, ease: [ 0.16, 1, 0.3, 1 ] as const };

function NotificationRow( {
  item,
  index,
  visibleItems,
  selectedNotificationId,
  selectedIds,
  isSelecting,
  openMenuId,
  onRowClick,
  onSetMenuId,
  onMarkRead,
  onMarkUnread,
  onDelete,
  onStartSelecting,
  onExitSelect,
}: {
  item: NotificationItem;
  index: number;
  visibleItems: NotificationItem[];
  selectedNotificationId: number | null;
  selectedIds: Set<number>;
  isSelecting: boolean;
  openMenuId: number | null;
  onRowClick: ( item: NotificationItem, index: number, event: React.MouseEvent ) => void;
  onSetMenuId: ( id: number | null ) => void;
  onMarkRead: ( ids: number[] ) => void;
  onMarkUnread: ( ids: number[] ) => void;
  onDelete: ( ids: number[] ) => void;
  onStartSelecting: ( id: number, index: number ) => void;
  onExitSelect: () => void;
} ) {
  const isMenuTarget = isSelecting && selectedIds.has( item.recipientId ) && selectedIds.size > 1;
  const menuIds = isMenuTarget ? [ ...selectedIds ] : [ item.recipientId ];
  const menuLabel = isMenuTarget ? `${selectedIds.size} selected` : undefined;
  const selectedVisibleItems = isMenuTarget
    ? visibleItems.filter( value => selectedIds.has( value.recipientId ) )
    : [ item ];
  const hasUnread = selectedVisibleItems.some( value => !value.readAt );
  const hasRead = selectedVisibleItems.some( value => !!value.readAt );

  return (
    <motion.div
      layout
      initial={rowInitial}
      animate={rowAnimate}
      exit={rowExit}
      transition={rowTransition}
      role="button"
      tabIndex={0}
      onClick={( event ) => onRowClick( item, index, event )}
      onKeyDown={( event ) => {
        if ( event.key === "Enter" || event.key === " " ) {
          event.preventDefault();
          onRowClick( item, index, event as unknown as React.MouseEvent );
        }
      }}
      onContextMenu={( event ) => {
        event.preventDefault();
        onSetMenuId( item.recipientId );
      }}
      className={cn(
        "group",
        styles.notificationRow,
        selectedNotificationId === item.recipientId && !isSelecting && styles.notificationRowActive,
        isSelecting && selectedIds.has( item.recipientId ) && styles.notificationRowSelected
      )}
    >
      <span className={item.readAt ? styles.readDot : styles.unreadDot} />
      <span className={styles.rowBody}>
        <span className={styles.rowHead}>
          <span className={cn( styles.rowTitle, !item.readAt && styles.rowTitleUnread )}>{item.title}</span>
          <span className={styles.rowTime}>{relativeTime( item.createdAt )}</span>
        </span>
        <span className={styles.rowPreview}>{item.body}</span>
        <span className={styles.rowMeta}>{item.category}</span>
      </span>
      <DropdownMenu
        open={openMenuId === item.recipientId}
        onOpenChange={( open ) => { if ( !open ) onSetMenuId( null ); }}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={styles.menuButton}
            onClick={( event ) => {
              event.stopPropagation();
              onSetMenuId( item.recipientId );
            }}
            tabIndex={-1}
          >
            <MoreHorizontal className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {menuLabel && (
            <div className={styles.menuLabel}>{menuLabel}</div>
          )}
          {hasUnread && (
            <DropdownMenuItem onClick={( event ) => { event.stopPropagation(); onMarkRead( menuIds ); onSetMenuId( null ); }}>
              <Check className="size-3.5" />Mark as read
            </DropdownMenuItem>
          )}
          {hasRead && (
            <DropdownMenuItem onClick={( event ) => { event.stopPropagation(); onMarkUnread( menuIds ); onSetMenuId( null ); }}>
              <MailOpen className="size-3.5" />Mark as unread
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={styles.destructiveItem}
            onClick={( event ) => {
              event.stopPropagation();
              onDelete( menuIds );
              onSetMenuId( null );
              if ( isMenuTarget ) onExitSelect();
            }}
          >
            <Trash2 className="size-3.5" />Delete{menuLabel ? ` ${menuLabel}` : ""}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isSelecting ? (
            <DropdownMenuItem onClick={( event ) => { event.stopPropagation(); onStartSelecting( item.recipientId, index ); onSetMenuId( null ); }}>
              <CheckSquare className="size-3.5" />Select
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={( event ) => { event.stopPropagation(); onExitSelect(); onSetMenuId( null ); }}>
              <Square className="size-3.5" />Done selecting
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
