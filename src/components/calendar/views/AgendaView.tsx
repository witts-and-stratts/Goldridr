import { format, addDays, isSameDay, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCalendar } from "../context";
import { getEventStyles } from "../utils";

const AHEAD_DAYS = 60;

export function AgendaView() {
  const {
    currentDate, setCurrentDate, setView,
    filteredEvents, getBlockoutsForDate,
    onEventClick,
  } = useCalendar();

  // Build list of upcoming days that have events or blockouts
  const days = Array.from({ length: AHEAD_DAYS }, (_, i) => addDays(currentDate, i));

  type AgendaDay = {
    date: Date;
    ds: string;
    events: typeof filteredEvents;
    blocks: ReturnType<typeof getBlockoutsForDate>;
  };

  const agenda: AgendaDay[] = days
    .map((date) => {
      const ds = format(date, "yyyy-MM-dd");
      return {
        date,
        ds,
        events: filteredEvents.filter((e) => e.date === ds),
        blocks: getBlockoutsForDate(ds),
      };
    })
    .filter((d) => d.events.length > 0 || d.blocks.length > 0);

  if (agenda.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground select-none">
        <CalendarIcon className="size-10 mb-2 opacity-20" />
        <p className="text-xs font-medium uppercase tracking-widest opacity-40">No upcoming events</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="divide-y divide-border/40">
        {agenda.map(({ date, ds, events, blocks }) => {
          const isToday = isSameDay(date, new Date());
          return (
            <div key={ds} className="flex gap-0 group">
              {/* Date column */}
              <button
                onClick={() => { setCurrentDate(date); setView("day"); }}
                className={cn(
                  "w-24 shrink-0 flex flex-col items-center justify-start pt-4 pb-3 gap-0.5 text-left hover:bg-accent/20 transition-colors cursor-pointer",
                  isToday && "border-l-2 border-l-blue-500"
                )}
              >
                <span className={cn(
                  "text-[9px] uppercase tracking-wider font-medium",
                  isToday ? "text-blue-500" : "text-muted-foreground"
                )}>
                  {isToday ? "Today" : format(date, "EEE")}
                </span>
                <span className={cn(
                  "text-xl font-semibold leading-none",
                  isToday ? "text-blue-500" : "text-foreground"
                )}>
                  {format(date, "d")}
                </span>
                <span className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">
                  {format(date, "MMM")}
                </span>
              </button>

              {/* Events column */}
              <div className="flex-1 py-2 pr-3 space-y-1.5 min-w-0">
                {blocks.map((block) => (
                  <div
                    key={`blk-${block.id}`}
                    className="flex items-start gap-3 px-3 py-2 rounded-md bg-red-500/10 border border-red-500/20"
                  >
                    <div className="size-2 rounded-full bg-red-500 shrink-0 mt-1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-red-400 truncate">{block.title}</p>
                      {block.isFullDay ? (
                        <p className="text-[10px] text-muted-foreground">All day</p>
                      ) : block.time ? (
                        <p className="text-[10px] text-muted-foreground">{block.time}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
                {events.map((event) => {
                  const s = getEventStyles(event.color);
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className={cn(
                        "w-full flex items-start gap-3 px-3 py-2 rounded-md border text-left transition-colors hover:brightness-110",
                        s.bg, s.border
                      )}
                    >
                      <div className={cn("size-2 rounded-full shrink-0 mt-1", s.dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground truncate">{event.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {event.time && (
                            <span className="text-[10px] text-muted-foreground">{event.time}</span>
                          )}
                          {event.duration && (
                            <span className="text-[10px] text-muted-foreground/60">
                              {event.duration >= 60
                                ? `${Math.floor(event.duration / 60)}h${event.duration % 60 ? ` ${event.duration % 60}m` : ""}`
                                : `${event.duration}m`}
                            </span>
                          )}
                          {event.subtitle && (
                            <span className="text-[10px] text-muted-foreground/70 truncate">{event.subtitle}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
