import { type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bell,
  Check,
  Circle,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/admin-ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/admin-ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/admin-ui/select';
import { cn } from '@/lib/utils';
import type { MessageThread, NotificationItem } from '../types';
import { isRecord } from '../utils';
import {
  BookingCard,
  getBookingSummary,
  parseMetadata,
} from './notification-details';
import { MessageThreadReplyBox } from './message-thread-reply-box';
import styles from '@/styles/message-threads.module.css';

type MessageDay = {
  key: string;
  label: string;
  messages: NotificationItem[];
};

function dateKey(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function humanDayLabel(value: string): string {
  const date = new Date(value);
  const today = new Date();
  const day = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const currentDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  ).getTime();
  const dayDifference = Math.round((currentDay - day) / 86_400_000);

  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== today.getFullYear() && { year: 'numeric' }),
  }).format(date);
}

function messageTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function fullDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function groupMessagesByDay(messages: NotificationItem[]): MessageDay[] {
  return messages.reduce<MessageDay[]>((days, message) => {
    const key = dateKey(message.createdAt);
    const lastDay = days[days.length - 1];
    if (lastDay?.key === key) {
      lastDay.messages.push(message);
      return days;
    }
    return [
      ...days,
      { key, label: humanDayLabel(message.createdAt), messages: [message] },
    ];
  }, []);
}

function getMessageChannels(message: NotificationItem): string[] {
  const metadata = parseMetadata(message.metadata);
  if (!isRecord(metadata.value)) return [];
  if (Array.isArray(metadata.value.channels)) {
    return metadata.value.channels.filter(
      (channel): channel is string => typeof channel === 'string',
    );
  }
  return typeof metadata.value.channel === 'string'
    ? [metadata.value.channel]
    : [];
}

function isInboundMessage(message: NotificationItem): boolean {
  const metadata = parseMetadata(message.metadata);
  return isRecord(metadata.value) && metadata.value.direction === 'inbound';
}

function emailReadAt(message: NotificationItem): string | null {
  const metadata = parseMetadata(message.metadata);
  return isRecord(metadata.value) &&
    typeof metadata.value.emailReadAt === 'string'
    ? metadata.value.emailReadAt
    : null;
}

export interface PendingMessage {
  id: string;
  bookingReference: string;
  subject: string;
  body: string;
  status: 'sending' | 'sent' | 'failed';
}

