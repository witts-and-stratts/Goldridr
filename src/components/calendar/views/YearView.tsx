import { format, eachDayOfInterval, startOfYear, endOfYear } from "date-fns";
import { useCalendar } from "../context";
import { Calendar } from "@/components/ui/calendar";
import type { DayButton } from "react-day-picker";

export function YearView() {
  const { currentDate, setCurrentDate, setView, filteredEvents, getBlockoutsForDate } = useCalendar();

  const year = currentDate.getFullYear();
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1));

  const eventDateSet = new Set(filteredEvents.map((e) => e.date));

  // Expand recurring blockouts: check every day of the year via getBlockoutsForDate
  const blockoutDateSet = new Set<string>();
  eachDayOfInterval({ start: startOfYear(new Date(year, 0, 1)), end: endOfYear(new Date(year, 0, 1)) })
    .forEach((day) => {
      const ds = format(day, "yyyy-MM-dd");
      if (getBlockoutsForDate(ds).length > 0) blockoutDateSet.add(ds);
    });

  const handleDayClick = (day: Date | undefined) => {
    if (!day) return;
    setCurrentDate(day);
    setView("day");
  };

  // Custom DayButton renders real <span> dots — no pseudo-element / Tailwind-scan issues
  const DayButtonWithDots = ({ day, children, ...props }: React.ComponentProps<typeof DayButton>) => {
    const ds = format(day.date, "yyyy-MM-dd");
    const hasEvent   = eventDateSet.has(ds);
    const hasBlockout = blockoutDateSet.has(ds);

    return (
      <button {...props} onClick={() => handleDayClick(day.date)}>
        {children}
        {(hasEvent || hasBlockout) && (
          <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex items-center gap-px">
            {hasBlockout && <span className="size-1 rounded-full bg-red-500 block" />}
            {hasEvent    && <span className="size-1 rounded-full bg-blue-400 block" />}
          </span>
        )}
      </button>
    );
  };

  const sharedProps = {
    mode: "single" as const,
    selected: currentDate,
    onSelect: handleDayClick,
    disableNavigation: true,
    showOutsideDays: false,
    components: { DayButton: DayButtonWithDots },
  };

  return (
    <>
      {/* ── Mobile / tablet: scrollable 1→2 col ─────────────────────────── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-y-auto p-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {months.map((month, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-2">
              <Calendar
                {...sharedProps}
                month={month}
                classNames={{
                  month_caption: "flex items-center justify-center pb-1",
                  caption_label: "text-xs font-semibold",
                  weekday: "text-[10px] text-muted-foreground/60 font-medium",
                  week: "flex w-full mt-1",
                  day: "relative flex-1 aspect-square p-0 text-center text-xs",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Desktop: 4 × 3 grid filling available height ────────────────── */}
      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden p-3 flex-col">
        <div className="flex-1 min-h-0 grid grid-cols-4 grid-rows-3 gap-3">
          {months.map((month, i) => (
            <div
              key={i}
              className="flex flex-col rounded-lg border border-border bg-card min-h-0 overflow-hidden hover:border-border/60 transition-colors"
            >
              <Calendar
                {...sharedProps}
                month={month}
                className="p-3 w-full h-full [--cell-size:clamp(20px,2.2cqmin,36px)]"
                classNames={{
                  months: "w-full h-full",
                  month: "w-full h-full flex flex-col gap-1",
                  month_caption: "flex items-center justify-center shrink-0 h-6",
                  caption_label: "text-[clamp(10px,1.1cqw,13px)] font-semibold",
                  weekdays: "flex",
                  weekday: "text-[clamp(8px,0.9cqw,11px)] text-muted-foreground/60 font-medium flex-1 text-center",
                  weeks: "flex-1 flex flex-col justify-around",
                  week: "flex w-full",
                  day: "relative flex-1 aspect-square p-0 text-center text-[clamp(9px,1cqw,13px)]",
                  today: "bg-muted rounded-(--cell-radius)",
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
