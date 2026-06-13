import type {
  AdminBooking,
  AdminChauffeur,
  AdminSettings,
  AppNotification,
  BlockedSlot,
  Chauffeur,
  DiscountCode,
  DiscountKind,
  DriverRide,
  FailedDelivery,
  MessageRecipient,
  MockSmsMessage,
  NotificationCategory,
  NotificationPreference,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ReminderBooking,
  ReminderDelivery,
  Role,
  SessionUser,
} from "@/lib/types";

// Point this at the Goldridr Next.js server. On a physical device use your
// machine's LAN IP (e.g. http://192.168.1.20:3000) — localhost is the phone.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;

  constructor( message: string, status: number ) {
    super( message );
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  token?: string | null;
  body?: unknown;
}

async function request<T>( path: string, options: RequestOptions = {} ): Promise<T> {
  const { method = "GET", token, body } = options;

  let response: Response;
  try {
    response = await fetch( `${ API_URL }${ path }`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...( token ? { Authorization: `Bearer ${ token }` } : {} ),
      },
      body: body === undefined ? undefined : JSON.stringify( body ),
    } );
  } catch {
    throw new ApiError( `Could not reach the server at ${ API_URL }`, 0 );
  }

  const data = await response.json().catch( () => ( {} ) );
  if ( !response.ok || data.success === false ) {
    throw new ApiError( data.error || `Request failed (${ response.status })`, response.status );
  }
  return data as T;
}

export function login( email: string, password: string ) {
  return request<{
    token: string;
    role: Role;
    user: SessionUser;
    chauffeur?: Chauffeur;
  }>( "/api/auth/token", {
    method: "POST",
    body: { email, password },
  } );
}

export function getRides( token: string ) {
  return request<{ rides: DriverRide[] }>( "/api/driver/rides", { token } );
}

export function getRide( token: string, reference: string ) {
  return request<{ ride: DriverRide }>( `/api/driver/rides/${ encodeURIComponent( reference ) }`, { token } );
}

export function updateRideStatus( token: string, reference: string, status: string ) {
  return request<{ ride: DriverRide }>( `/api/driver/rides/${ encodeURIComponent( reference ) }`, {
    method: "PATCH",
    token,
    body: { status },
  } );
}

export function getBlockedSlots( token: string ) {
  return request<{ blocks: BlockedSlot[] }>( "/api/driver/blocked", { token } );
}

export function createBlockedSlot(
  token: string,
  block: {
    title: string;
    date: string;
    endDate?: string;
    isFullDay?: boolean;
    time?: string;
    duration?: number;
    recurring?: string;
    chauffeurId?: number | null;
  }
) {
  return request<{ block: BlockedSlot }>( "/api/driver/blocked", {
    method: "POST",
    token,
    body: block,
  } );
}

export function deleteBlockedSlot( token: string, id: number ) {
  return request<object>( `/api/driver/blocked?id=${ id }`, { method: "DELETE", token } );
}

export function scanRiderCode( token: string, payload: string ) {
  return request<{ ride: DriverRide; assignedToYou: boolean }>( "/api/driver/scan", {
    method: "POST",
    token,
    body: { payload },
  } );
}

// ---------------------------------------------------------------------------
// Admin endpoints — same /api/admin/* routes the web dashboard uses. The
// server accepts the bearer token in place of the session cookie.
// ---------------------------------------------------------------------------

export function getAdminBookings( token: string ) {
  return request<{ bookings: AdminBooking[] }>( "/api/admin/bookings", { token } );
}

export function updateAdminBooking(
  token: string,
  reference: string,
  patch: {
    status?: string;
    chauffeurId?: number | null;
    date?: string;
    time?: string;
    duration?: number;
  }
) {
  return request<{ message: string }>( "/api/admin/bookings", {
    method: "PATCH",
    token,
    body: { reference, ...patch },
  } );
}

export function deleteAdminBooking( token: string, reference: string ) {
  return request<object>(
    `/api/admin/bookings?reference=${ encodeURIComponent( reference ) }`,
    { method: "DELETE", token }
  );
}

export function getAdminChauffeurs( token: string ) {
  return request<{ chauffeurs: AdminChauffeur[] }>( "/api/admin/chauffeurs", { token } );
}

export function createAdminChauffeur(
  token: string,
  chauffeur: { name: string; email: string; phone: string; password: string }
) {
  return request<{ chauffeur: AdminChauffeur }>( "/api/admin/chauffeurs", {
    method: "POST",
    token,
    body: chauffeur,
  } );
}

export function deleteAdminChauffeur( token: string, id: number ) {
  return request<object>( `/api/admin/chauffeurs?id=${ id }`, { method: "DELETE", token } );
}

export function getDiscountCodes( token: string ) {
  return request<{ discountCodes: DiscountCode[] }>( "/api/admin/discount-codes", { token } );
}

export function createDiscountCode(
  token: string,
  code: {
    code: string;
    label: string;
    kind: DiscountKind;
    value: number;
    active?: boolean;
    maxRedemptions?: number | null;
    expiresAt?: string | null;
  }
) {
  return request<{ discountCode: DiscountCode }>( "/api/admin/discount-codes", {
    method: "POST",
    token,
    body: code,
  } );
}

export function updateDiscountCode(
  token: string,
  patch: {
    id: number;
    code?: string;
    label?: string;
    kind?: DiscountKind;
    value?: number;
    active?: boolean;
    maxRedemptions?: number | null;
    expiresAt?: string | null;
  }
) {
  return request<{ discountCode: DiscountCode }>( "/api/admin/discount-codes", {
    method: "PATCH",
    token,
    body: patch,
  } );
}

