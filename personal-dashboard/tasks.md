# Implementation Plan: Personal Dashboard

## Overview

Build a zero-dependency personal productivity dashboard in plain HTML, CSS, and Vanilla JavaScript.
All code lives in three files: `index.html`, `css/style.css`, and `js/app.js`.
Features: Greeting (with custom name), configurable Pomodoro timer, To-Do list, Quick Links, and Light/Dark theme.

---

## Tasks

- [ ] 1. Scaffold project structure
  - Create `index.html`, `css/style.css`, `js/app.js` (with directory stubs `css/` and `js/`)
  - `index.html` links `<link rel="stylesheet" href="css/style.css">` and `<script src="js/app.js" defer></script>`
  - Add semantic widget containers: `#greeting`, `#timer`, `#todo`, `#quicklinks`, plus a `#storage-banner` (hidden by default) and a theme-toggle button in the header
  - All interactive elements have accessible names (`aria-label` or visible `<label>`)
  - _Requirements: 5.1, 5.4, 5.6_

- [ ] 2. Implement `storage` helpers in `js/app.js`
  - Open `js/app.js` with a `/* ── STORAGE ── */` section comment
  - `storage.read(key)` — `JSON.parse` from localStorage, returns `null` on missing key or parse error
  - `storage.write(key, value)` — `JSON.stringify` + `localStorage.setItem`; catches `DOMException`, returns `{ ok: true }` or `{ ok: false, error }`
  - `storage.isAvailable()` — probe write + delete, returns `boolean`
  - `showStorageBanner()` — unhides `#storage-banner` with message *"Storage unavailable — data cannot be saved."*
  - _Requirements: 5.2, 5.5_

- [ ] 3. Implement theme toggle (`/* ── THEME ── */` section)
  - `applyTheme(theme)` — sets `document.documentElement.dataset.theme = theme`
  - `toggleTheme()` — flips between `"light"` and `"dark"`, persists to `pd_theme`, calls `applyTheme`
  - `initTheme()` — reads `pd_theme` (default `"light"`), calls `applyTheme`
  - Wire the theme-toggle button in `initTheme()`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 4. Write `css/style.css` — tokens and base layout
  - `/* ── RESET & BASE ── */`: box-sizing reset, `body` font ≥ 16 px, smooth font rendering
  - `/* ── CUSTOM PROPERTIES ── */`: define `--color-bg`, `--color-surface`, `--color-text`, `--color-accent`, `--color-error`, `--radius`, `--shadow` for light theme; `[data-theme="dark"]` block overrides all colour tokens
  - `/* ── LAYOUT & GRID ── */`: single-column stacked default; `@media (min-width: 768px)` switches to a two-column CSS Grid; widget cards share border-radius, shadow, padding from tokens
  - `/* ── THEME TOGGLE ── */`: button style for the toggle, positioned in the top-right header area
  - _Requirements: 5.6, 6.2, 6.3, 6.4, 7.5_

- [ ] 5. Implement greeting widget (`/* ── GREETING ── */` section)
  - `formatTime(date)` — returns zero-padded `HH:MM` (24-hour)
  - `formatDate(date)` — returns `"Weekday, Month DD, YYYY"`
  - `getGreeting(hour)` — 0–4 → "Good Night", 5–11 → "Good Morning", 12–17 → "Good Afternoon", 18–23 → "Good Evening"
  - `renderGreeting()` — reads `pd_name` from storage; displays `"Good Morning, Alex"` or `"Good Morning"` accordingly; updates time and date elements
  - `initGreeting()` — calls `renderGreeting()` immediately + `setInterval(renderGreeting, 60_000)`; wires the name input + save button (save reads input, trims, writes to `pd_name` or removes key if empty, calls `renderGreeting`)
  - Add `/* ── GREETING WIDGET ── */` section to `css/style.css`: large clock, readable date, greeting line, compact name-input form
  - _Requirements: 1.1–1.12_

- [ ] 6. Implement focus timer (`/* ── TIMER ── */` section)
  - `timerState` object: `{ totalSeconds, remaining, running, intervalId }`; load `pd_timer_mins` on init (default 25)
  - `renderTimer()` — formats `MM:SS`, updates display, sets `disabled` on Start/Stop per state table
  - `startTimer()`, `stopTimer()`, `resetTimer()`, `tickTimer()` (decrements, clamps to 0, fires `showCompletion`)
  - `showCompletion()` — shows a visible banner/notification for ≥ 3 s via `setTimeout` removal
  - `saveDuration(mins)` — validates integer 1–120; on success writes `pd_timer_mins`, updates `totalSeconds`, calls `resetTimer`; on failure shows inline error
  - `initTimer()` — loads saved duration, `renderTimer()`, wires Start/Stop/Reset buttons and duration input + save button
  - Add `/* ── TIMER WIDGET ── */` section to `css/style.css`: large countdown display, three control buttons, inline duration-input row, completion banner
  - _Requirements: 2.1–2.12_

