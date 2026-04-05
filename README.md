# FinTrack - Premium Finance Dashboard

FinTrack is a modern, responsive fintech-style dashboard built with pure HTML, CSS, and vanilla JavaScript. It focuses on polished UI, clean state-driven behavior, and practical financial workflows such as search, filtering, sorting, and role-based actions.

## Project Overview

This dashboard simulates a real-world finance product experience with:

- A premium dark theme and polished card-based layout
- Insightful data visualizations using Chart.js
- A transaction management workflow with role-based controls
- Smooth micro-interactions and responsive behavior across devices

## Features

- **Dashboard Summary**
  - Total Balance
  - Total Income
  - Total Expenses
  - Color-coded values and hover lift effects

- **Charts**
  - Line chart for cumulative monthly balance trend
  - Pie chart for expense category breakdown
  - Theme-matched chart styling for dark UI

- **Transactions Table**
  - Search by category or amount
  - Filter by type (`income` / `expense`)
  - Sort by date or amount (asc/desc)
  - Empty state when no rows match

- **Role-Based UI (Simulated)**
  - `Viewer`: read-only access
  - `Admin`: can add, edit, and delete transactions
  - UI updates dynamically when role changes

- **Insights Section**
  - Highest spending category
  - Monthly increase/decrease trend
  - Total savings snapshot

- **Optional Enhancement Implemented**
  - `localStorage` persistence for transactions and selected role

## Tech Stack

- HTML5
- Pure CSS3 (no UI framework)
- Vanilla JavaScript (ES6+)
- Chart.js (CDN)

## How To Run

1. Open the project folder.
2. Open `index.html` in any modern browser.
3. Start interacting with filters, role switcher, and transactions.

No build tools or package installation required.

## Folder Structure

```text
/
├── index.html
├── style.css
├── script.js
├── data.js
└── README.md
```

## Role-Based UI Explanation

- Role is controlled by the top-right dropdown.
- In **Viewer** mode:
  - Add button is disabled
  - Edit/Delete actions are hidden
- In **Admin** mode:
  - Add button is enabled
  - Modal form is available
  - Edit/Delete actions are shown per row

This behavior is managed dynamically in JavaScript and updates immediately on role change.

## State Management Explanation

The app uses a centralized `state` object to keep logic organized:

- `transactions`: source of truth for all entries
- `filteredTransactions`: computed list after search/filter/sort
- `role`: current user mode (`viewer` or `admin`)
- `searchQuery`, `typeFilter`, `sortBy`: UI control state
- `editingId`: tracks modal edit context
- `charts`: stores chart instances for clean re-rendering

Flow:

1. User input updates state.
2. `render()` recomputes derived data.
3. UI sections (cards, table, charts, insights) refresh consistently.
4. Data persists via `localStorage`.

## Design Choices

- **Dark fintech theme** with the required palette:
  - Background `#0f172a`
  - Card `#1e293b`
  - Border `#334155`
  - Primary `#6366f1`
  - Success `#22c55e`
  - Danger `#ef4444`
  - Text `#e2e8f0`
  - Subtext `#94a3b8`
- **Rounded corners and soft shadows** for modern depth
- **Glassmorphism accents** via translucent panels + backdrop blur
- **Micro-interactions**:
  - Card hover lift
  - Button hover scale
  - Row hover highlights
  - Smooth transitions
- **Responsive layout**:
  - Grid on desktop
  - Stacked sections on smaller screens
  - Horizontal scroll for transaction table on mobile

## Notes

- The project uses mock/static data from `data.js`.
- All features run fully in the browser with no backend.
