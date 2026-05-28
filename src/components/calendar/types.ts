// ─────────────────────────────────────────────────────────────────────────────
// Calendar — public types
// Re-export everything you need for the calendar from other projects.
// ─────────────────────────────────────────────────────────────────────────────

export type CalendarView = "day" | "week" | "month" | "year" | "agenda";

export type CalendarEventColor = "blue" | "purple" | "amber" | "green" | "red" | "zinc";

/** A generic calendar event. Extend `data` for project-specific fields. */
export interface CalendarEvent {
  id: string | number;
  /** "yyyy-MM-dd" */
  date: string;
  /** "HH:mm" (24-hour) */
  time: string;
  /** Duration in minutes. Defaults to 60. */
  duration?: number;
  title: string;
  subtitle?: string;
  color?: CalendarEventColor;
  /**
   * Optional filter-group key. When set, the sidebar filter matches on this
   * key instead of `color`. Useful when filter groups don't map 1-to-1 to
   * event colours (e.g. "airport" / "hourly" / "city" trip types).
   */
  filterKey?: string;
  /** Arbitrary data passed back in callbacks */
  data?: unknown;
}

/** A time slot that blocks availability on the calendar. */
export interface CalendarBlockout {
  id: string | number;
  title: string;
  /** "yyyy-MM-dd" */
  date: string;
  /** "yyyy-MM-dd" – end of a multi-day blockout */
  endDate?: string;
  isFullDay?: boolean;
  /** "HH:mm" – required when isFullDay is false */
  time?: string;
  /** Duration in minutes */
  duration?: number;
  recurring?: "none" | "daily" | "weekly" | "weekends";
}

/** A named filter group shown in the sidebar. */
export interface CalendarFilterGroup {
  key: string;
  label: string;
  /** Tailwind bg class e.g. "bg-blue-500" */
  color: string;
}

/** Full props for the root <Calendar /> component. */
export interface CalendarProps {
  // ── Data ────────────────────────────────────────────────────────────────
  events?: CalendarEvent[];
  blockouts?: CalendarBlockout[];

  // ── Controlled state (optional — use defaultX for uncontrolled) ─────────
  view?: CalendarView;
  date?: Date;
  onViewChange?: (view: CalendarView) => void;
  onDateChange?: (date: Date) => void;

  // ── Uncontrolled defaults ───────────────────────────────────────────────
  defaultView?: CalendarView;
  defaultDate?: Date;

  // ── Callbacks ───────────────────────────────────────────────────────────
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onBlockoutDelete?: (id: string | number) => void;

  // ── Customisation ───────────────────────────────────────────────────────
  /** Custom renderer for event cards in timeline views */
  renderEvent?: (event: CalendarEvent, view: CalendarView) => React.ReactNode;
  /** Filter checkboxes shown in the sidebar */
  filterGroups?: CalendarFilterGroup[];
  /** Extra content rendered at the bottom of the sidebar */
  sidebarContent?: React.ReactNode;

  className?: string;
}
