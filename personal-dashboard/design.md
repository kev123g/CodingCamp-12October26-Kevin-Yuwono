# Design Document

## Overview

The Personal Dashboard is a zero-dependency, browser-based single-page application built with plain HTML, CSS, and Vanilla JavaScript. It bundles five productivity features — a Greeting Widget (with custom name), a configurable Pomodoro Focus Timer, a To-Do List, a Quick Links panel, and a Light/Dark theme toggle — into a single page that loads instantly from the filesystem or a local server with no build step.

**File structure:**
```
index.html          — markup and widget containers
css/
└── style.css       — all styling (layout, themes, widgets, responsive)
js/
└── app.js          — all JavaScript (single file, logically sectioned)
```

All state is persisted exclusively through `window.localStorage`. No network requests are made at runtime.

### Design Goals

- **Zero dependencies** — no npm, no CDN, no external scripts.
- **Single CSS file, single JS file** — `css/style.css` and `js/app.js` only; code is clean, readable, and logically sectioned with comments.
- **Instant load** — all widgets rendered within 2 seconds.
- **Resilient persistence** — every mutation is synchronously written to localStorage; failures surface inline without crashing the page.
- **Responsive layout** — single-column below 768 px, multi-column grid at 768 px and above.
- **WCAG 2.1 AA** — 4.5:1 contrast for normal text, 3:1 for large text, in both Light and Dark themes.

---

## Architecture

Because everything lives in one JS file, the code is organised as a collection of **plain object modules** (plain objects with `init` and helper functions), all declared in `app.js` and invoked at the bottom via a `DOMContentLoaded` handler. No ES Module `import`/`export` syntax is used — the single script tag loads the whole file as a classic script.

```
js/app.js
 ├── /* ── STORAGE ── */      storage helpers (read / write / isAvailable)
 ├── /* ── GREETING ── */     greeting widget (time, date, greeting, custom name)
 ├── /* ── TIMER ── */        focus timer (configurable duration, start/stop/reset)
 ├── /* ── TODO ── */         to-do list (add / edit / toggle / delete)
 ├── /* ── QUICK LINKS ── */  quick links (add / delete, open in new tab)
 ├── /* ── THEME ── */        light/dark theme toggle
 └── /* ── INIT ── */         DOMContentLoaded — wire everything up
```

### Data Flow

```
User Interaction
      │
      ▼
  Section function  ──── mutate in-memory state ────▶  Re-render DOM
      │
      └──── storage.write(key, value)
                │
                ├── { ok: true }  → no-op
                └── { ok: false } → inline error, roll back in-memory state
```

### Timing

- The Greeting Widget uses `setInterval(updateGreeting, 60_000)` for clock ticks; an immediate call on load renders the widget before the first tick.
- The Focus Timer uses `setInterval(tick, 1_000)` only while running; the interval is cleared on Stop and Reset.

---

## Section-by-Section Design (`js/app.js`)

### Section 1: `/* ── STORAGE ── */`

Thin wrapper around `localStorage`. All other sections call these helpers rather than touching `localStorage` directly.

```js
const storage = {
  read(key)        → any | null,      // JSON.parse, returns null on error
  write(key, val)  → { ok, error? },  // JSON.stringify, catches DOMException
  isAvailable()    → boolean          // probe write/delete
};
```

**Storage keys:**

| Key               | Stores                        |
|-------------------|-------------------------------|
| `pd_name`         | Custom name string (or null)  |
| `pd_todos`        | `Task[]` JSON array           |
| `pd_quicklinks`   | `QuickLink[]` JSON array      |
| `pd_theme`        | `"light"` \| `"dark"`        |
| `pd_timer_mins`   | Integer minutes (1–120)       |

---

### Section 2: `/* ── GREETING ── */`

Reads `Date` on init and every 60 seconds. Also handles custom name save/load.

**Functions:**

```js
function formatTime(date)      // → "HH:MM" (24-hour, zero-padded)
function formatDate(date)      // → "Weekday, Month DD, YYYY"
function getGreeting(hour)     // → "Good Morning"|"Good Afternoon"|"Good Evening"|"Good Night"
function renderGreeting()      // writes to DOM; reads custom name from storage
function initGreeting()        // renderGreeting() immediately + setInterval(renderGreeting, 60_000)
                               // + wires up name input save button
```

Greeting mapping:

| Hour range | Greeting       |
|------------|----------------|
| 0 – 4      | Good Night     |
| 5 – 11     | Good Morning   |
| 12 – 17    | Good Afternoon |
| 18 – 23    | Good Evening   |

When a Custom_Name is saved (non-empty after trim), the greeting becomes e.g. `"Good Morning, Alex"`. Saving an empty name removes it from storage and reverts to the plain greeting.

---

### Section 3: `/* ── TIMER ── */`

Single 25-minute (default) countdown. Duration is configurable and persisted.

**In-memory state:**