export function MessageThreadDetail({
  thread,
  onDeleteThread,
  onMessageSent,
  onMarkRead,
}: {
  thread: MessageThread;
  onDeleteThread: (thread: MessageThread) => void;
  onMessageSent: () => unknown;
  onMarkRead: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [bookingFilter, setBookingFilter] = useState('all');
  const [trackedThreadKey, setTrackedThreadKey] = useState(thread.key);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);

  if (trackedThreadKey !== thread.key) {
    setTrackedThreadKey(thread.key);
    setBookingFilter('all');
    setPendingMessages([]);
  }

  const bookingReferences = useMemo(() => {
    const seen = new Set<string>();
    const refs: string[] = [];
    for (let i = thread.messages.length - 1; i >= 0; i--) {
      const reference = thread.messages[i].bookingReference;
      if (reference && !seen.has(reference)) {
        seen.add(reference);
        refs.push(reference);
      }
    }
    return refs;
  }, [thread.messages]);

  const visibleMessages =
    bookingFilter === 'all'
      ? thread.messages
      : thread.messages.filter(
          (message) => message.bookingReference === bookingFilter,
        );

  const visiblePending =
    bookingFilter === 'all'
      ? pendingMessages
      : pendingMessages.filter(
          (pending) => pending.bookingReference === bookingFilter,
        );

  const messageDays = useMemo(
    () => groupMessagesByDay(visibleMessages),
    [visibleMessages],
  );

  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const replyBookingReference =
    bookingFilter === 'all' ? thread.bookingReference : bookingFilter;

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [
    thread.key,
    bookingFilter,
    lastMessage?.recipientId,
    visiblePending.length,
  ]);

  const addPending = (pending: PendingMessage) =>
    setPendingMessages((current) => [...current, pending]);
  const updatePending = (id: string, patch: Partial<PendingMessage>) =>
    setPendingMessages((current) =>
      current.map((pending) =>
        pending.id === id ? { ...pending, ...patch } : pending,
      ),
    );
  const removePending = (id: string) =>
    setPendingMessages((current) =>
      current.filter((pending) => pending.id !== id),
    );

  return (
    <article className={styles.threadArticle}>
      <div className={styles.threadHeader}>
        <div className={styles.threadHeaderInfo}>
          <p className={styles.threadHeaderName}>{thread.riderName}</p>
          {thread.riderEmail && (
            <p className={styles.threadHeaderEmail}>{thread.riderEmail}</p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          {bookingReferences.length > 0 && (
            <Select value={bookingFilter} onValueChange={setBookingFilter}>
              <SelectTrigger className={styles.bookingFilterTrigger}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='all'>All bookings</SelectItem>
                {bookingReferences.map((reference) => (
                  <SelectItem key={reference} value={reference}>
                    {reference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant='ghost'
            size='sm'
            className='text-destructive hover:text-destructive'
            onClick={() => onDeleteThread(thread)}
          >
            <Trash2 className='size-3.5' />
            Delete
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className={styles.threadScroll}>
        {messageDays.map((day) => (
          <section
            key={day.key}
            className={styles.messageDay}
            aria-label={day.label}
          >
            <p className={styles.dayDivider}>{day.label}</p>
            {day.messages.map((message) =>
              message.category === 'reminders' ? (
                <ReminderChip key={message.recipientId} message={message} />
              ) : (
                <MessageBubble
                  key={message.recipientId}
                  message={message}
                  scrollRootRef={scrollRef}
                  onMarkRead={onMarkRead}
                />
              ),
            )}
          </section>
        ))}
        {visiblePending.map((pending) => (
          <PendingMessageBubble key={pending.id} pending={pending} />
        ))}
      </div>

      <MessageThreadReplyBox
        key={thread.key}
        bookingReference={replyBookingReference}
        bookingOptions={bookingReferences}
        subjectSeed={lastMessage?.title || ''}
        onSent={onMessageSent}
        onPendingAdd={addPending}
        onPendingUpdate={updatePending}
        onPendingRemove={removePending}
      />
    </article>
  );
}

function MessageBubble({
  message,
  scrollRootRef,
  onMarkRead,
}: {
  message: NotificationItem;
  scrollRootRef: RefObject<HTMLDivElement | null>;
  onMarkRead: (id: number) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const isUnread = !message.readAt;
  const isInbound = isInboundMessage(message);
  const readAt = emailReadAt(message);
  const booking = useMemo(() => {
    const metadata = parseMetadata(message.metadata);
    return getBookingSummary(metadata.value);
  }, [message.metadata]);

  useEffect(() => {
    if (!isUnread) return;
    const node = bubbleRef.current;
    const root = scrollRootRef.current;
    if (!node || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onMarkRead(message.recipientId);
          observer.disconnect();
        }
      },
      { root, threshold: 0.6 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isUnread, message.recipientId, onMarkRead, scrollRootRef]);

  return (
    <div
      ref={bubbleRef}
      className={cn(styles.bubble, isInbound && styles.bubbleIncoming)}
    >
      <div className={styles.bubbleHead}>
        <p className={styles.bubbleSubject}>{message.title}</p>
        <div className={styles.bubbleHeadRight}>
          {message.bookingReference && (
            <Popover>
              <PopoverTrigger asChild>
                <button type='button' className={styles.bookingPill}>
                  {message.bookingReference}
                </button>
              </PopoverTrigger>
              <PopoverContent
                align='end'
                className={styles.bookingPopoverContent}
              >
                {booking ? (
                  <BookingCard booking={booking} />
                ) : (
                  <p className='text-xs text-muted-foreground'>
                    No booking details available.
                  </p>
                )}
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
      <p className={styles.bubbleBody}>{message.body}</p>
      <div className={styles.bubbleFooter}>
        <div className="flex gap-2 align-middle">
          <span>
            <time
              className={styles.bubbleTime}
              dateTime={message.createdAt}
              title={fullDateTime(message.createdAt)}
              suppressHydrationWarning
            >
              {messageTime(message.createdAt)}
            </time>
          </span>
          {readAt && !isInbound && (
            <span className={ cn( styles.bubbleStatus, '-translate-y-0.5' ) }>
              <span className='px-1 opacity-50'>/</span>
              <Eye className='size-3' />
              Last read by rider{' '}
              <time
                dateTime={readAt}
                title={fullDateTime(readAt)}
                suppressHydrationWarning
              >
                {messageTime(readAt)}
              </time>
            </span>
          )}
        </div>
        <div className={styles.bubbleChannels}>
          <MessageChannels channels={getMessageChannels(message)} />
          {isInbound &&
            (isUnread ? (
              <span title='Unread'>
                <Circle className={styles.statusIconUnread} />
              </span>
            ) : (
              <span title='Read'>
                <Check className={styles.statusIconRead} />
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

function ReminderChip({ message }: { message: NotificationItem }) {
  return (
    <div className={styles.reminderChip}>
      <Bell className='size-3' />
      {message.title}
      <time
        className={styles.reminderChipTime}
        dateTime={message.createdAt}
        title={fullDateTime(message.createdAt)}
        suppressHydrationWarning
      >
        {messageTime(message.createdAt)}
      </time>
    </div>
  );
}

function MessageChannels({ channels }: { channels: string[] }) {
  return (
    <span className='flex gap-1.5'>
      {channels.includes('email') && (
        <span title='Email'>
          <Mail className='size-3' />
        </span>
      )}
      {channels.includes('sms') && (
        <span title='SMS'>
          <MessageSquare className='size-3' />
        </span>
      )}
      {channels.includes('in_app') && (
        <span title='In-app'>
          <Bell className='size-3' />
        </span>
      )}
    </span>
  );
}

function PendingMessageBubble({ pending }: { pending: PendingMessage }) {
  return (
    <div className={styles.bubble}>
      <div className={styles.bubbleHead}>
        <p className={styles.bubbleSubject}>{pending.subject}</p>
        <div className={styles.bubbleHeadRight}>
          <span className={cn(styles.bookingPill, 'pointer-events-none')}>
            {pending.bookingReference}
          </span>
        </div>
      </div>
      <p className={styles.bubbleBody}>{pending.body}</p>
      <span
        className={cn(
          styles.bubbleStatus,
          pending.status === 'failed' && styles.bubbleStatusFailed,
        )}
      >
        {pending.status === 'sending' && (
          <>
            <Loader2 className='size-3 animate-spin' />
            Sending...
          </>
        )}
        {pending.status === 'sent' && (
          <>
            <Check className='size-3' />
            Sent
          </>
        )}
        {pending.status === 'failed' && (
          <>
            <AlertCircle className='size-3' />
            Failed to send
          </>
        )}
      </span>
    </div>
  );
}
