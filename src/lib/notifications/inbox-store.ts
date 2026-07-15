import type { NotificationCategory } from "./types";
import {
  deletePocketBaseNotifications,
  getPocketBasePreferences,
  getPocketBaseUnreadCount,
  listPocketBaseNotifications,
  markPocketBaseNotificationsRead,
  markPocketBaseNotificationsUnread,
  setPocketBasePreference,
} from "./pocketbase-inbox";

// The unused first argument preserves the existing route contracts.
export function listNotifications(
  _store: unknown,
  userId: string,
  options: { unreadOnly?: boolean; category?: string; limit?: number; afterId?: number } = {}
) {
  return listPocketBaseNotifications( userId, options );
}

export function getUnreadCount( _store: unknown, userId: string ) {
  return getPocketBaseUnreadCount( userId );
}

export function markNotificationsRead( _store: unknown, userId: string, recipientIds?: number[] ) {
  return markPocketBaseNotificationsRead( userId, recipientIds );
}

export function markNotificationsUnread( _store: unknown, userId: string, recipientIds?: number[] ) {
  return markPocketBaseNotificationsUnread( userId, recipientIds );
}

export function deleteNotifications( _store: unknown, userId: string, recipientIds?: number[] ) {
  return deletePocketBaseNotifications( userId, recipientIds );
}

export function getPreferences( _store: unknown, userId: string ) {
  return getPocketBasePreferences( userId );
}

export function setPreference(
  _store: unknown,
  userId: string,
  category: NotificationCategory,
  preference: { inApp: boolean; email: boolean; sms: boolean }
) {
  return setPocketBasePreference( userId, category, preference );
}
