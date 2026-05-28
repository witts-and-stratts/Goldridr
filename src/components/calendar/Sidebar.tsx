import { format } from "date-fns";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCalendar } from "./context";
import { MiniCalendar } from "./MiniCalendar";

interface CalendarSidebarProps {
  /** Extra content appended below the filter checkboxes (e.g. chauffeur list) */
  extraContent?: React.ReactNode;
}

export function CalendarSidebar({ extraContent }: CalendarSidebarProps) {
  const {
    sidebarDate, setSidebarDate,
    currentDate, setCurrentDate, setView,
    filterGroups, activeFilters, toggleFilter,
    searchQuery, setSearchQuery,
    filteredEvents,
  } = useCalendar();

  const markedDates = [...new Set(filteredEvents.map((e) => e.date))];

  return (
    <div className="w-52 shrink-0 border-r border-border bg-sidebar flex flex-col overflow-y-auto">
      {/* Mini calendar */}
      <div className="p-3 border-b border-border">
        <MiniCalendar
          month={sidebarDate}
          onMonthChange={setSidebarDate}
          selectedDate={currentDate}
          markedDates={markedDates}
          onSelectDate={(d) => {
            setCurrentDate(d);
            setSidebarDate(d);
            setView("day");
          }}
        />
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter events"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 h-7 text-xs bg-background border border-border rounded text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="p-3 space-y-1">
        {filterGroups.map((cat) => {
          const active = activeFilters.includes(cat.key);
          return (
            <button
              key={cat.key}
              onClick={() => toggleFilter(cat.key)}
              className="flex items-center gap-2 w-full text-left py-1 px-1 rounded hover:bg-accent/30 transition-colors"
            >
              <div className={cn(
                "size-4 rounded flex items-center justify-center border-2 shrink-0 transition-all",
                active ? `${cat.color} border-transparent` : "border-border bg-transparent",
              )}>
                {active && <Check className="size-2.5 text-white" />}
              </div>
              <span className={cn("text-xs", active ? "text-foreground" : "text-muted-foreground")}>
                {cat.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Extra content slot */}
      {extraContent && (
        <div className="px-3 pb-3">
          {extraContent}
        </div>
      )}
    </div>
  );
}
