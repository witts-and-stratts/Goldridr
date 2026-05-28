import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, addDays, addMonths, subMonths,
  isSameDay, isSameMonth,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getWeekNum } from "./utils";

interface MiniCalendarProps {
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDate?: Date;
  onSelectDate?: (d: Date) => void;
  /** Highlight dots on dates with data */
  markedDates?: string[];
}

export function MiniCalendar({
  month,
  onMonthChange,
  selectedDate,
  onSelectDate,
  markedDates = [],
}: MiniCalendarProps) {
  const mStart = startOfMonth(month);
  const mEnd = endOfMonth(month);
  const mDays = eachDayOfInterval({ start: mStart, end: mEnd });
  const wStart = startOfWeek(mStart, { weekStartsOn: 0 });
  const leading = Array.from({ length: mStart.getDay() }, (_, i) => addDays(wStart, i));
  const all = [...leading, ...mDays];
  const rem = all.length % 7;
  if (rem) for (let i = 0; i < 7 - rem; i++) all.push(addDays(all[all.length - 1], 1));
  const weeks: Date[][] = [];
  for (let i = 0; i < all.length; i += 7) weeks.push(all.slice(i, i + 7));

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-semibold text-foreground">
          {format(month, "MMMM yyyy")}
        </span>
        <div className="flex gap-0.5">
          <button
            onClick={() => onMonthChange(subMonths(month, 1))}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="size-3" />
          </button>
          <button
            onClick={() => onMonthChange(addMonths(month, 1))}
            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronRight className="size-3" />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="flex mb-1">
        <div className="w-4" />
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="flex-1 text-center text-[8px] font-semibold text-muted-foreground/50 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="flex">
          <div className="w-4 flex items-center justify-center">
            <span className="text-[7px] text-muted-foreground/30">{getWeekNum(week[0])}</span>
          </div>
          {week.map((day, di) => {
            const inMonth = isSameMonth(day, month);
            const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
            const isToday = isSameDay(day, new Date());
            const ds = format(day, "yyyy-MM-dd");
            const hasData = markedDates.includes(ds);
            return (
              <div key={di} className="flex-1 flex items-center justify-center py-0.5">
                {inMonth ? (
                  <button
                    onClick={() => onSelectDate?.(day)}
                    className={cn(
                      "size-5 rounded-full flex items-center justify-center text-[8px] font-medium transition-all relative",
                      isSelected ? "bg-blue-500 text-white" :
                      isToday ? "border border-blue-500 text-blue-400" :
                      "text-foreground/60 hover:text-foreground hover:bg-accent/50",
                    )}
                  >
                    {format(day, "d")}
                    {hasData && !isSelected && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 size-0.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                ) : (
                  <span className="size-5" />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
