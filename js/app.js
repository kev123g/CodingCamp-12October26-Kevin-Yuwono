/* ═══════════════════════════════════════════════════════════════
   Personal Dashboard — app.js
   Sections:  STORAGE · THEME · GREETING · TIMER · TODO · QUICKLINKS · INIT
═══════════════════════════════════════════════════════════════ */

/* ── STORAGE ────────────────────────────────────────────────── */

const storage = {
  /**
   * Read and JSON-parse a value from localStorage.
   * Returns null if the key is absent or the value cannot be parsed.
   */
  read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * JSON-stringify and store a value.
   * Returns { ok: true } on success or { ok: false, error } on failure.
   */
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  /**
   * Check whether localStorage is accessible by attempting a probe write.
   * Returns true if available, false otherwise.
   */
  isAvailable() {
    try {
      const probe = '__pd_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }
};

/** Show the top-level storage-unavailable banner. */
function showStorageBanner() {
  const banner = document.getElementById('storageBanner');
  if (banner) banner.hidden = false;
}

/* ── THEME ──────────────────────────────────────────────────── */

/** Apply a theme by setting data-theme on <html>. */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = document.querySelector('.theme-toggle__icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

/** Toggle between light and dark, then persist the choice. */
function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  storage.write('pd_theme', next);
}

/** Load saved theme (default: light) and wire the toggle button. */
function initTheme() {
  const saved = storage.read('pd_theme') || 'light';
  applyTheme(saved);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

/* ── GREETING ───────────────────────────────────────────────── */

/**
 * Return a zero-padded HH:MM string from a Date (24-hour clock).
 */
function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Return a human-readable date string: "Weekday, Month DD, YYYY".
 */
function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Return a time-of-day greeting based on the local hour (0–23).
 */
function getGreeting(hour) {
  if (hour >= 5 && hour <= 11)  return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  if (hour >= 18 && hour <= 23) return 'Good Evening';
  return 'Good Night'; // 0 – 4
}

/** Re-render the greeting widget using the current time and saved name. */
function renderGreeting() {
  const now = new Date();
  const name = storage.read('pd_name');
  const greet = getGreeting(now.getHours());

  document.getElementById('greetingTime').textContent = formatTime(now);
  document.getElementById('greetingDate').textContent = formatDate(now);
  document.getElementById('greetingMessage').textContent =
    name ? `${greet}, ${name}!` : `${greet}!`;
}

/** Initialise the greeting widget: render immediately, then every 60 s. */
function initGreeting() {
  renderGreeting();
  setInterval(renderGreeting, 60_000);

  // Pre-fill name input with saved value
  const saved = storage.read('pd_name');
  if (saved) document.getElementById('nameInput').value = saved;

  document.getElementById('saveNameBtn').addEventListener('click', () => {
    const name = document.getElementById('nameInput').value.trim();
    if (name) {
      storage.write('pd_name', name);
    } else {
      // Empty name clears the personalisation
      localStorage.removeItem('pd_name');
    }
    renderGreeting();
  });
}

/* ── TIMER ──────────────────────────────────────────────────── */

const timerState = {
  totalSeconds: 25 * 60, // default 25 min; overwritten by initTimer
  remaining:    25 * 60,
  running:      false,
  intervalId:   null
};

/** Format a seconds count as MM:SS with zero-padding. */
function formatCountdown(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

/** Update the timer display and enable/disable buttons to match state. */
function renderTimer() {
  document.getElementById('timerDisplay').textContent =
    formatCountdown(timerState.remaining);

  document.getElementById('startBtn').disabled = timerState.running;
  document.getElementById('stopBtn').disabled  = !timerState.running;
}

/** Show the session-complete banner for 4 seconds, then hide it. */
function showTimerComplete() {
  const banner = document.getElementById('timerDone');
  banner.hidden = false;
  setTimeout(() => { banner.hidden = true; }, 4000);
}

/** Called every second while the timer is running. */
function tickTimer() {
  timerState.remaining = Math.max(0, timerState.remaining - 1);
  renderTimer();

  if (timerState.remaining <= 0) {
    clearInterval(timerState.intervalId);
    timerState.intervalId = null;
    timerState.running = false;
    renderTimer();
    showTimerComplete();
  }
}

function startTimer() {
  if (timerState.running) return;
  timerState.running = true;
  timerState.intervalId = setInterval(tickTimer, 1000);
  renderTimer();
}

function stopTimer() {
  if (!timerState.running) return;
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerState.running = false;
  renderTimer();
}

function resetTimer() {
  clearInterval(timerState.intervalId);
  timerState.intervalId = null;
  timerState.running = false;
  timerState.remaining = timerState.totalSeconds;
  document.getElementById('timerDone').hidden = true;
  renderTimer();
}

/**
 * Validate and save a new duration (1–120 minutes).
 * Resets the timer to the new duration on success.
 */
function saveDuration(mins) {
  const errEl = document.getElementById('durationError');
  const n = Number(mins);

  if (!Number.isInteger(n) || n < 1 || n > 120) {
    errEl.textContent = 'Duration must be a whole number between 1 and 120.';
    errEl.hidden = false;
    return;
  }

  errEl.hidden = true;
  timerState.totalSeconds = n * 60;
  storage.write('pd_timer_mins', n);
  resetTimer(); // apply the new duration immediately
}

/** Initialise the timer: load saved duration, render, wire buttons. */
function initTimer() {
  const savedMins = storage.read('pd_timer_mins');
  if (savedMins && Number.isInteger(savedMins) && savedMins >= 1 && savedMins <= 120) {
    timerState.totalSeconds = savedMins * 60;
    timerState.remaining    = timerState.totalSeconds;
    document.getElementById('durationInput').value = savedMins;
  }

  renderTimer();

  document.getElementById('startBtn').addEventListener('click', startTimer);
  document.getElementById('stopBtn').addEventListener('click', stopTimer);
  document.getElementById('resetBtn').addEventListener('click', resetTimer);

  document.getElementById('saveDurationBtn').addEventListener('click', () => {
    saveDuration(document.getElementById('durationInput').value);
  });

  // Also allow pressing Enter inside the duration input
  document.getElementById('durationInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveDuration(e.target.value);
  });

  // Clear duration error when user edits the input
  document.getElementById('durationInput').addEventListener('input', () => {
    document.getElementById('durationError').hidden = true;
  });
}

/* ── TODO ───────────────────────────────────────────────────── */

/** In-memory task array. Shape: [{ id, description, completed }] */
let todos = [];

/**
 * Validate a task description string.
 * Returns { valid: true } or { valid: false, error: string }.
 */
function validateTodoDescription(raw) {
  const s = raw.trim();
  if (s.length === 0) return { valid: false, error: 'Task cannot be empty.' };
  if (s.length > 500) return { valid: false, error: `Task is too long (max 500 characters).` };
  return { valid: true };
}

/** Persist the current todos array; roll back + show error on failure. */
function persistTodos(snapshot) {
  const result = storage.write('pd_todos', todos);
  if (!result.ok) {
    todos = snapshot; // roll back
    showTodoError('Could not save — please try again.');
  }
}

function showTodoError(msg) {
  const el = document.getElementById('todoError');
  el.textContent = msg;
  el.hidden = false;
}

function hideTodoError() {
  document.getElementById('todoError').hidden = true;
}

/** Full re-render of the task list. */
function renderTodos() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';

  if (todos.length === 0) {
    list.innerHTML = '<li class="todo__empty" style="color:var(--color-text-muted);font-size:.9rem;padding:.5rem 0;">No tasks yet — add one above.</li>';
    return;
  }

  todos.forEach((task) => {
    const li = document.createElement('li');
    li.className = 'todo__item';
    li.dataset.id = task.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo__checkbox';
    checkbox.checked = task.completed;
    checkbox.setAttribute('aria-label', `Mark "${task.description}" as ${task.completed ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => toggleTodo(task.id));

    // Text span
    const textSpan = document.createElement('span');
    textSpan.className = 'todo__text' + (task.completed ? ' todo__text--done' : '');
    textSpan.textContent = task.description;

    // Actions container
    const actions = document.createElement('div');
    actions.className = 'todo__actions';

    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'btn--icon';
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', `Edit task: ${task.description}`);
    editBtn.addEventListener('click', () => startEditTodo(task.id, li, textSpan, actions));

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn--icon danger';
    deleteBtn.textContent = '🗑️';
    deleteBtn.setAttribute('aria-label', `Delete task: ${task.description}`);
    deleteBtn.addEventListener('click', () => deleteTodo(task.id));

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, textSpan, actions);
    list.appendChild(li);
  });
}

/**
 * Switch a task row into edit mode: replace the text span with an input
 * and swap the edit/delete buttons for confirm/cancel.
 */
function startEditTodo(id, li, textSpan, actionsEl) {
  const task = todos.find(t => t.id === id);
  if (!task) return;

  // Replace text with input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input todo__edit-input';
  input.value = task.description;
  input.maxLength = 500;
  input.setAttribute('aria-label', 'Edit task description');
  li.replaceChild(input, textSpan);
  input.focus();
  input.select();

  // Replace actions with confirm/cancel
  actionsEl.innerHTML = '';

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn--icon';
  confirmBtn.textContent = '✅';
  confirmBtn.setAttribute('aria-label', 'Confirm edit');
  confirmBtn.addEventListener('click', () => editTodo(id, input.value));

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn--icon';
  cancelBtn.textContent = '❌';
  cancelBtn.setAttribute('aria-label', 'Cancel edit');
  cancelBtn.addEventListener('click', renderTodos);

  actionsEl.append(confirmBtn, cancelBtn);

  // Allow Enter to confirm, Escape to cancel
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter')  editTodo(id, input.value);
    if (e.key === 'Escape') renderTodos();
  });
}

function addTodo(description) {
  const validation = validateTodoDescription(description);
  if (!validation.valid) {
    showTodoError(validation.error);
    return;
  }

  hideTodoError();
  const snapshot = [...todos];
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString();

  todos.push({ id, description: description.trim(), completed: false });
  renderTodos();
  persistTodos(snapshot);
}

function editTodo(id, description) {
  const validation = validateTodoDescription(description);
  if (!validation.valid) {
    showTodoError(validation.error);
    return;
  }

  hideTodoError();
  const snapshot = [...todos];
  const task = todos.find(t => t.id === id);
  if (task) task.description = description.trim();
  renderTodos();
  persistTodos(snapshot);
}

function toggleTodo(id) {
  const snapshot = todos.map(t => ({ ...t }));
  const task = todos.find(t => t.id === id);
  if (task) task.completed = !task.completed;
  renderTodos();
  persistTodos(snapshot);
}

function deleteTodo(id) {
  const snapshot = [...todos];
  todos = todos.filter(t => t.id !== id);
  renderTodos();
  persistTodos(snapshot);
}

/** Initialise the to-do widget: load from storage, render, wire add form. */
function initTodo() {
  todos = storage.read('pd_todos') || [];
  renderTodos();

  const input = document.getElementById('todoInput');
  const addBtn = document.getElementById('addTodoBtn');

  addBtn.addEventListener('click', () => {
    addTodo(input.value);
    if (document.getElementById('todoError').hidden) input.value = '';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTodo(input.value);
      if (document.getElementById('todoError').hidden) input.value = '';
    }
  });

  input.addEventListener('input', hideTodoError);
}

/* ── QUICK LINKS ─────────────────────────────────────────────── */

/** In-memory quick links array. Shape: [{ id, label, url }] */
let quickLinks = [];

/**
 * Validate a quick link label and URL.
 * Returns { valid: true } or { valid: false, error: string }.
 */
function validateQuickLink(label, url) {
  const trimLabel = label.trim();
  if (trimLabel.length === 0)    return { valid: false, error: 'Label cannot be empty.' };
  if (trimLabel.length > 100)    return { valid: false, error: 'Label must be 100 characters or fewer.' };
  if (quickLinks.length >= 20)   return { valid: false, error: 'Maximum of 20 links reached.' };

  const lowerUrl = url.trim().toLowerCase();
  if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const parsed = new URL(url.trim());
    if (!parsed.hostname) return { valid: false, error: 'URL must include a valid hostname.' };
  } catch {
    return { valid: false, error: 'URL is not valid.' };
  }

  return { valid: true };
}

/** Persist quick links; roll back + show error on failure. */
function persistQuickLinks(snapshot) {
  const result = storage.write('pd_quicklinks', quickLinks);
  if (!result.ok) {
    quickLinks = snapshot;
    showLinkError('Could not save — please try again.');
  }
}

function showLinkError(msg) {
  const el = document.getElementById('linkError');
  el.textContent = msg;
  el.hidden = false;
}

function hideLinkError() {
  document.getElementById('linkError').hidden = true;
}

/** Full re-render of the quick links grid. */
function renderQuickLinks() {
  const grid = document.getElementById('linkGrid');
  grid.innerHTML = '';

  if (quickLinks.length === 0) {
    grid.innerHTML = '<p style="color:var(--color-text-muted);font-size:.9rem;">No links yet — add one above.</p>';
    return;
  }

  quickLinks.forEach((link) => {
    const item = document.createElement('div');
    item.className = 'quicklink__item';

    const anchor = document.createElement('a');
    anchor.className = 'quicklink__anchor';
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.label;
    anchor.setAttribute('aria-label', `Open ${link.label} in a new tab`);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'quicklink__delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Remove ${link.label}`);
    deleteBtn.addEventListener('click', () => deleteQuickLink(link.id));

    item.append(anchor, deleteBtn);
    grid.appendChild(item);
  });
}

function addQuickLink(label, url) {
  const validation = validateQuickLink(label, url);
  if (!validation.valid) {
    showLinkError(validation.error);
    return;
  }

  hideLinkError();
  const snapshot = [...quickLinks];
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Date.now().toString();

  quickLinks.push({ id, label: label.trim(), url: url.trim() });
  renderQuickLinks();
  persistQuickLinks(snapshot);
}

function deleteQuickLink(id) {
  const snapshot = [...quickLinks];
  quickLinks = quickLinks.filter(l => l.id !== id);
  renderQuickLinks();
  persistQuickLinks(snapshot);
}

/** Initialise the quick links widget: load from storage, render, wire form. */
function initQuickLinks() {
  quickLinks = storage.read('pd_quicklinks') || [];
  renderQuickLinks();

  const labelInput = document.getElementById('linkLabel');
  const urlInput   = document.getElementById('linkUrl');
  const addBtn     = document.getElementById('addLinkBtn');

  addBtn.addEventListener('click', () => {
    addQuickLink(labelInput.value, urlInput.value);
    if (document.getElementById('linkError').hidden) {
      labelInput.value = '';
      urlInput.value   = '';
    }
  });

  labelInput.addEventListener('input', hideLinkError);
  urlInput.addEventListener('input', hideLinkError);
}

/* ── INIT ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  if (!storage.isAvailable()) showStorageBanner();
  initTheme();
  initGreeting();
  initTimer();
  initTodo();
  initQuickLinks();
});
