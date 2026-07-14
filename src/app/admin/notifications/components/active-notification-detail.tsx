import type { ReactNode } from "react";
import type { FailedDelivery, Folder, NotificationItem, ReminderDelivery } from "../types";
import { EmptyDetail } from "./empty-states";
import { FailureDetail, NotificationDetail, ReminderDetail } from "./notification-details";

interface ActiveNotificationDetailProps {
  folder: Folder;
  notification?: NotificationItem;
  reminder?: ReminderDelivery;
  failure?: FailedDelivery;
  emptyNotificationLabel: string;
  onMarkRead: ( id: number ) => void;
  onMarkUnread: ( id: number ) => void;
  onDelete: ( id: number ) => void;
  onRetry: ( id: number ) => void;
}

type DetailRenderer = ( props: ActiveNotificationDetailProps ) => ReactNode;

const detailRenderers: Partial<Record<Folder, DetailRenderer>> = {
  reminders: ( { reminder } ) => (
    reminder
      ? <ReminderDetail reminder={reminder} />
      : <EmptyDetail label="Select a reminder delivery." />
  ),
  failures: ( { failure, onRetry } ) => (
    failure
      ? <FailureDetail delivery={failure} onRetry={() => onRetry( failure.id )} />
      : <EmptyDetail label="No delivery failure selected." />
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
