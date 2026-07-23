"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { qk } from "@/lib/query-keys";
import type { FailedDelivery, NotificationItem, ReminderDelivery } from "../types";

async function patchNotifications( action: string, recipientIds?: number[] ) {
  return fetch( "/api/admin/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify( { action, recipientIds } ),
  } );
}

export function useNotificationsInbox() {
  const [ readOverrides, setReadOverrides ] = useState<Map<number, string | null>>( new Map() );
  const [ deletedIds, setDeletedIds ] = useState<Set<number>>( new Set() );
  const [ retriedFailureIds, setRetriedFailureIds ] = useState<Set<number>>( new Set() );

  const { data: inboxData, refetch } = useQuery( {
    queryKey: qk.notifications(),
    queryFn: async () => {
      const [ notifRes, reminderRes ] = await Promise.all( [
        fetch( "/api/admin/notifications?limit=100" ),
        fetch( "/api/admin/reminders" ),
      ] );
      const [ notifData, reminderData ] = await Promise.all( [
        notifRes.json(),
        reminderRes.json(),
      ] );
      return {
        notifications: notifData.success ? notifData.notifications as NotificationItem[] : [],
        failedDeliveries: notifData.success ? notifData.failedDeliveries as FailedDelivery[] : [],
        reminders: reminderData.success ? reminderData.reminders as ReminderDelivery[] : [],
      };
    },
  } );

  const items = useMemo( () => {
    return ( inboxData?.notifications || [] )
      .filter( item => !deletedIds.has( item.recipientId ) )
      .map( item => readOverrides.has( item.recipientId )
        ? { ...item, readAt: readOverrides.get( item.recipientId ) ?? null }
        : item
      );
  }, [ deletedIds, inboxData?.notifications, readOverrides ] );

  const failed = useMemo( () => {
    return ( inboxData?.failedDeliveries || [] ).filter( delivery => !retriedFailureIds.has( delivery.id ) );
  }, [ inboxData?.failedDeliveries, retriedFailureIds ] );

  const reminders = inboxData?.reminders || [];

  const load = useCallback( () => { void refetch(); }, [ refetch ] );

  const markReadIds = useCallback( async ( ids: number[] ) => {
    await patchNotifications( "read", ids );
    const now = new Date().toISOString();
    setReadOverrides( current => {
      const next = new Map( current );
      ids.forEach( id => next.set( id, now ) );
      return next;
    } );
  }, [] );

  const markUnreadIds = useCallback( async ( ids: number[] ) => {
    await patchNotifications( "unread", ids );
    setReadOverrides( current => {
      const next = new Map( current );
      ids.forEach( id => next.set( id, null ) );
      return next;
    } );
  }, [] );

  const markAllRead = useCallback( async () => {
    await patchNotifications( "read" );
    const now = new Date().toISOString();
    setReadOverrides( current => {
      const next = new Map( current );
      items.forEach( item => next.set( item.recipientId, item.readAt || now ) );
      return next;
    } );
  }, [ items ] );

  const deleteIds = useCallback( async ( ids: number[] ) => {
    await patchNotifications( "delete", ids );
    setDeletedIds( current => {
      const next = new Set( current );
      ids.forEach( id => next.add( id ) );
      return next;
    } );
  }, [] );

  const retry = useCallback( async ( deliveryId: number ) => {
    const response = await fetch( "/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify( { action: "retry", deliveryId } ),
    } );
    if ( response.ok ) {
      setRetriedFailureIds( current => {
        const next = new Set( current );
        next.add( deliveryId );
        return next;
      } );
      toast.success( "Delivery queued for retry" );
    } else {
      toast.error( "Unable to retry delivery" );
    }
  }, [] );

  return {
    items,
    failed,
    reminders,
    load,
    markAllRead,
    markReadIds,
    markUnreadIds,
    deleteIds,
    retry,
  };
}
