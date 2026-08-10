import type { ReactNode } from "react";
import type { FailedDelivery, Folder, MessageThread, MockSmsMessage, NotificationItem, ReminderDelivery } from "../types";
import { EmptyDetail } from "./empty-states";
import { MessageThreadDetail } from "./message-thread-detail";
import { FailureDetail, NotificationDetail, ReminderDetail, SmsMessageDetail } from "./notification-details";

interface ActiveNotificationDetailProps {
  folder: Folder;
  notification?: NotificationItem;
  reminder?: ReminderDelivery;
  failure?: FailedDelivery;
  thread?: MessageThread;
  smsMessage?: MockSmsMessage;
  emptyNotificationLabel: string;
  onMarkRead: ( id: number ) => void;
  onMarkUnread: ( id: number ) => void;
  onDelete: ( id: number ) => void;
  onRetry: ( id: number ) => void;
  onDeleteFailure: ( id: number ) => Promise<boolean>;
  onDeleteThread: ( thread: MessageThread ) => void;
  onMessageSent: () => unknown;
}

type DetailRenderer = ( props: ActiveNotificationDetailProps ) => ReactNode;

const detailRenderers: Partial<Record<Folder, DetailRenderer>> = {
  reminders: ( { reminder } ) => (
    reminder
      ? <ReminderDetail reminder={reminder} />
      : <EmptyDetail label="Select a reminder delivery." />
  ),
  failures: ( { failure, onRetry, onDeleteFailure } ) => (
    failure
      ? <FailureDetail delivery={failure} onRetry={() => onRetry( failure.id )} onDelete={() => onDeleteFailure( failure.id )} />
      : <EmptyDetail label="No delivery failure selected." />
  ),
  messages: ( { thread, onDeleteThread, onMessageSent, onMarkRead, emptyNotificationLabel } ) => (
    thread
      ? <MessageThreadDetail thread={thread} onDeleteThread={onDeleteThread} onMessageSent={onMessageSent} onMarkRead={onMarkRead} />
      : <EmptyDetail label={emptyNotificationLabel} />
  ),
  sms: ( { smsMessage } ) => (
    smsMessage
      ? <SmsMessageDetail message={smsMessage} />
      : <EmptyDetail label="Select a mock SMS message." />
  ),
};

function renderNotificationDetail( {
  notification,
  emptyNotificationLabel,
  onMarkRead,
  onMarkUnread,
  onDelete,
}: ActiveNotificationDetailProps ) {
  return notification
    ? (
        <NotificationDetail
          item={notification}
          onMarkRead={() => onMarkRead( notification.recipientId )}
          onMarkUnread={() => onMarkUnread( notification.recipientId )}
          onDelete={() => onDelete( notification.recipientId )}
        />
      )
    : <EmptyDetail label={emptyNotificationLabel} />;
}

export function ActiveNotificationDetail( props: ActiveNotificationDetailProps ) {
  const renderDetail = detailRenderers[ props.folder ] || renderNotificationDetail;
  return renderDetail( props );
}