- [ ] 7. Implement to-do list (`/* ── TODO ── */` section)
  - `todos` array (in-memory); load from `pd_todos` on init
  - `validateTodoDescription(s)` — returns `{ valid: boolean, error?: string }`; trims, rejects empty, rejects > 500 chars
  - `renderTodos()` — full re-render; each task row has: checkbox (toggle), description span (strikethrough when `completed`), edit button (makes description editable in-place with confirm/cancel), delete button
  - `addTodo(description)` — validate; on success push `{ id, description, completed: false }`, `renderTodos()`, `persistTodos()`
  - `editTodo(id, description)` — validate; on success update, `renderTodos()`, `persistTodos()`
  - `toggleTodo(id)` — flip `completed`, `renderTodos()`, `persistTodos()`
  - `deleteTodo(id)` — splice, `renderTodos()`, `persistTodos()`
  - `persistTodos()` — `storage.write('pd_todos', todos)`; on `{ ok: false }` roll back and show inline error
  - `initTodo()` — load, `renderTodos()`, wire add form; clear validation message on input focus
  - Add `/* ── TODO WIDGET ── */` section to `css/style.css`: task rows, strikethrough for completed, edit/delete icon buttons, inline validation message style
  - _Requirements: 3.1–3.12_

- [ ] 8. Implement quick links (`/* ── QUICK LINKS ── */` section)
  - `quickLinks` array; load from `pd_quicklinks` on init
  - `validateQuickLink(label, url)` — returns `{ valid: boolean, error?: string }`; checks label 1–100 chars, URL `http://`/`https://` scheme (case-insensitive), non-empty hostname via `new URL()`, count < 20
  - `renderQuickLinks()` — renders each link as an `<a href="..." target="_blank" rel="noopener">` button-styled anchor with a delete button beside it
  - `addQuickLink(label, url)` — validate; on success push, `renderQuickLinks()`, `persistQuickLinks()`
  - `deleteQuickLink(id)` — splice, `renderQuickLinks()`, `persistQuickLinks()`
  - `persistQuickLinks()` — `storage.write('pd_quicklinks', quickLinks)`; on `{ ok: false }` roll back, show inline error
  - `initQuickLinks()` — load, `renderQuickLinks()`, wire add form; clear validation message on input focus
  - Add `/* ── QUICK LINKS WIDGET ── */` section to `css/style.css`: button-styled link grid, delete affordance on hover, inline validation message style
  - _Requirements: 4.1–4.7_

- [ ] 9. Wire everything in `/* ── INIT ── */` section
  - At bottom of `js/app.js`:
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
  - Verify the page loads without errors in browser console
  - _Requirements: 5.3, 5.4, 6.1_

- [ ] 10. Polish and cross-cutting concerns
  - Add `/* ── NOTIFICATIONS & ERRORS ── */` section to `css/style.css`: shared `.error-msg` style (red, small, below input), `.banner` style for storage-unavailable and timer-complete notifications
  - Ensure all colour token values pass WCAG 2.1 AA contrast check (4.5:1 normal text, 3:1 large text) in both light and dark themes — verify with browser DevTools or axe
  - Confirm responsive layout: below 768 px single column, at 768 px+ two-column grid
  - Confirm no external scripts, CDN links, or extra CSS/JS files exist
  - Read through `js/app.js` and `css/style.css`: consistent indentation (2-space), descriptive names, all seven section comments present, no dead code
  - Open `index.html` from the filesystem (`file://`) and smoke-test all features
  - _Requirements: 5.1, 5.6, 5.7, 6.2, 6.3, 6.4, 7.5_

---

## Notes

- All JavaScript goes in `js/app.js` — no module syntax, no extra files.
- All CSS goes in `css/style.css` — no inline styles, no extra files.
- IDs for tasks and links: `crypto.randomUUID()` with `Date.now().toString()` fallback.
- Timer duration is persisted; countdown position is not — a reload always resets to the saved duration.
- The theme toggle flips `data-theme` on `<html>`; all colour changes happen through CSS custom-property overrides, no JS DOM walking.
