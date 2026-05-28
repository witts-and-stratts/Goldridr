import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, addDays, isSameDay, isSameMonth,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useCalendar } from "../context";
import { getWeekNum, getEventStyles } from "../utils";

export function MonthView() {
  const { currentDate, setCurrentDate, setView, filteredEvents, getBlockoutsForDate } = useCalendar();

  const monthStart = startOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: endOfMonth(currentDate) });
  const wsDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const leading = Array.from({ length: monthStart.getDay() }, (_, i) => addDays(wsDate, i));
  const all = [...leading, ...monthDays];
  const rem = all.length % 7;
  if (rem) for (let i = 0; i < 7 - rem; i++) all.push(addDays(all[all.length - 1], 1));
  const weeks: Date[][] = [];
  for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Column headers */}
      <div className="flex border-b border-border shrink-0">
        <div className="w-8 shrink-0 border-r border-border" />
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, i) => (
          <div key={i} className={cn(
            "flex-1 h-8 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wider",
            (i === 0 || i === 6) ? "text-red-400/70" : "text-muted-foreground"
          )}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-1 border-b border-border/50">
            {/* Week number */}
            <div className="w-8 shrink-0 border-r border-border/50 flex items-start justify-center pt-1">
              <span className="text-[9px] text-muted-foreground/40 font-medium select-none">
                {getWeekNum(week[0])}
              </span>
            </div>
            {week.map((day, di) => {
              const ds = format(day, "yyyy-MM-dd");
              const inMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());
              const dayEvents = filteredEvents.filter((e) => e.date === ds);
              const dayBlocks = getBlockoutsForDate(ds);
              const isWeekend = di === 0 || di === 6;

              return (
                <div
                  key={di}
                  onClick={() => { if (inMonth) { setCurrentDate(day); setView("day"); } }}
                  className={cn(
                    "flex-1 border-r border-border/30 p-1 overflow-hidden transition-colors",
                    !inMonth && "opacity-25 pointer-events-none",
                    isWeekend && "bg-muted/10",
                    isToday && "bg-blue-500/5",
                    inMonth && "hover:bg-accent/20 cursor-pointer",
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={cn(
                      "text-xs font-semibold size-5 flex items-center justify-center rounded-full select-none",
                      isToday ? "bg-blue-500 text-white" : isWeekend ? "text-red-400/70" : "text-foreground"
                    )}>{format(day, "d")}</span>
                    {(dayEvents.length + dayBlocks.length) > 0 && (
                      <span className="text-[8px] text-muted-foreground/50 select-none">
                        {dayEvents.length + dayBlocks.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {dayBlocks.slice(0, 1).map((b) => (
                      <div key={`mb-${b.id}`} className="flex items-center gap-1 text-[9px] text-red-400 truncate">
                        <span className="size-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="truncate">{b.title}</span>
                      </div>
                    ))}
                    {dayEvents.slice(0, 3 - Math.min(1, dayBlocks.length)).map((e) => {
                      const s = getEventStyles(e.color);
                      return (
                        <div
                          key={e.id}
                          onClick={(ev) => { ev.stopPropagation(); /* onEventClick handled by parent */ }}
                          className="flex items-center gap-1 text-[9px] text-foreground/80 truncate hover:text-foreground cursor-pointer"
                        >
                          <span className={cn("size-1.5 rounded-full shrink-0", s.dot)} />
                          <span className="truncate">{e.title}</span>
                        </div>
                      );
                    })}
                    {(dayEvents.length + dayBlocks.length) > 3 && (
                      <div className="text-[8px] text-blue-400 pl-2.5">
                        +{(dayEvents.length + dayBlocks.length) - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