```js
let timerState = {
  totalSeconds: 1500,      // loaded from pd_timer_mins * 60, default 25 * 60
  remaining:    1500,      // counts down to 0
  running:      false,
  intervalId:   null
};
```

**Functions:**

```js
function renderTimer()         // updates MM:SS display and button disabled states
function startTimer()          // sets running=true, creates interval
function stopTimer()           // clears interval, running=false, keeps remaining
function resetTimer()          // clears interval, remaining=totalSeconds, running=false
function tickTimer()           // remaining--; if 0 → stopTimer, showCompletion
function showCompletion()      // shows banner for ≥ 3 s via setTimeout removal
function saveDuration(mins)    // validates 1–120, writes pd_timer_mins, resets timer
function initTimer()           // loads saved duration, renderTimer(), wires buttons + duration input
```

Button enable/disable rules:

| State              | Start    | Stop     | Reset   |
|--------------------|----------|----------|---------|
| Idle / Paused      | enabled  | disabled | enabled |
| Running            | disabled | enabled  | enabled |
| Completed (00:00)  | enabled  | disabled | enabled |

---

### Section 4: `/* ── TODO ── */`

Ordered array of Task objects. Reads from localStorage on init; writes on every mutation.

**Data model:**

```js
// Task object
{ id: string, description: string, completed: boolean }
// localStorage: pd_todos → Task[] (JSON array)
// IDs: crypto.randomUUID() with Date.now().toString() fallback
```

**Functions:**

```js
function renderTodos()                        // full re-render of the list
function addTodo(description)                 // validate, push, render, persist
function editTodo(id, description)            // validate, update, render, persist
function toggleTodo(id)                       // flip completed, render, persist
function deleteTodo(id)                       // remove, render, persist
function persistTodos()                       // storage.write('pd_todos', todos); rolls back on failure
function initTodo()                           // load from storage, renderTodos(), wire add form
```

Validation rules (shared for add and edit):
- Trim whitespace; reject if length === 0 → show inline error below input.
- Reject if length > 500 → show inline error with character-limit message.
- Clear validation errors when user focuses the input again.

---

### Section 5: `/* ── QUICK LINKS ── */`

Ordered array of QuickLink objects. Max 20 entries.

**Data model:**

```js
// QuickLink object
{ id: string, label: string, url: string }
// localStorage: pd_quicklinks → QuickLink[] (JSON array)
```

**Functions:**

```js
function renderQuickLinks()                   // full re-render of link buttons
function addQuickLink(label, url)             // validate, push, render, persist
function deleteQuickLink(id)                  // remove, render, persist
function persistQuickLinks()                  // storage.write; rolls back on failure
function initQuickLinks()                     // load from storage, renderQuickLinks(), wire add form
```

URL validation:
1. Label must be 1–100 chars (after trim).
2. URL must start with `http://` or `https://` (case-insensitive).
3. `new URL(url).hostname` must be non-empty.
4. List must have fewer than 20 entries.

Inline error identifies the specific violation (label empty, label too long, bad URL scheme, empty host, list full).

---

### Section 6: `/* ── THEME ── */`

Applies a `data-theme` attribute on `<html>` and persists the choice.

**Functions:**

```js
function applyTheme(theme)     // sets document.documentElement.dataset.theme = theme
function toggleTheme()         // flips between "light" and "dark", persists, calls applyTheme
function initTheme()           // reads pd_theme from storage (default "light"), calls applyTheme
```

CSS uses `[data-theme="dark"]` attribute selectors to override colour custom properties, so a single cascade swap re-themes the entire page with no JS DOM walking.

```css
/* css/style.css */
:root {
  --color-bg:      #ffffff;
  --color-surface: #f5f5f5;
  --color-text:    #1a1a1a;
  /* … other tokens … */
}
[data-theme="dark"] {
  --color-bg:      #121212;
  --color-surface: #1e1e1e;
  --color-text:    #e8e8e8;
  /* … overrides … */
}
```

---

### Section 7: `/* ── INIT ── */`

```js
document.addEventListener('DOMContentLoaded', () => {
  if (!storage.isAvailable()) showStorageBanner();
  initTheme();
  initGreeting();
  initTimer();
  initTodo();
  initQuickLinks();
});
```

---

## Data Models

### Task
```js
{ id: string, description: string /* 1–500 chars */, completed: boolean }
```

### QuickLink
```js
{ id: string, label: string /* 1–100 chars */, url: string /* http/https */ }
```

### Timer State (in-memory only — not persisted)
```js
{ totalSeconds: number, remaining: number, running: boolean, intervalId: number|null }
```
Timer duration (`pd_timer_mins`) is persisted; countdown position is not.

---

## CSS Architecture (`css/style.css`)

The single stylesheet is divided by comment sections matching the JS sections:

