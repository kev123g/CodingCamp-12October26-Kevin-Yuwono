# Requirements Document

## Introduction

The Personal Dashboard is a browser-based single-page web application built with HTML, CSS, and Vanilla JavaScript. It provides a focused productivity hub that displays the current time and date with a contextual greeting, a Pomodoro-style focus timer, a persistent to-do list, and a set of user-defined quick-access links. All user data is stored in the browser's Local Storage — no backend, no account, no setup required. The application targets modern browsers (Chrome, Firefox, Edge, Safari) and can be used as a standalone web page or packaged as a browser extension.

## Glossary

- **Dashboard**: The single-page web application that hosts all four productivity widgets.
- **Greeting_Widget**: The UI component that displays the current time, date, and time-of-day greeting.
- **Focus_Timer**: The Pomodoro-style countdown timer widget.
- **Todo_List**: The task management widget for creating, editing, completing, and deleting tasks.
- **Quick_Links**: The widget that stores and displays user-defined shortcut buttons to external URLs.
- **Local_Storage**: The browser's Web Storage API (`window.localStorage`) used for all client-side data persistence.
- **Task**: A single to-do item with a text description and a completion state.
- **Session**: A single configurable focus interval on the Focus_Timer.
- **Quick_Link**: A named URL entry stored and rendered as a clickable button.
- **Theme**: The active colour scheme of the Dashboard — either Light or Dark.
- **Custom_Name**: A user-provided display name shown in the greeting message.

---

## Requirements

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see the current time, date, and a personalised greeting based on the time of day, so that I have immediate temporal context when I open the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in HH:MM format using a 24-hour clock with zero-padded hours (00–23) and minutes (00–59), updated every 60 seconds.
2. THE Greeting_Widget SHALL display the current date derived from the user's local system clock in the format "Weekday, Month DD, YYYY" (e.g., "Monday, October 26, 2026").
3. WHEN the local hour is between 5 and 11 inclusive, THE Greeting_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12 and 17 inclusive, THE Greeting_Widget SHALL display the greeting "Good Afternoon".
5. WHEN the local hour is between 18 and 23 inclusive, THE Greeting_Widget SHALL display the greeting "Good Evening".
6. WHEN the local hour is between 0 and 4 inclusive, THE Greeting_Widget SHALL display the greeting "Good Night".
7. WHEN the Dashboard page loads, THE Greeting_Widget SHALL immediately display the current time, date, and greeting without waiting for the 60-second update interval.
8. WHEN a Custom_Name has been saved, THE Greeting_Widget SHALL append the name to the greeting (e.g., "Good Morning, Alex").
9. WHEN no Custom_Name has been saved, THE Greeting_Widget SHALL display the greeting without a name suffix.
10. THE Greeting_Widget SHALL provide an input field and save button that allow the user to set or update the Custom_Name at any time.
11. WHEN the user saves a Custom_Name, THE Greeting_Widget SHALL immediately reflect the updated name in the greeting and persist the name to Local_Storage.
12. WHEN the user clears the Custom_Name field and saves, THE Greeting_Widget SHALL revert to the nameless greeting and remove the Custom_Name from Local_Storage.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a configurable countdown timer with Start, Stop, and Reset controls, so that I can structure my work into focus sessions of my preferred length.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise with a countdown value equal to the user's saved duration setting, defaulting to 25 minutes (25:00) when no setting has been saved.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down one second per real-time second.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed time every second.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the display to the current saved duration.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically and display a visible completion notification lasting no less than 3 seconds.
7. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the Start control.
8. WHILE the Focus_Timer is paused or reset, THE Focus_Timer SHALL disable the Stop control.
9. WHILE the Focus_Timer is stopped, paused, or reset, THE Focus_Timer SHALL enable the Start control.
10. THE Focus_Timer SHALL provide a duration input that accepts integer values between 1 and 120 minutes inclusive.
11. WHEN the user saves a new duration, THE Focus_Timer SHALL reset the countdown to the new duration, persist the value to Local_Storage, and update the display immediately.
12. IF the user enters a duration outside the 1–120 minute range or a non-integer value, THE Focus_Timer SHALL reject the input and display an inline validation message.

---

### Requirement 3: To-Do List

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks that persist across browser sessions, so that I can manage my daily workload without losing progress.

#### Acceptance Criteria

1. WHEN the user submits a task description between 1 and 500 characters inclusive, THE Todo_List SHALL add a new Task with that description and a completion state of false.
2. IF the user submits an empty task description, THEN THE Todo_List SHALL reject the submission and display an inline validation message.
3. WHEN the user activates the edit control on a Task, THE Todo_List SHALL make the task description editable in-place.
4. WHEN the user confirms an in-place edit with a description between 1 and 500 characters inclusive, THE Todo_List SHALL save the updated description to the Task.
5. IF the user confirms an in-place edit with an empty description, THEN THE Todo_List SHALL reject the update and retain the previous description.
6. IF the user submits or confirms a task description exceeding 500 characters, THEN THE Todo_List SHALL reject the input and display an inline validation message indicating the character limit.
7. WHEN the user activates the complete control on a Task, THE Todo_List SHALL toggle the Task's completion state between true and false.
8. WHEN the user activates the delete control on a Task, THE Todo_List SHALL permanently remove the Task from the list.
9. WHEN any Task is added, edited, toggled, or deleted, THE Todo_List SHALL persist the full task array to Local_Storage within 500 milliseconds.
10. WHEN the Dashboard loads and Local_Storage contains a non-empty task array, THE Todo_List SHALL read the task array from Local_Storage and render all stored Tasks.
11. IF the Dashboard loads and Local_Storage contains no task data, THEN THE Todo_List SHALL render an empty task list with no tasks displayed.
12. THE Todo_List SHALL apply strikethrough text styling to the description of every Task whose completion state is true.

