# STREAKWALL — Product Spec

## Overview
STREAKWALL is a habit-tracking web app that lets users log daily progress on a single habit, visualise their history as a monthly contribution grid, and stay motivated through streak counters and milestone celebrations.

## Tech Stack
- **Frontend:** Angular (standalone components, Angular Router, HttpClient)
- **Backend:** Node.js + Express
- **Database:** MongoDB via Mongoose
- **Auth:** JWT (access token stored in localStorage)
- **Deploy:** Vercel (frontend) + Render (backend)

---

## Features

### 1. User Authentication
- Sign up with email + password
- Login returns a JWT; stored in localStorage
- All habit endpoints require `Authorization: Bearer <token>`
- Passwords hashed with bcrypt

### 2. Habit Name Setup
- On first login, prompt user to enter a habit name (e.g. "Coding")
- Stored in DB under the user document
- Editable at any time via an inline input in the header

### 3. Monthly Contribution Grid
- Displays the current month as a calendar grid (7 columns, Mon–Sun)
- Each day is a clickable cell
- Data fetched from `GET /api/habit` on load

### 4. Toggle Day Done/Undone
- Clicking a past or today cell toggles its done state
- Done cells render green/filled
- Sends `POST /api/habit/toggle-day` with `{ date: "YYYY-MM-DD" }`
- Future date cells are disabled and non-clickable

### 5. Today Highlight
- Today's cell has a distinct outline/border to distinguish it

### 6. Current Streak
- Count of consecutive done-days ending on today or yesterday
- Displayed as "🔥 Current streak: X days"
- Computed on the frontend from the fetched `doneDates` array

### 7. Longest Streak
- The longest consecutive run ever recorded
- Displayed as "🏆 Longest: X days"
- Computed on the frontend from `doneDates`

### 8. Milestone Celebrations
- Milestones: 3, 7, 14, 30 days
- On reaching a new milestone, show a confetti animation + toast notification
- Each milestone celebrated only once; tracked in `celebratedMilestones` array in DB

### 9. Reset Data
- "Reset" button with a confirmation dialog
- Calls `DELETE /api/habit/reset`
- Clears `doneDates` and `celebratedMilestones`; habit name is preserved

### 10. Database Persistence
- All data stored in MongoDB, linked to user by `userId`

### 11. Responsive Layout
- Mobile-first CSS; grid and header adapt to small screens
- Minimum supported width: 320px

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/signup` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/habit` | Yes | Fetch user's habit data |
| PUT | `/api/habit/name` | Yes | Update habit name |
| POST | `/api/habit/toggle-day` | Yes | Toggle a date done/undone |
| DELETE | `/api/habit/reset` | Yes | Reset all habit data |

---

## Database Schema

```js
{
  _id: ObjectId,
  email: String,                  // unique, required
  passwordHash: String,           // bcrypt hash
  habitName: String,              // default: "My Habit"
  doneDates: [String],            // ["YYYY-MM-DD", ...]
  celebratedMilestones: [Number]  // [3, 7, ...]
}
```

---

## Frontend Routes

| Path | Component | Notes |
|------|-----------|-------|
| `/login` | LoginComponent | Redirects to `/` if already authed |
| `/signup` | SignupComponent | Redirects to `/` if already authed |
| `/` | WallComponent | Auth guard — redirects to `/login` if no token |

---

## Non-Goals
- Multiple habits per user
- Social/sharing features
- Push notifications
