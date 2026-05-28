import { format, startOfWeek, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendar } from "./context";
import type { CalendarView } from "./types";
import { addMonths, subMonths, addWeeks, subWeeks } from "date-fns";

const VIEWS: CalendarView[] = ["day", "week", "month", "year", "agenda"];

function navTitle(view: CalendarView, date: Date): string {
  if (view === "year") return format(date, "yyyy");
  if (view === "month") return format(date, "MMMM yyyy");
  if (view === "week") {
    const ws = startOfWeek(date, { weekStartsOn: 0 });
    return `${format(ws, "MMM d")} – ${format(addDays(ws, 6), "MMM d, yyyy")}`;
  }
  return format(date, "EEEE, MMMM d, yyyy");
}

export function CalendarToolbar() {
  const { view, setView, currentDate, setCurrentDate, setSidebarDate, setSidebarOpen } = useCalendar();

  const handlePrev = () => {
    if (view === "year")  setCurrentDate(subMonths(currentDate, 12));
    else if (view === "month") setCurrentDate(subMonths(currentDate, 1));
    else if (view === "week")  setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(new Date(currentDate.getTime() - 86_400_000));
  };

  const handleNext = () => {
    if (view === "year")  setCurrentDate(addMonths(currentDate, 12));
    else if (view === "month") setCurrentDate(addMonths(currentDate, 1));
    else if (view === "week")  setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(new Date(currentDate.getTime() + 86_400_000));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSidebarDate(today);
  };

  return (
    <div className="flex items-center gap-2 h-12 px-3 border-b border-border bg-card shrink-0">
      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen((p) => !p)}
        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors shrink-0"
      >
        <Menu className="size-4" />
      </button>

      {/* Today */}
      <button
        onClick={handleToday}
        className="h-7 px-3 rounded border border-border text-xs font-medium text-foreground hover:bg-accent/50 transition-colors shrink-0"
      >
        Today
      </button>

      {/* Prev / Next */}
      <div className="flex items-center">
        <button onClick={handlePrev} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={handleNext} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
          <ChevronRight className="size-4" />
        </button>
      </div>

      {/* Title */}
      <h2 className="text-sm font-semibold text-foreground truncate min-w-0">
        {navTitle(view, currentDate)}
      </h2>

      {/* View switcher */}
      <div className="ml-auto flex items-center bg-muted/40 rounded border border-border p-0.5">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={cn(
              "px-2.5 h-6 text-[10px] font-semibold uppercase tracking-wider rounded transition-all",
              view === v
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
