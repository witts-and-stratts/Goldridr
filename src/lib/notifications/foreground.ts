export interface ForegroundNotificationInput {
  recipientId: number;
  title: string;
  body: string;
}

export function foregroundNotificationDetails( notification: ForegroundNotificationInput ) {
  if ( !Number.isSafeInteger( notification.recipientId ) || notification.recipientId < 1 ) {
    throw new Error( "Foreground notification requires a valid recipient ID" );
  }

  return {
    id: `admin-inbox-${ notification.recipientId }`,
    title: notification.title.trim().slice( 0, 120 ) || "New inbox notification",
    description: notification.body.trim().slice( 0, 240 ),
    href: `/admin/notifications?item=${ notification.recipientId }`,
  };
}
