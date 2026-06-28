import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendar } from "../context";
import { HourLabels } from "../primitives/HourLabels";
import { GridLines } from "../primitives/GridLines";
import { TimelineEvent } from "../primitives/TimelineEvent";
import { TimelineBlockout } from "../primitives/TimelineBlockout";
import { calcPos, currentTimePct, TIMELINE_HEIGHT_PX } from "../utils";

const MIN_COL_PX = 100;
const GUTTER_W = 56; // w-14

export function WeekView() {
  const {
    currentDate, setCurrentDate, setView, now,
    filteredEvents, getBlockoutsForDate,
    onEventClick, onBlockoutDelete, renderEvent,
  } = useCalendar();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const nowPct = currentTimePct(now);

  return (
    <ScrollArea className="flex-1 min-h-0" horizontal>
      <div style={{ minWidth: `${7 * MIN_COL_PX + GUTTER_W}px` }}>
        {/* Day headers — scroll horizontally with the columns */}
        <div className="flex shrink-0 border-b border-border sticky top-0 z-20 bg-background">
          {/* Corner cell — pinned left */}
          <div className="w-14 shrink-0 border-r border-border sticky left-0 z-30 bg-background" />
          <div className="flex flex-1">
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div
                  key={i}
                  onClick={() => { setCurrentDate(day); setView("day"); }}
                  className={cn(
                    "flex-1 h-10 flex flex-col items-center justify-center border-r border-border/40 cursor-pointer hover:bg-accent/30 transition-colors min-w-[100px]",
                    isToday && "border-b-2 border-b-blue-500",
                    isWeekend && "bg-muted/20",
                  )}
                >
                  <span className={cn("text-[9px] uppercase tracking-wider font-medium",
                    isToday ? "text-blue-500" : isWeekend ? "text-muted-foreground/60" : "text-muted-foreground"
                  )}>{format(day, "EEE")}</span>
                  <span className={cn("text-sm font-semibold size-6 flex items-center justify-center rounded-full transition-all",
                    isToday ? "bg-blue-500 text-white" : "text-foreground hover:bg-accent/50"
                  )}>{format(day, "d")}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline: time labels + all 7 columns */}
        <div className="pt-2">
          <div className="flex" style={{ height: `${TIMELINE_HEIGHT_PX}px` }}>
            {/* Hours gutter — pinned left when scrolling horizontally */}
            <div className="w-14 shrink-0 border-r border-border select-none pointer-events-none sticky left-0 z-10 bg-background">
              <HourLabels />
            </div>
            {/* 7 day columns */}
            {weekDays.map((day, i) => {
              const ds = format(day, "yyyy-MM-dd");
              const dayEvents = filteredEvents.filter((e) => e.date === ds);
              const dayBlocks = getBlockoutsForDate(ds);
              const isToday = isSameDay(day, new Date());
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              return (
                <div key={i} className={cn("flex-1 relative border-r border-border/40 min-w-[100px]", isWeekend && "bg-muted/5")}>
                  <GridLines />
                  {isToday && nowPct && (
                    <div className="absolute left-0 right-0 z-30 flex items-center pointer-events-none" style={{ top: nowPct }}>
                      <div className="size-1.5 rounded-full bg-blue-500 shrink-0" />
                      <div className="h-px flex-1 bg-blue-500/60" />
                    </div>
                  )}
                  {dayBlocks.map((block) => {
                    const pos = block.isFullDay ? { top: "0%", height: "100%", visible: true } : calcPos(block.time ?? "00:00", block.duration ?? 60);
                    if (!pos.visible) return null;
                    return (
                      <TimelineBlockout
                        key={`blk-${block.id}`}
                        blockout={block}
                        style={{ top: pos.top, height: pos.height }}
                        onDelete={onBlockoutDelete}
                        compact
                      />
                    );
                  })}
                  <AnimatePresence mode="popLayout">
                    {dayEvents.map((event) => {
                      const pos = calcPos(event.time, event.duration ?? 60);
                      if (!pos.visible) return null;
                      return (
                        <TimelineEvent
                          key={event.id}
                          event={event}
                          view="week"
                          style={{ top: pos.top, height: pos.height }}
                          renderContent={renderEvent ? (e) => renderEvent(e, "week") : undefined}
                          onClick={onEventClick}
                          compact
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
