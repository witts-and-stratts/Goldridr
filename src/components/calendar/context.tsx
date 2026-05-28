"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  CalendarView, CalendarEvent, CalendarBlockout,
  CalendarFilterGroup, CalendarProps,
} from "./types";
import { getBlockoutsForDate as _getBlockoutsForDate } from "./utils";

interface CalendarContextValue {
  // ── View state ─────────────────────────────────────────────────────────────
  view: CalendarView;
  setView: (v: CalendarView) => void;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
  sidebarDate: Date;
  setSidebarDate: (d: Date) => void;
  now: Date;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;

  // ── Filters ────────────────────────────────────────────────────────────────
  filterGroups: CalendarFilterGroup[];
  activeFilters: string[];
  toggleFilter: (key: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // ── Processed data ─────────────────────────────────────────────────────────
  filteredEvents: CalendarEvent[];
  filteredBlockouts: CalendarBlockout[];
  getBlockoutsForDate: (dateStr: string) => CalendarBlockout[];

  // ── Callbacks / render ─────────────────────────────────────────────────────
  onEventClick: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
  onBlockoutDelete?: (id: string | number) => void;
  renderEvent?: CalendarProps["renderEvent"];
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function useCalendar(): CalendarContextValue {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error("useCalendar must be used inside <Calendar>");
  return ctx;
}

const DEFAULT_FILTER_GROUPS: CalendarFilterGroup[] = [
  { key: "blue",   label: "Events",    color: "bg-blue-500"   },
  { key: "blocked",label: "Blockouts", color: "bg-red-500"    },
];

export function CalendarProvider({
  children,
  events = [],
  blockouts = [],
  view: controlledView,
  date: controlledDate,
  onViewChange,
  onDateChange,
  defaultView = "week",
  defaultDate,
  onEventClick,
  onDateClick,
  onBlockoutDelete,
  renderEvent,
  filterGroups,
  sidebarContent: _sidebarContent,
}: CalendarProps & { children: React.ReactNode }) {
  const [internalView, setInternalView] = useState<CalendarView>(defaultView);
  const [internalDate, setInternalDate] = useState<Date>(defaultDate ?? new Date());
  const [sidebarDate, setSidebarDate] = useState<Date>(defaultDate ?? new Date());
  const [now, setNow] = useState(new Date());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const resolvedGroups = filterGroups ?? DEFAULT_FILTER_GROUPS;
  const [activeFilters, setActiveFilters] = useState<string[]>(
    resolvedGroups.map((g) => g.key).concat("blocked"),
  );
  const [searchQuery, setSearchQuery] = useState("");

  const view = controlledView ?? internalView;
  const currentDate = controlledDate ?? internalDate;

  const setView = useCallback((v: CalendarView) => {
    if (!controlledView) setInternalView(v);
    onViewChange?.(v);
  }, [controlledView, onViewChange]);

  const setCurrentDate = useCallback((d: Date) => {
    if (!controlledDate) setInternalDate(d);
    onDateChange?.(d);
  }, [controlledDate, onDateChange]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const toggleFilter = useCallback((key: string) => {
    setActiveFilters((p) => p.includes(key) ? p.filter((k) => k !== key) : [...p, key]);
  }, []);

  // ── Filtered data ────────────────────────────────────────────────────────
  const filteredEvents = events.filter((e) => {
    // filterKey takes priority over color for group-based filtering
    const groupKey = e.filterKey ?? e.color ?? "blue";
    const hasGroup = resolvedGroups.some((g) => g.key === groupKey);
    if (hasGroup && !activeFilters.includes(groupKey)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.title.toLowerCase().includes(q) ||
        String(e.id).toLowerCase().includes(q) ||
        (e.subtitle ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredBlockouts = blockouts.filter((b) => {
    if (!activeFilters.includes("blocked")) return false;
    if (searchQuery.trim()) return b.title.toLowerCase().includes(searchQuery.toLowerCase());
    return true;
  });

  const getBlockoutsForDate = useCallback(
    (dateStr: string) => _getBlockoutsForDate(filteredBlockouts, dateStr),
    [filteredBlockouts],
  );

  return (
    <CalendarContext.Provider value={{
      view, setView,
      currentDate, setCurrentDate,
      sidebarDate, setSidebarDate,
      now, sidebarOpen, setSidebarOpen,
      filterGroups: resolvedGroups,
      activeFilters, toggleFilter,
      searchQuery, setSearchQuery,
      filteredEvents, filteredBlockouts, getBlockoutsForDate,
      onEventClick: onEventClick ?? (() => {}),
      onDateClick, onBlockoutDelete,
      renderEvent,
    }}>
      {children}
    </CalendarContext.Provider>
  );
}
