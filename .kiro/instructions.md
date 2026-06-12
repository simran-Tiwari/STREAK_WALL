# STREAKWALL — Kiro Agent Instructions

## Project Context
STREAKWALL is a full-stack habit-tracking app. Always read `.kiro/specs/streakwall.md` before starting any feature work.

## Repository Layout
```
STREAKWALL/
├── frontend/              # Angular app
│   └── src/app/
│       ├── auth/          # login, signup components + auth guard + jwt interceptor
│       ├── wall/          # WallComponent (grid, header, stats)
│       └── services/      # auth.service.ts, habit.service.ts
├── backend/               # Express API
│   └── src/
│       ├── routes/        # auth.routes.ts, habit.routes.ts
│       ├── models/        # user.model.ts (Mongoose)
│       ├── middleware/    # auth.middleware.ts (JWT verify)
│       └── index.ts
└── .kiro/
    ├── specs/streakwall.md
    └── instructions.md
```

## Coding Rules

### General
- TypeScript strict mode everywhere
- No `any` types
- `async/await` only — no raw `.then()` chains
- Minimal dependencies

### Backend
- JWT secret from `process.env.JWT_SECRET` — never hardcoded
- MongoDB URI from `process.env.MONGODB_URI`
- All route handlers wrapped in try/catch; return `{ error: string }` with appropriate HTTP status
- bcrypt rounds: 10
- Dates always as `YYYY-MM-DD` strings

### Frontend
- Angular standalone components only (no NgModules)
- `AuthService` — login/signup/logout + token storage
- `HabitService` — all `/api/habit` calls + streak computation
- Streak logic in a pure function `computeStreaks(doneDates: string[])` inside `HabitService`
- JWT interceptor adds `Authorization` header automatically
- Milestone check runs after every toggle; fires only for milestones not in `celebratedMilestones`
- Use Angular signals for local state (Angular 17+)
- Plain CSS only — no CSS frameworks

## Environment Variables

### Backend `.env`
```
PORT=3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=replace_with_strong_secret
```

### Frontend `environment.ts`
```ts
export const environment = { apiUrl: 'http://localhost:3000' };
```

## Key Implementation Notes
1. `POST /api/habit/toggle-day` returns the full updated `doneDates` and `celebratedMilestones` — no second fetch needed.
2. Auth guard uses Angular's `CanActivateFn`; checks for non-expired JWT in localStorage.
3. Future dates: disabled in UI + rejected server-side with 400.
4. Reset clears `doneDates` and `celebratedMilestones` only — `habitName` is preserved.

## Recommended Build Order
1. Backend: Express + Mongoose + User model
2. Auth routes + JWT middleware
3. Habit routes
4. Angular scaffold: routing + auth guard + interceptor
5. Login + Signup components
6. WallComponent: grid + toggle + streaks
7. Milestone celebration (confetti + toast)
8. Responsive CSS
9. Production environment config

## Manual Testing Checklist
- [ ] Signup creates user; login returns token
- [ ] Unauthenticated requests return 401
- [ ] Toggling past/today updates grid and streaks
- [ ] Toggling future date blocked in UI and returns 400
- [ ] Milestone confetti fires only once per milestone
- [ ] Reset clears grid/streaks; habit name persists
- [ ] Layout works at 375px mobile width
