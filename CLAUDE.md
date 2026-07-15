# context-mode — MANDATORY routing rules

You have context-mode MCP tools available. These rules are NOT optional — they protect your context window from flooding. A single unrouted command can dump 56 KB into context and waste the entire session.

## BLOCKED commands — do NOT attempt these

### curl / wget — BLOCKED
Any Bash command containing `curl` or `wget` is intercepted and replaced with an error message. Do NOT retry.
Instead use:
- `ctx_fetch_and_index(url, source)` to fetch and index web pages
- `ctx_execute(language: "javascript", code: "const r = await fetch(...)")` to run HTTP calls in sandbox

### Inline HTTP — BLOCKED
Any Bash command containing `fetch('http`, `requests.get(`, `requests.post(`, `http.get(`, or `http.request(` is intercepted and replaced with an error message. Do NOT retry with Bash.
Instead use:
- `ctx_execute(language, code)` to run HTTP calls in sandbox — only stdout enters context

### WebFetch — BLOCKED
WebFetch calls are denied entirely. The URL is extracted and you are told to use `ctx_fetch_and_index` instead.
Instead use:
- `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` to query the indexed content

## REDIRECTED tools — use sandbox equivalents

### Bash (>20 lines output)
Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, and other short-output commands.
For everything else, use:
- `ctx_batch_execute(commands, queries)` — run multiple commands + search in ONE call
- `ctx_execute(language: "shell", code: "...")` — run in sandbox, only stdout enters context

### Read (for analysis)
If you are reading a file to **Edit** it → Read is correct (Edit needs content in context).
If you are reading to **analyze, explore, or summarize** → use `ctx_execute_file(path, language, code)` instead. Only your printed summary enters context. The raw file content stays in the sandbox.

### Grep (large results)
Grep results can flood context. Use `ctx_execute(language: "shell", code: "grep ...")` to run searches in sandbox. Only your printed summary enters context.

## Tool selection hierarchy

1. **GATHER**: `ctx_batch_execute(commands, queries)` — Primary tool. Runs all commands, auto-indexes output, returns search results. ONE call replaces 30+ individual calls.
2. **FOLLOW-UP**: `ctx_search(queries: ["q1", "q2", ...])` — Query indexed content. Pass ALL questions as array in ONE call.
3. **PROCESSING**: `ctx_execute(language, code)` | `ctx_execute_file(path, language, code)` — Sandbox execution. Only stdout enters context.
4. **WEB**: `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` — Fetch, chunk, index, query. Raw HTML never enters context.
5. **INDEX**: `ctx_index(content, source)` — Store content in FTS5 knowledge base for later search.

## Subagent routing

When spawning subagents (Agent/Task tool), the routing block is automatically injected into their prompt. Bash-type subagents are upgraded to general-purpose so they have access to MCP tools. You do NOT need to manually instruct subagents about context-mode.

## Output constraints

- Keep responses under 500 words.
- Write artifacts (code, configs, PRDs) to FILES — never return them as inline text. Return only: file path + 1-line description.
- When indexing content, use descriptive source labels so others can `ctx_search(source: "label")` later.

## ctx commands

| Command | Action |
|---------|--------|
| `ctx stats` | Call the `ctx_stats` MCP tool and display the full output verbatim |
| `ctx doctor` | Call the `ctx_doctor` MCP tool, run the returned shell command, display as checklist |
| `ctx upgrade` | Call the `ctx_upgrade` MCP tool, run the returned shell command, display as checklist |

---

# Goldridr — Project Guide

## Overview

Goldridr is a luxury chauffeur booking platform with two apps:

- **Web admin** (`/src`) — Next.js 15, TypeScript, Tailwind, PocketBase. Admin dashboard for managing bookings, chauffeurs, discounts, payments, and settings.
- **Driver app** (`/driver-app`) — Expo 56 (SDK 56), React Native 0.85, Expo Router. Used by drivers and admins on mobile.

Both share PocketBase and a set of REST API routes under `/src/app/api/`.

---

## Driver App

### Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `expo` | ~56.0.11 | SDK |
| `expo-router` | ~56.2.10 | File-based routing |
| `@expo/ui` | ~56.0.17 | Native UI primitives — **prefer these always** |
| `expo-camera` | ~56.0.8 | QR code scanning |
| `expo-glass-effect` | ~56.0.4 | Glassmorphism backgrounds |
| `expo-symbols` | ~56.0.6 | SF Symbols |
| `react-native-reanimated` | 4.3.1 | Animations |
| `react-native-gesture-handler` | ~2.31.1 | Gestures |
| `react-native-safe-area-context` | ~5.7.0 | Safe area insets |

### UI preference — @expo/ui first

Always reach for `@expo/ui` (and its community sub-packages) before writing custom RN components. Key APIs in use:

```ts
// Bottom sheets
import { BottomSheet } from "@expo/ui";
// isPresented={true/false} to open/close. fitToContents sizes to content.
// onDismiss fires when the sheet is dismissed (drag or tap backdrop).
// Native sheet renders its own drag handle — do NOT add a custom one.

// Segmented controls
import { SegmentedControl } from "@expo/ui/community/segmented-control";
// Props: values, selectedIndex, onValueChange, appearance, tintColor, style

// Other @expo/ui primitives as they become available (Switch, Picker, etc.)
```

