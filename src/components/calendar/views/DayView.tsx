import { format, isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendar } from "../context";
import { HourLabels } from "../primitives/HourLabels";
import { GridLines } from "../primitives/GridLines";
import { TimelineEvent } from "../primitives/TimelineEvent";
import { TimelineBlockout } from "../primitives/TimelineBlockout";
import { calcPos, computeOverlapLayout, currentTimePct, timeToMinutes, TIMELINE_HEIGHT_PX } from "../utils";

export function DayView() {
  const {
    currentDate, setCurrentDate, now,
    filteredEvents, getBlockoutsForDate,
    onEventClick, onBlockoutDelete, renderEvent,
  } = useCalendar();

  const ds = format(currentDate, "yyyy-MM-dd");
  const dayEvents = filteredEvents.filter((e) => e.date === ds);
  const dayBlocks = getBlockoutsForDate(ds);
  const isToday = isSameDay(currentDate, new Date());
  const nowPct = currentTimePct(now);

  const placedEvents = dayEvents
    .map((event) => ({ event, pos: calcPos(event.time, event.duration ?? 60) }))
    .filter(({ pos }) => pos.visible);
  const overlapSlots = computeOverlapLayout(
    placedEvents.map(({ event }) => {
      const start = timeToMinutes(event.time);
      return { start, end: start + (event.duration ?? 60) };
    }),
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Sticky header */}
      <div className="flex shrink-0 border-b border-border">
        <div className="w-14 shrink-0 border-r border-border" />
        <div className={cn("flex-1 h-10 flex flex-col items-center justify-center", isToday && "border-b-2 border-b-blue-500")}>
          <span className={cn("text-[9px] uppercase tracking-wider font-medium", isToday ? "text-blue-500" : "text-muted-foreground")}>
            {format(currentDate, "EEE")}
          </span>
          <span className={cn("text-sm font-semibold size-6 flex items-center justify-center rounded-full", isToday ? "bg-blue-500 text-white" : "text-foreground")}>
            {format(currentDate, "d")}
          </span>
        </div>
      </div>

      {/* Single scrollable timeline */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="pt-2">
          <div className="flex" style={{ height: `${TIMELINE_HEIGHT_PX}px` }}>
            {/* Hours gutter */}
            <div className="w-14 shrink-0 border-r border-border select-none pointer-events-none">
              <HourLabels />
            </div>
            {/* Events column */}
            <div className="flex-1 relative">
              <GridLines />
              {isToday && nowPct && (
                <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: nowPct }}>
                  <div className="size-2 rounded-full bg-blue-500 shrink-0" />
                  <div className="h-px flex-1 bg-blue-500/70" />
                </div>
              )}
              {dayBlocks.map((block) => {
                const isFull = block.isFullDay;
                const pos = isFull ? { top: "0%", height: "100%", visible: true } : calcPos(block.time ?? "00:00", block.duration ?? 60);
                if (!pos.visible) return null;
                return (
                  <TimelineBlockout
                    key={`blk-${block.id}`}
                    blockout={block}
                    style={{ top: pos.top, height: pos.height }}
                    onDelete={onBlockoutDelete}
                  />
                );
              })}
              <AnimatePresence mode="popLayout">
                {placedEvents.map(({ event, pos }, index) => {
                  const { col, cols } = overlapSlots[index];
                  const widthPct = 100 / cols;
                  return (
                    <TimelineEvent
                      key={event.id}
                      event={event}
                      view="day"
                      style={{
                        top: pos.top,
                        height: pos.height,
                        ...(cols > 1 && {
                          left: `calc(${col * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                        }),
                      }}
                      renderContent={renderEvent ? (e) => renderEvent(e, "day") : undefined}
                      onClick={onEventClick}
                    />
                  );
                })}
              </AnimatePresence>
              {dayEvents.length === 0 && dayBlocks.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground select-none">
                  <CalendarIcon className="size-10 mb-2 opacity-20" />
                  <p className="text-xs font-medium uppercase tracking-widest opacity-40">No events</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
