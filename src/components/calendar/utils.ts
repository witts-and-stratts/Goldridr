import { getWeek } from "date-fns";
import type { CalendarBlockout, CalendarEventColor } from "./types";

// ── Timeline constants ────────────────────────────────────────────────────────
export const TIMELINE_START_HOUR = 0;
export const TIMELINE_END_HOUR = 24;
export const TOTAL_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;
/** px height of one hour row */
export const HOUR_HEIGHT_PX = 64;
/** px height of the full 24-hour timeline */
export const TIMELINE_HEIGHT_PX = TOTAL_HOURS * HOUR_HEIGHT_PX; // 1536

// ── Position helpers ──────────────────────────────────────────────────────────
export interface TimelinePos {
  top: string;
  height: string;
  visible: boolean;
}

export function calcPos(timeStr: string, durationMins: number): TimelinePos {
  try {
    const [h, m] = timeStr.split(":").map(Number);
    const fromStart = h * 60 + m - TIMELINE_START_HOUR * 60;
    const total = TOTAL_HOURS * 60;
    return {
      top: `${Math.max(0, Math.min(98, (fromStart / total) * 100))}%`,
      height: `${Math.max(4, Math.min(100 - (fromStart / total) * 100, (durationMins / total) * 100))}%`,
      visible: h >= TIMELINE_START_HOUR && h < TIMELINE_END_HOUR,
    };
  } catch {
    return { top: "0%", height: "6%", visible: false };
  }
}

export function currentTimePct(now: Date): string | null {
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < TIMELINE_START_HOUR || h >= TIMELINE_END_HOUR) return null;
  const fromStart = h * 60 + m - TIMELINE_START_HOUR * 60;
  return `${(fromStart / (TOTAL_HOURS * 60)) * 100}%`;
}

// ── Week number ───────────────────────────────────────────────────────────────
export function getWeekNum(date: Date): number {
  return getWeek(date, { weekStartsOn: 0 });
}

// ── Blockout helpers ──────────────────────────────────────────────────────────
export function getBlockoutsForDate(
  blockouts: CalendarBlockout[],
  dateStr: string,
): CalendarBlockout[] {
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  return blockouts.filter((b) => {
    if (b.recurring === "none" || b.recurring == null) {
      if (b.endDate) return dateStr >= b.date && dateStr <= b.endDate;
      return b.date === dateStr;
    }
    if (b.recurring === "daily") return true;
    if (b.recurring === "weekly")
      return new Date(`${b.date}T00:00:00`).getDay() === dow;
    if (b.recurring === "weekends") return dow === 0 || dow === 6;
    return false;
  });
}

// ── Event colour styles ───────────────────────────────────────────────────────
interface EventStyles {
  bg: string;
  border: string;
  badge: string;
  dot: string;
}

const COLOR_MAP: Record<CalendarEventColor, EventStyles> = {
  blue:   { bg: "bg-blue-500/10",   border: "border-l-blue-500",   badge: "text-blue-400 bg-blue-500/10 border-blue-500/20",    dot: "bg-blue-500"   },
  purple: { bg: "bg-purple-500/10", border: "border-l-purple-500", badge: "text-purple-400 bg-purple-500/10 border-purple-500/20", dot: "bg-purple-500" },
  amber:  { bg: "bg-amber-500/10",  border: "border-l-amber-500",  badge: "text-amber-400 bg-amber-500/10 border-amber-500/20",  dot: "bg-amber-500"  },
  green:  { bg: "bg-green-500/10",  border: "border-l-green-500",  badge: "text-green-400 bg-green-500/10 border-green-500/20",  dot: "bg-green-500"  },
  red:    { bg: "bg-red-500/10",    border: "border-l-red-500",    badge: "text-red-400 bg-red-500/10 border-red-500/20",        dot: "bg-red-500"    },
  zinc:   { bg: "bg-zinc-500/10",   border: "border-l-zinc-500",   badge: "text-zinc-400 bg-zinc-500/10 border-zinc-500/20",    dot: "bg-zinc-500"   },
};

export function getEventStyles(color?: CalendarEventColor): EventStyles {
  return COLOR_MAP[color ?? "blue"];
}
