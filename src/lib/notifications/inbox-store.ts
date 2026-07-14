import type { DatabaseLike } from "@/lib/db-client";
import {
  isPocketBaseConfigured,
  isPocketBaseNotificationReadEnabled,
  isPocketBaseNotificationWriteEnabled,
} from "@/lib/pocketbase/config";
import type { NotificationCategory } from "./types";
import {
  deleteNotifications as deleteSqliteNotifications,
  getPreferences as getSqlitePreferences,
  getUnreadCount as getSqliteUnreadCount,
  listNotifications as listSqliteNotifications,
  markNotificationsRead as markSqliteNotificationsRead,
  markNotificationsUnread as markSqliteNotificationsUnread,
  setPreference as setSqlitePreference,
} from "./store";
import {
  deletePocketBaseNotifications,
  getPocketBasePreferences,
  getPocketBaseUnreadCount,
  listPocketBaseNotifications,
  markPocketBaseNotificationsRead,
  markPocketBaseNotificationsUnread,
  setPocketBasePreference,
} from "./pocketbase-inbox";

function usePocketBase(): boolean {
  if ( !isPocketBaseNotificationReadEnabled() ) return false;
  if ( !isPocketBaseConfigured() ) {
    throw new Error( "PocketBase notification reads are enabled but PocketBase is not configured" );
  }
  return true;
}

function mirrorPocketBaseWrites(): boolean {
  if ( !isPocketBaseNotificationWriteEnabled() ) return false;
  if ( !isPocketBaseConfigured() ) {
    throw new Error( "PocketBase notification writes are enabled but PocketBase is not configured" );
  }
  return true;
}

export function listNotifications(
  db: DatabaseLike,
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number; afterId?: number } = {}
) {
  return usePocketBase()
    ? listPocketBaseNotifications( userId, options )
    : listSqliteNotifications( db, userId, options );
}

export function getUnreadCount( db: DatabaseLike, userId: string ) {
  return usePocketBase() ? getPocketBaseUnreadCount( userId ) : getSqliteUnreadCount( db, userId );
}

export async function markNotificationsRead( db: DatabaseLike, userId: string, recipientIds?: number[] ) {
  if ( usePocketBase() ) {
    const updated = await markPocketBaseNotificationsRead( userId, recipientIds );
    await markSqliteNotificationsRead( db, userId, recipientIds );
    return updated;
  }
  const updated = await markSqliteNotificationsRead( db, userId, recipientIds );
  if ( mirrorPocketBaseWrites() ) await markPocketBaseNotificationsRead( userId, recipientIds );
  return updated;
}

export async function markNotificationsUnread( db: DatabaseLike, userId: string, recipientIds?: number[] ) {
  if ( usePocketBase() ) {
    const updated = await markPocketBaseNotificationsUnread( userId, recipientIds );
    await markSqliteNotificationsUnread( db, userId, recipientIds );
    return updated;
  }
  const updated = await markSqliteNotificationsUnread( db, userId, recipientIds );
  if ( mirrorPocketBaseWrites() ) await markPocketBaseNotificationsUnread( userId, recipientIds );
  return updated;
}

export async function deleteNotifications( db: DatabaseLike, userId: string, recipientIds?: number[] ) {
  if ( usePocketBase() ) {
    const deleted = await deletePocketBaseNotifications( userId, recipientIds );
    await deleteSqliteNotifications( db, userId, recipientIds );
    return deleted;
  }
  const deleted = await deleteSqliteNotifications( db, userId, recipientIds );
  if ( mirrorPocketBaseWrites() ) await deletePocketBaseNotifications( userId, recipientIds );
  return deleted;
}

export function getPreferences( db: DatabaseLike, userId: string ) {
  return usePocketBase() ? getPocketBasePreferences( userId ) : getSqlitePreferences( db, userId );
}

export async function setPreference(
  db: DatabaseLike,
  userId: string,
  category: NotificationCategory,
  preference: { inApp: boolean; email: boolean; sms: boolean }
) {
  if ( usePocketBase() ) {
    await setPocketBasePreference( userId, category, preference );
    await setSqlitePreference( db, userId, category, preference );
    return;
  }
  await setSqlitePreference( db, userId, category, preference );
  if ( mirrorPocketBaseWrites() ) await setPocketBasePreference( userId, category, preference );
}
