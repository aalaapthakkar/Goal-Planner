# CFA Level 1 Study Planner

A local, single-user study planner that answers one question at any moment: **am I on pace for my exam, overall and by topic?**

Stack: Vite + React (JS) frontend, Express + better-sqlite3 backend, Recharts, Tailwind. No auth, no cloud — everything lives in `data/planner.db`.

## Setup

```bash
npm install
npm run dev
```

This runs the Express API (`http://localhost:3001`) and the Vite dev server (`http://localhost:5173`) together, with `/api/*` proxied from the frontend to the backend. Open `http://localhost:5173`.

`better-sqlite3` ships prebuilt N-API binaries in recent versions, so no native build toolchain (VS Build Tools / node-gyp) should be required. If `npm install` ever falls back to compiling from source on Windows, you'll need the "Desktop development with C++" workload in Visual Studio Build Tools.

### Tests

```bash
npm test
```

Runs the pacing engine's unit test suite (Vitest). The pacing math (`server/lib/pacing.js`) and date utilities (`server/lib/dateUtils.js`) are pure, dependency-free functions with no DB or Express coupling, so they're fully covered by unit tests independent of the API or UI.

## Architecture

```
server/
  db/        schema.sql, connection, migration runner, seed data
  lib/       pacing.js + dateUtils.js -- pure functions, unit tested, no framework coupling
  services/  DB reads/writes wrapped around the pure lib functions (pacingService, subjectsService, csvService)
  routes/    Express REST endpoints
src/
  context/   ActiveGoalContext -- plain React Context holding which goal is "active"
  hooks/     data-fetching hooks (useSubjects, useSessions, useAvailability, useBlackoutDates, usePacingSummary)
  components/  organized by screen (dashboard/, calendar/, log/, settings/, layout/)
  pages/     the four screens
```

No state management library is used -- React's built-in `useState`/`useContext` are enough at this scale. `server/lib/dateUtils.js` and `server/lib/pacing.js` are plain, dependency-free JS (no Node builtins), so a few chart/calendar components import them **directly from the browser bundle** via a relative path (e.g. `../../../server/lib/pacing.js`). This means the exact same tested pacing math drives both the API's `/api/pacing/summary` endpoint and the client-side charts that need a day-by-day series (like the planned-vs-actual line chart) -- there's only one implementation of the pacing rules in the whole app.

Availability (the weekly hours template) and blackout dates are **global**, shared across all goals -- they represent your real-life calendar, not something that changes per exam. Goals, subjects, and sessions are the only goal-scoped tables.

## The pacing maths

All dates are handled as local `YYYY-MM-DD` strings. `dateUtils.js` never calls `new Date(dateString)` (which parses as UTC midnight and can shift a session to the wrong calendar day under a non-UTC local timezone) -- it splits date strings into `{year, month, day}` by hand and does all arithmetic via `Date.UTC(...)`/`getUTC*()`, so the local timezone never leaks into date math. Comparing two date strings is just a string comparison (`'2026-01-01' < '2026-01-02'`).

### 1. Available capacity

Each day's available hours come from the weekly availability template (hours per weekday, 0=Sun..6=Sat), **unless** that date is in the blackout list, in which case it's forced to 0 regardless of the weekday template. Blackout always wins.

### 2. Planned cumulative-to-date (hour-weighted, not day-count-weighted)

```
plannedToDateHours = totalTargetHours × (hours available from start_date..today) / (hours available from start_date..exam_date)
```

This is deliberately weighted by *hours*, not by *day count* -- a weekend day with 4 available hours pulls more of the plan forward than a weekday with 2 available hours. An even per-day split would misrepresent how much study time has actually become available.

Edge cases:
- **today is before start_date** → planned is 0 (the goal hasn't started yet).
- **today is after exam_date** → planned is the full target (everything is due).
- **zero available hours in the whole window** (e.g. every remaining day is a blackout day, or availability is set to 0 everywhere) → the ratio above is 0/0, which is treated as "the whole target is immediately due" once the goal has started, rather than as `NaN`. This is what correctly turns on the off-track warning in a genuinely impossible schedule.

### 3. Backlog

```
backlogHours = plannedToDateHours - actualToDateHours
```

**Positive backlog means you're behind** (a deficit). **Negative backlog means you're ahead** (a surplus) -- the UI always pairs the number with an explicit "behind" / "ahead" / "on-pace" label so a negative number never reads as bad news.

### 4. Required daily rate

```
requiredDailyRateHours = (totalTargetHours - actualToDateHours) / remainingAvailableDays
```

The remaining window is `[tomorrow, exam_date]`, not `[today, exam_date]` -- "today" is already fully accounted for in the to-date planned/actual figures above, so starting the remaining window at tomorrow avoids counting today twice. `remainingAvailableDays` is a **day count** (not an hour sum) of non-blackout days with available hours > 0, because this rate is compared directly against `max_daily_hours`, which is also a per-study-day ceiling.

- If nothing is left to log, the rate is 0.
- If hours are still owed but zero days remain available, the rate is `Infinity`.

### 5. Off-track detection and remediation

You're **off track** if `requiredDailyRateHours > max_daily_hours` (hitting the max exactly is still on track). When off track, three "what would it take" numbers are computed:

- **Extend the exam date** -- a day-by-day search for the earliest new exam date at which the recomputed required rate drops to at or below your daily max.
- **Raise availability** -- since the day count only grows when a currently-zero-hour weekday is activated (adding hours to an already-active day doesn't add a study day), this ranks your zero-hour weekdays by how often they occur before the exam and reports which ones to activate to close the gap. If every weekday already has some availability, this scenario is reported infeasible -- it's not always the right lever.
- **Cut the target** -- an algebraic solve for the reduced total-target-hours that would bring the required rate down to exactly your daily max, holding your dates and availability fixed.

### 6. Per-subject pacing

All of the above is computed identically for the goal as a whole and for each subject individually, sharing the same calendar (availability + blackout dates) but using each subject's own `target_hours` (weight% × total, or an explicit override) and its own logged sessions. Subject weight percentages are validated separately (a warning if they don't sum to 100%) -- the pacing engine itself never looks at weights, only at an already-resolved hour target, so a miscalibrated weight table can't silently corrupt the pacing math.

## Seed data & the first-run banner

The 10 CFA Level 1 topic areas are seeded automatically when you create a goal, with weight percentages derived from official range midpoints and normalized to sum to exactly 100%. **These are a defensible default, not a live-sourced figure** -- CFA Institute's topic weights shift between exam cycles, so a banner is shown (dismissible, tracked in the `meta` table) reminding you to verify the seeded weights against the current curriculum before trusting the pacing numbers.

## CSV export/import

Settings has export/import for all five configurable datasets: sessions, subjects (weights/overrides), goal settings, weekly availability, and blackout dates.

- **Sessions**: `id,subject_name,session_date,minutes,focus_rating,notes`. A blank `id` inserts a new row; a matching `id` updates it. Unresolvable subject names are skipped and reported, never silently dropped.
- **Subjects**: `name,weight_pct,target_hours_override`. Update-only, matched by name -- import never creates a new subject from a CSV row.
- **Goal**: `name,exam_date,start_date,total_target_hours,max_daily_hours`, single row.
- **Availability**: `weekday,available_hours`, exactly 7 rows.
- **Blackout dates**: `date,reason`, merged by date.
