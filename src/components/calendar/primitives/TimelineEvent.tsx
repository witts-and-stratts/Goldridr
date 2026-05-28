import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarView } from "../types";
import { getEventStyles } from "../utils";

interface TimelineEventProps {
  event: CalendarEvent;
  view: CalendarView;
  style: React.CSSProperties;
  /** Override: render custom content inside the card */
  renderContent?: (event: CalendarEvent, view: CalendarView) => React.ReactNode;
  onClick?: (event: CalendarEvent) => void;
  compact?: boolean;
}

/** Default event card rendered inside day/week timeline. */
export function TimelineEvent({
  event,
  view,
  style,
  renderContent,
  onClick,
  compact = false,
}: TimelineEventProps) {
  const s = getEventStyles(event.color);

  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={() => onClick?.(event)}
      className={cn(
        "absolute rounded border-l-4 cursor-pointer group overflow-hidden hover:brightness-110 transition-all",
        compact ? "inset-x-0.5 p-1.5" : "left-2 right-2 p-2",
        s.bg, s.border,
      )}
      style={style}
    >
      {renderContent ? (
        renderContent(event, view)
      ) : (
        <>
          <div className={cn("flex gap-1.5 items-center", compact ? "text-[8px]" : "text-[9px]")}>
            <span className={cn("font-semibold px-1 rounded border shrink-0", s.badge)}>
              {String(event.id).slice(0, 8)}
            </span>
            <span className="text-muted-foreground shrink-0">{event.time}</span>
          </div>
          <p className={cn("font-semibold text-foreground group-hover:text-blue-400 transition-colors truncate", compact ? "text-[10px]" : "text-xs")}>
            {event.title}
          </p>
          {event.subtitle && (
            <p className="text-[9px] text-muted-foreground truncate">{event.subtitle}</p>
          )}
        </>
      )}
    </motion.div>
  );
}