For icons, always use the project wrapper instead of raw libraries:
```ts
import { NativeIcon, type NativeSymbolName } from "@/components/native-icon";
// Always pass { ios, android, web } object — never a bare string
```

### File structure

```
driver-app/src/
  app/
    _layout.tsx               Root layout, AuthProvider
    (tabs)/
      _layout.tsx             NativeTabs shell (Home, Schedule, Bookings, Scan)
      index.tsx               Home screen — upcoming ride + admin flyout drawer
      manage.tsx              Bookings screen — SegmentedControl (Overview / Bookings)
      schedule.tsx            Schedule screen — month/week/agenda calendar
      scan.tsx                QR scan screen
    manage/
      chauffeurs.tsx          Admin: chauffeur list
      discounts.tsx           Admin: discount codes
      payments.tsx            Admin: payments
      settings.tsx            Admin: settings
    ride/
      [reference].tsx         Ride detail — booking status + chauffeur (bottom-sheet pattern)
    login.tsx
  components/
    native-controls.tsx       NativeButton, NativePicker wrappers
    native-icon.tsx           NativeIcon + NativeSymbolName type
    status-text.tsx           StatusText pill component
    ride-row.tsx              RideRow list item (flat prop for list style)
    ride-info.tsx             Full ride info block
    block-row.tsx             Blocked-date row
    agenda-list.tsx           Agenda view list
    week-timeline.tsx         Week timeline view
    month-grid.tsx            Month calendar grid
    year-grid.tsx             Year overview grid
    field-label.tsx           Form field label
    route-line.tsx            Pickup → destination visual
  lib/
    api.ts                    All API calls (getRides, getAdminChauffeurs, updateAdminBooking, etc.)
    auth-context.tsx          AuthContext — token, user, isAdmin, login, logout
    colors.ts                 colors object + plate (StyleSheet shorthand for gold text)
    types.ts                  DriverRide, AdminChauffeur, and other shared types
    format.ts                 Date/time formatters
    money.ts                  Currency formatters
    schedule.ts               Schedule helpers
```

### Routing

- Tabs use `expo-router/unstable-native-tabs` (`NativeTabs`, `NativeTabs.Trigger`, `NativeTabs.Screen`).
- Tab icons always specify `sf` (iOS) and `md` (Android) keys.
- Protected routes check `token` from `useAuth()` and redirect to `/login` if absent.

### Patterns

**Bottom-sheet confirmation pattern** (used for booking status and chauffeur changes):
1. Row is a `Pressable` with label on left, current value + chevron on right (`compactRow` style).
2. Tap opens sheet: `setPendingValue(x); setSheetOpen(true)`.
3. Sheet contains a list of options + a `NativeButton label="Confirm"` that calls the API and closes.
4. `onDismiss` clears both `pendingValue` and `sheetOpen`.

**Scroll padding**: All tab-screen `ScrollView` components must include `paddingBottom: insets.bottom + 70` in their `contentContainerStyle` so content is not hidden behind the tab bar.

**Admin-only features**: Guard with `isAdmin` from `useAuth()`. Non-admin users must not see admin routes or actions.

### Colors

```ts
import { colors, plate } from "@/lib/colors";
// colors.gold, colors.amber, colors.red, colors.ivory, colors.muted, colors.background
// plate — StyleSheet text style preset for gold-coloured headings
```

---

## Web Admin

- Next.js 15 App Router, TypeScript, Tailwind CSS.
- PocketBase is the sole application data store.
- API routes live under `src/app/api/`.
- Admin UI components in `src/components/admin-ui/` (shadcn-style).
- Booking flow components in `src/components/booking/`.
- Calendar components in `src/components/calendar/`.

---

## Shared API

Driver app calls web API routes (same host) using a bearer token. Key endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/driver/rides` | List rides for current driver |
| GET | `/api/driver/rides/[reference]` | Single ride detail |
| POST | `/api/driver/scan` | Look up ride by QR data |
| GET/POST | `/api/driver/blocked` | Blocked dates |

Admin-only routes are gated server-side by role check on the token.

---

## Key conventions

- No comments unless the WHY is non-obvious.
- No custom UI components when an `@expo/ui` primitive exists.
- No `useFlatList` — use `ScrollView` + `.map()` for short lists; `FlatList` only for long paginated lists.
- `useFocusEffect` + `useCallback` for data loading in tab screens (re-fetches on re-focus).
- Horizontal chip rows: `flexGrow: 0, flexShrink: 0` on the `ScrollView` + `alignItems: "center"` on `contentContainerStyle` to prevent stretch.
- `useSafeAreaInsets()` for all inset-aware padding — never hardcode status bar / home indicator heights.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

**Keep this block, including in commits.** It is part of the project's agent setup, maintained by `next dev` for every agent that works here. If it appears as an uncommitted change, that is intentional — commit it as-is. Do not remove it to clean up a diff; it will be regenerated.
<!-- END:nextjs-agent-rules -->
