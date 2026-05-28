"use client";

import { cn } from "@/lib/utils";
import { CalendarProvider } from "./context";
import { CalendarToolbar } from "./Toolbar";
import { CalendarSidebar } from "./Sidebar";
import { DayView } from "./views/DayView";
import { WeekView } from "./views/WeekView";
import { MonthView } from "./views/MonthView";
import { YearView } from "./views/YearView";
import { AgendaView } from "./views/AgendaView";
import { useCalendar } from "./context";
import type { CalendarProps } from "./types";

/** Inner shell — renders toolbar + sidebar + active view */
function CalendarShell({ sidebarContent, className }: { sidebarContent?: React.ReactNode; className?: string }) {
  const { view, sidebarOpen } = useCalendar();

  return (
    <div className={cn("flex flex-col h-full min-h-0 overflow-hidden bg-background rounded-lg border border-border", className)}>
      <CalendarToolbar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {sidebarOpen && <CalendarSidebar extraContent={sidebarContent} />}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {view === "day"    && <DayView />}
          {view === "week"   && <WeekView />}
          {view === "month"  && <MonthView />}
          {view === "year"   && <YearView />}
          {view === "agenda" && <AgendaView />}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic Calendar component.
 *
 * ```tsx
 * <Calendar
 *   events={events}
 *   blockouts={blockouts}
 *   filterGroups={[{ key: "booking", label: "Bookings", color: "bg-blue-500" }]}
 *   onEventClick={(e) => console.log(e)}
 *   renderEvent={(e, view) => <MyCard event={e} compact={view !== "day"} />}
 *   sidebarContent={<ChauffeurList />}
 * />
 * ```
 */
export function Calendar({
  className,
  sidebarContent,
  ...props
}: CalendarProps & { className?: string; sidebarContent?: React.ReactNode }) {
  return (
    <CalendarProvider {...props}>
      <CalendarShell sidebarContent={sidebarContent} className={className} />
    </CalendarProvider>
  );
}