---

### Requirement 4: Quick Links

**User Story:** As a user, I want to save and access my favourite websites as named buttons, so that I can navigate to them quickly from the dashboard without typing URLs.

#### Acceptance Criteria

1. WHEN the user submits a Quick_Link with a label of 1–100 characters and a URL that begins with `http://` or `https://` and contains a non-empty host, THE Quick_Links SHALL add a new Quick_Link button to the widget.
2. IF the user submits a Quick_Link with an empty label, a label exceeding 100 characters, a URL that does not begin with `http://` or `https://`, a URL with an empty host, or when the current Quick_Link count is already 20, THEN THE Quick_Links SHALL reject the submission and display an inline validation message identifying the specific violation.
3. WHEN the user activates a Quick_Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
4. WHEN the user activates the delete control on a Quick_Link, THE Quick_Links SHALL permanently remove that Quick_Link.
5. WHEN any Quick_Link is added or deleted, THE Quick_Links SHALL persist the full Quick_Link array to Local_Storage within 500 milliseconds.
6. WHEN the Dashboard loads, THE Quick_Links SHALL read the Quick_Link array from Local_Storage and render all stored Quick_Links.
7. IF a Local_Storage write operation fails, THEN THE Quick_Links SHALL display an error message indicating that the change could not be saved and SHALL not update the displayed Quick_Link list.

---

### Requirement 5: Technical Stack and Compatibility

**User Story:** As a developer, I want the application built with plain HTML, CSS, and Vanilla JavaScript, so that it has no build step, no dependencies, and can run in any modern browser or as a browser extension.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no external scripts, no CDN-loaded resources, no npm packages, and no third-party libraries or frameworks included by any means.
2. THE Dashboard SHALL use the browser Local_Storage API as the sole mechanism for data persistence; no server-side storage or external APIs shall be used.
3. THE Dashboard SHALL function correctly on the latest stable versions of Chrome, Firefox, Edge, and Safari, where "correctly" means all Acceptance Criteria defined in Requirements 1–4 produce a passing result in each browser without browser-specific workarounds.
4. THE Dashboard SHALL be usable as a standalone web page opened directly from the file system (file:// protocol) or served from a local server, including full read and write access to Local_Storage in both deployment modes.
5. IF the Local_Storage API is unavailable or returns an access error, THEN THE Dashboard SHALL display an error message indicating that storage is unavailable and that data cannot be saved, and SHALL remain otherwise navigable without crashing.
6. THE Dashboard SHALL use exactly one CSS file located at `css/style.css` and exactly one JavaScript file located at `js/app.js`; no additional stylesheet or script files shall be used.
7. THE Dashboard code SHALL be clean and readable: consistent indentation, descriptive variable and function names, and logical grouping of related code with section comments.

---

### Requirement 6: Performance and Visual Design

**User Story:** As a user, I want a fast-loading, visually clean interface, so that the dashboard does not slow me down or distract me from my work.

#### Acceptance Criteria

1. THE Dashboard SHALL render all widgets and display the initial greeting within 2 seconds of the page load event, measured on a machine with at least a 4-core CPU, 8 GB RAM, and a 10 Mbps network connection.
2. THE Dashboard SHALL apply a consistent visual hierarchy with distinct sections for each widget, body text no smaller than 16 px, and colour contrast ratios meeting WCAG 2.1 Level AA (minimum 4.5:1 for normal text and 3:1 for large text).
3. IF the viewport width is 768 pixels or wider, THEN THE Dashboard SHALL arrange widgets in a multi-column grid layout.
4. IF the viewport width is below 768 pixels, THEN THE Dashboard SHALL arrange widgets in a single-column stacked layout.

---

### Requirement 7: Light / Dark Theme

**User Story:** As a user, I want to toggle between a light and a dark colour scheme, so that I can comfortably use the dashboard in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a theme toggle control (e.g., a button or switch) that is always visible in the page.
2. WHEN the user activates the theme toggle, THE Dashboard SHALL switch between the Light Theme and the Dark Theme immediately without a page reload.
3. WHEN the Dashboard loads, THE Dashboard SHALL apply the Theme saved in Local_Storage; if no Theme has been saved, THE Dashboard SHALL default to the Light Theme.
4. WHEN the user changes the Theme, THE Dashboard SHALL persist the new Theme value to Local_Storage within 500 milliseconds.
5. BOTH the Light Theme and the Dark Theme SHALL meet WCAG 2.1 Level AA colour contrast requirements (minimum 4.5:1 for normal text, 3:1 for large text) for all widget content.
