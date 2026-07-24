import { Megaphone } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Badge } from "@/components/admin-ui/badge";
import { cn } from "@/lib/utils";
import type { MessageThread, NotificationItem } from "../types";
import { relativeTime } from "../utils";
import { EmptyList } from "./empty-states";
import styles from "@/styles/notification-list.module.css";
import threadStyles from "@/styles/message-threads.module.css";

const rowInitial = { opacity: 0, y: -10, scale: 0.98 };
const rowAnimate = { opacity: 1, y: 0, scale: 1 };
const rowExit = { opacity: 0, scale: 0.96, transition: { duration: 0.15 } };
const rowTransition = { duration: 0.22, ease: [ 0.16, 1, 0.3, 1 ] as const };

function lastMessagePreview( thread: MessageThread ): string {
  for ( let i = thread.messages.length - 1; i >= 0; i-- ) {
    if ( thread.messages[ i ].category === "messages" ) return thread.messages[ i ].body;
  }
  return thread.messages[ thread.messages.length - 1 ].body;
}

export function MessageThreadList( {
  threads,
  broadcasts,
  selectedThreadKey,
  onThreadSelect,
}: {
  threads: MessageThread[];
  broadcasts: NotificationItem[];
  selectedThreadKey: string | null;
  onThreadSelect: ( thread: MessageThread ) => void;
} ) {
  if ( threads.length === 0 && broadcasts.length === 0 ) {
    return <EmptyList label="No messages in this folder." />;
  }

  return (
    <div>
      {threads.length > 0 && (
        <AnimatePresence initial={false} mode="popLayout">
          {threads.map( thread => (
            <motion.button
              key={thread.key}
              layout
              initial={rowInitial}
              animate={rowAnimate}
              exit={rowExit}
              transition={rowTransition}
              type="button"
              onClick={() => onThreadSelect( thread )}
              className={cn(
                styles.notificationRow,
                selectedThreadKey === thread.key && styles.notificationRowActive
              )}
            >
              <span className={thread.unreadCount > 0 ? styles.unreadDot : styles.readDot} />
              <span className={styles.rowBody}>
                <span className={styles.rowHead}>
                  <span className={cn( styles.rowTitle, thread.unreadCount > 0 && styles.rowTitleUnread )}>
                    {thread.riderName}
                  </span>
                  <span className={threadStyles.rowHeadMeta}>
                    <span className={styles.rowTime}>{relativeTime( thread.lastActivity )}</span>
                    {thread.unreadCount > 0 && (
                      <Badge className={threadStyles.unreadBadge}>{thread.unreadCount > 99 ? "99+" : thread.unreadCount}</Badge>
                    )}
                  </span>
                </span>
                <span className={styles.rowPreview}>{lastMessagePreview( thread )}</span>
              </span>
            </motion.button>
          ) )}
        </AnimatePresence>
      )}

      {broadcasts.length > 0 && (
        <div className={threadStyles.broadcastSection}>
          <p className={threadStyles.broadcastHeading}>Broadcasts</p>
          {broadcasts.map( item => (
            <div key={item.recipientId} className={threadStyles.broadcastRow}>
              <Megaphone className={styles.rowIcon} />
              <span className={styles.rowBody}>
                <span className={styles.rowHead}>
                  <span className={cn( styles.rowTitle, !item.readAt && styles.rowTitleUnread )}>{item.title}</span>
                  <span className={styles.rowTime}>{relativeTime( item.createdAt )}</span>
                </span>
                <span className={styles.rowPreview}>{item.body}</span>
              </span>
            </div>
          ) )}
        </div>
      )}
    </div>
  );
}