export function deleteDiscountCode( token: string, id: number ) {
  return request<object>( `/api/admin/discount-codes?id=${ id }`, { method: "DELETE", token } );
}

export function getPayments( token: string ) {
  return request<{ payments: Payment[] }>( "/api/admin/payments", { token } );
}

export function createPayment(
  token: string,
  payment: {
    bookingReference: string;
    amountCents: number;
    currency?: string;
    method: PaymentMethod;
    status: PaymentStatus;
    transactionReference?: string | null;
    notes?: string | null;
  }
) {
  return request<{ payment: Payment }>( "/api/admin/payments", {
    method: "POST",
    token,
    body: payment,
  } );
}

export function updatePayment(
  token: string,
  patch: {
    id: number;
    amountCents?: number;
    method?: PaymentMethod;
    status?: PaymentStatus;
    transactionReference?: string | null;
    notes?: string | null;
  }
) {
  return request<{ payment: Payment }>( "/api/admin/payments", {
    method: "PATCH",
    token,
    body: patch,
  } );
}

export function deletePayment( token: string, id: number ) {
  return request<object>( `/api/admin/payments?id=${ id }`, { method: "DELETE", token } );
}

export function getAdminSettings( token: string ) {
  return request<{ settings: AdminSettings }>( "/api/admin/settings", { token } );
}

export function saveAdminSettings( token: string, settings: AdminSettings ) {
  return request<{ settings: AdminSettings }>( "/api/admin/settings", {
    method: "PUT",
    token,
    body: settings,
  } );
}

export function getNotifications(
  token: string,
  options: { unreadOnly?: boolean; limit?: number } = {}
) {
  const params = new URLSearchParams();
  if ( options.unreadOnly ) params.set( "unread", "true" );
  if ( options.limit ) params.set( "limit", String( options.limit ) );
  const query = params.toString();
  return request<{ notifications: AppNotification[]; unreadCount: number }>(
    `/api/driver/notifications${ query ? `?${ query }` : "" }`,
    { token }
  );
}

export function getAdminNotificationOperations( token: string ) {
  return request<{
    notifications: AppNotification[];
    unreadCount: number;
    failedDeliveries: FailedDelivery[];
  }>( "/api/admin/notifications?limit=100", { token } );
}

export function retryNotificationDelivery( token: string, deliveryId: number ) {
  return request<object>( "/api/admin/notifications", {
    method: "PATCH",
    token,
    body: { action: "retry", deliveryId },
  } );
}

export function getMessageRecipients( token: string ) {
  return request<{ riders: MessageRecipient[] }>( "/api/admin/messages", { token } );
}

export function sendMessage(
  token: string,
  payload: {
    kind: "booking" | "recipients";
    reference?: string;
    riderReferences?: string[];
    chauffeurIds?: number[];
    subject: string;
    message: string;
    channels: string[];
  }
) {
  return request<{ notificationId?: number; notificationIds?: number[]; skippedSms?: string[] }>(
    "/api/admin/messages",
    { method: "POST", token, body: payload }
  );
}

export function getReminderOperations( token: string ) {
  return request<{ reminders: ReminderDelivery[]; bookings: ReminderBooking[] }>(
    "/api/admin/reminders",
    { token }
  );
}

export function sendReminder( token: string, reference: string, channels: string[] ) {
  return request<{ notificationId: number }>( "/api/admin/reminders", {
    method: "POST",
    token,
    body: { reference, channels },
  } );
}

export function getNotificationPreferences( token: string ) {
  return request<{ preferences: NotificationPreference[] }>(
    "/api/admin/notifications/preferences",
    { token }
  );
}

export function saveNotificationPreference(
  token: string,
  category: NotificationCategory,
  preference: { inApp: boolean; email: boolean; sms: boolean }
) {
  return request<object>( "/api/admin/notifications/preferences", {
    method: "PUT",
    token,
    body: { category, ...preference },
  } );
}

export function getMockSmsMessages( token: string ) {
  return request<{ messages: MockSmsMessage[]; transport: string }>(
    "/api/admin/testing/sms?limit=50",
    { token }
  );
}

export function createMockSms(
  token: string,
  payload: { to: string; from: string; body: string }
) {
  return request<{ message: MockSmsMessage }>( "/api/admin/testing/sms", {
    method: "POST",
    token,
    body: payload,
  } );
}

export function updateMockSmsStatus( token: string, sid: string, status: string ) {
  return request<object>( "/api/admin/testing/sms", {
    method: "PATCH",
    token,
    body: { sid, status },
  } );
}

export function clearMockSmsMessages( token: string ) {
  return request<{ deleted: number }>( "/api/admin/testing/sms", {
    method: "DELETE",
    token,
  } );
}

export function calendarFeedUrl( token: string ) {
  return `${ API_URL }/api/admin/bookings/feed?token=${ encodeURIComponent( token ) }`;
}

export function markNotificationsRead( token: string, recipientIds?: number[] ) {
  return request<{ updated: number }>( "/api/driver/notifications", {
    method: "PATCH",
    token,
    body: { action: "read", ...( recipientIds ? { recipientIds } : {} ) },
  } );
}

export function registerPushToken( token: string, pushToken: string, platform: string ) {
  return request<object>( "/api/driver/push-token", {
    method: "POST",
    token,
    body: { token: pushToken, platform },
  } );
}

export function unregisterPushToken( token: string, pushToken: string ) {
  return request<object>( "/api/driver/push-token", {
    method: "DELETE",
    token,
    body: { token: pushToken },
  } );
}