```
/* ── RESET & BASE ── */
/* ── CUSTOM PROPERTIES (TOKENS) ── */
/* ── LAYOUT & GRID ── */
/* ── GREETING WIDGET ── */
/* ── TIMER WIDGET ── */
/* ── TODO WIDGET ── */
/* ── QUICK LINKS WIDGET ── */
/* ── THEME TOGGLE ── */
/* ── NOTIFICATIONS & ERRORS ── */
/* ── RESPONSIVE (≥ 768px) ── */
```

All colours are referenced through CSS custom properties (`var(--color-bg)` etc.) so the dark-theme override only needs to redefine the tokens, not individual rules.

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| localStorage unavailable on load | Persistent top banner: *"Storage unavailable — data cannot be saved."* App stays functional in-memory. |
| `storage.write` fails during mutation | Roll back in-memory state. Show inline widget error: *"Could not save — please try again."* |
| Todo: empty description | Inline error below input; submission blocked. |
| Todo: description > 500 chars | Inline error with limit message; blocked. |
| QuickLink: bad label / URL / limit | Inline error identifying specific violation; blocked. |
| Timer: duration out of 1–120 range | Inline error; blocked. |

---

## Correctness Properties

### Property 1 — Time Formatting
`formatTime(date)` returns `HH:MM` where HH ∈ 00–23, MM ∈ 00–59, always zero-padded.
**Validates: Req 1.1**

### Property 2 — Date Formatting
`formatDate(date)` returns `"Weekday, Month DD, YYYY"` derived from the local system clock.
**Validates: Req 1.2**

### Property 3 — Greeting Coverage
`getGreeting(h)` for any `h` ∈ 0–23 returns exactly one of the four greeting strings with no gaps or overlaps.
**Validates: Req 1.3–1.6**

### Property 4 — Stop Preserves Remaining
Calling `stopTimer()` when `running === true` sets `running = false` and leaves `remaining` unchanged.
**Validates: Req 2.4**

### Property 5 — Reset Restores Total
Calling `resetTimer()` from any state sets `remaining === totalSeconds` and `running === false`.
**Validates: Req 2.5**

### Property 6 — Timer Button Invariant
After every state transition: Start enabled ↔ `running === false`; Stop enabled ↔ `running === true`.
**Validates: Req 2.7–2.9**

### Property 7 — Valid Duration Acceptance
Any integer `m` ∈ 1–120 passed to `saveDuration(m)` sets `timerState.totalSeconds === m * 60`.
**Validates: Req 2.11**

### Property 8 — Invalid Duration Rejection
Any value outside 1–120 (or non-integer) passed to `saveDuration` is rejected with an inline error; state unchanged.
**Validates: Req 2.12**

### Property 9 — Valid Task Addition
`addTodo(s)` for any `s` with `1 ≤ s.trim().length ≤ 500` grows the list by 1 with `completed: false`.
**Validates: Req 3.1**

### Property 10 — Blank Task Rejection
`addTodo(s)` / `editTodo(id, s)` for any `s` where `s.trim().length === 0` leaves the list unchanged and shows an error.
**Validates: Req 3.2, 3.5**

### Property 11 — Over-Length Task Rejection
`addTodo(s)` / `editTodo(id, s)` for `s.length > 500` leaves the list unchanged and shows the limit error.
**Validates: Req 3.6**

### Property 12 — Valid Edit Updates Description
`editTodo(id, s)` for valid `s` updates only the matching task's `description`; all other tasks unchanged.
**Validates: Req 3.4**

### Property 13 — Toggle Round-Trip
Two consecutive `toggleTodo(id)` calls return `completed` to its original value.
**Validates: Req 3.7**

### Property 14 — Delete Removes Exactly One
`deleteTodo(id)` removes exactly the task with that id; list length decreases by 1.
**Validates: Req 3.8**

### Property 15 — Mutation Persistence
After any todo/quicklink mutation, `storage.read(key)` deeply equals the current in-memory array.
**Validates: Req 3.9, 4.5**

### Property 16 — Load Round-Trip
Data written to `pd_todos` / `pd_quicklinks` before `init` is recovered identically after `init`.
**Validates: Req 3.10, 4.6**

### Property 17 — Completed Task Strikethrough
Every task with `completed === true` renders with CSS `text-decoration: line-through`.
**Validates: Req 3.12**

### Property 18 — Valid Quick Link Addition
`addQuickLink(l, u)` for valid label + URL and list length < 20 grows the list by 1.
**Validates: Req 4.1**

### Property 19 — Invalid Quick Link Rejection
Any violation of label/URL/count rules leaves the list unchanged and shows a specific error.
**Validates: Req 4.2**

### Property 20 — Quick Link Delete
`deleteQuickLink(id)` removes exactly that entry; list length decreases by 1.
**Validates: Req 4.4**

### Property 21 — Theme Toggle Alternates
Two consecutive `toggleTheme()` calls return `data-theme` to its original value.
**Validates: Req 7.2**

### Property 22 — Theme Persistence Round-Trip
Theme saved to `pd_theme` before `initTheme()` is applied as `data-theme` after `initTheme()`.
**Validates: Req 7.3**
