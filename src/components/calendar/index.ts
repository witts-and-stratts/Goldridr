// Main component (batteries-included)
export { Calendar } from "./Calendar";

// Context & hook (for custom shells)
export { CalendarProvider, useCalendar } from "./context";

// Sub-components (compose your own shell)
export { CalendarToolbar } from "./Toolbar";
export { CalendarSidebar } from "./Sidebar";
export { MiniCalendar } from "./MiniCalendar";

// Views
export { DayView } from "./views/DayView";
export { WeekView } from "./views/WeekView";
export { MonthView } from "./views/MonthView";
export { YearView } from "./views/YearView";
export { AgendaView } from "./views/AgendaView";

// Primitives
export { HourLabels } from "./primitives/HourLabels";
export { GridLines } from "./primitives/GridLines";
export { TimelineEvent } from "./primitives/TimelineEvent";
export { TimelineBlockout } from "./primitives/TimelineBlockout";

// Utilities
export { calcPos, currentTimePct, getWeekNum, getBlockoutsForDate, getEventStyles, TIMELINE_HEIGHT_PX, HOUR_HEIGHT_PX } from "./utils";

// Types
export type {
  CalendarView,
  CalendarEventColor,
  CalendarEvent,
  CalendarBlockout,
  CalendarFilterGroup,
  CalendarProps,
} from "./types";
