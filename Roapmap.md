# The 1200 Task List

---

## ✅ Environment & Packages

- [x] Create `.env.local`

  ```bash
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  ```

- [x] Install core deps

  ```bash
  npm i @supabase/supabase-js zod
  ```

- [x] (Optional) TanStack Query for client caching

  ```bash
  npm i @tanstack/react-query
  ```

---

## 🔐 Supabase Project & SQL

- [x] Create a Supabase project (Dashboard → New Project).
- [x] In the SQL editor, run the schema below.

```sql
-- Users are in auth.users. Profiles store user information and timezone
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role user_role not null default 'customer',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  target_minutes int not null default 1200, -- 20h
  created_at timestamptz not null default now(),
  unique (owner_id, title)
);

create table if not exists public.habit_sessions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  minutes int not null check (minutes > 0),
  note text
);

-- Aggregated progress view
create or replace view public.habit_progress
with (security_invoker = true)
as
select
  h.id as habit_id,
  h.owner_id,
  h.title,
  h.target_minutes,
  coalesce(sum(s.minutes), 0::bigint) as total_minutes
from public.habits h
left join public.habit_sessions s on s.habit_id = h.id
group by h.id;

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_sessions enable row level security;

-- Profile policies: users see/edit own OR admins see/edit all
create policy "profiles are self or admin" on public.profiles
  for all
  using (auth.uid() = id or (select public.is_admin()))
  with check (auth.uid() = id or (select public.is_admin()));

-- Habits policies: users see/edit own OR admins see/edit all
create policy "habits self or admin" on public.habits
  for all
  using (auth.uid() = owner_id or (select public.is_admin()))
  with check (auth.uid() = owner_id or (select public.is_admin()));

-- Sessions policies: users see/edit own OR admins see/edit all
create policy "sessions self or admin" on public.habit_sessions
  for all
  using (auth.uid() = owner_id or (select public.is_admin()))
  with check (auth.uid() = owner_id or (select public.is_admin()));
```

- [x] Create `user_role` enum type (`'customer'`, `'admin'`)
- [x] Create `is_admin()` helper function for RLS policies
- [x] Auto-create profile trigger on signup (with email from auth.users)
- [x] Auto-promote first user to admin
- [x] In **Authentication → Providers**, enable Email (password) authentication.
- [x] (Optional) Auth → URL Configuration: set SITE URL to your local and prod URLs.

---

## 🧰 Supabase Client Wiring

- [x] `lib/supabase/client.ts` — Browser client using `@supabase/ssr`
- [x] `lib/supabase/server.ts` — Server client using `@supabase/ssr` with cookies
- [x] `lib/supabase/middleware.ts` — Session update middleware
- [x] `lib/supabase/admin.ts` — Admin utility functions

---

## 👤 Auth Pages

- [x] `app/login/page.tsx` — Login/Signup form with tabs

  - Separate forms for login and signup using shadcn tabs
  - Form validation with Zod schemas
  - Error handling and loading states
  - Redirects to onboarding if profile incomplete after login/signup

- [x] `app/login/actions.ts` — Server actions for auth

  - `login()` — Sign in with email/password, checks profile completion
  - `signup()` — Create account, auto-creates profile with email, redirects to onboarding if name missing

- [x] `app/onboarding/page.tsx` — Profile completion form

  - Collects first name and last name after signup
  - Validates input (required, max 50 chars)
  - Redirects to home after completion

- [x] `app/onboarding/actions.ts` — Profile update actions

  - `updateProfile()` — Update user profile with name
  - `isProfileComplete()` — Check if profile has required fields

- [x] `app/auth/confirm/route.ts` — Email confirmation handler

  - Handles OTP verification from email links
  - Redirects to onboarding if profile incomplete

- [x] `app/logout/route.ts` (DELETE that signs out via `supabaseServer().auth.signOut()` then redirects)

---

## 🔧 Route Protection & Auth Flow

- [x] `middleware.ts` — Comprehensive route protection

  - Redirects unauthenticated users to `/login` (except `/login`, `/auth`, `/error`)
  - Redirects authenticated users with incomplete profiles to `/onboarding`
  - Protects `/admin/*` routes — only admins can access
  - Checks profile completion (requires `first_name` and `last_name`)

- [x] Auth Flow:
  1. User signs up → Profile created automatically with email from `auth.users`
  2. User redirected to `/onboarding` if name is missing
  3. User completes onboarding → Name saved, can access app
  4. User logs in → Checks profile completion, redirects to onboarding if needed
  5. Middleware enforces profile completion on all protected routes

---

## 🧱 App Structure

- [x] Create core folders and files

  ```
  app/
    layout.tsx
    page.tsx                  # ✅ Dashboard: list habits with progress
    login/
      page.tsx                # ✅ Login/Signup with tabs
      actions.ts              # ✅ Auth server actions
    onboarding/
      page.tsx                # ✅ Profile completion form
      actions.ts              # ✅ Profile update actions
    admin/
      page.tsx                # ✅ Admin dashboard
      actions.ts              # ✅ Admin management actions
    auth/
      confirm/route.ts        # ✅ Email confirmation handler
    habits/
      new/page.tsx            # ✅ Create habit form
      new/actions.ts          # ✅ Create habit server action
      [id]/page.tsx           # ✅ Habit detail with progress and sessions
      [id]/actions.ts         # ✅ Log session server action
  components/
    ui/                       # ✅ shadcn components (button, form, input, label, tabs)
    ProgressRing.tsx          # ✅ Circular progress indicator
    HabitCard.tsx             # ✅ Habit card with progress and badges
    LogSessionForm.tsx        # ✅ Session logging form with quick buttons
  lib/
    supabase/
      client.ts               # ✅ Browser client
      server.ts               # ✅ Server client
      middleware.ts           # ✅ Auth middleware
      admin.ts                # ✅ Admin utilities
  ```

---

## 👑 Admin Features

- [x] Admin/Customer Role System

  - [x] `user_role` enum type (`'customer'`, `'admin'`)
  - [x] `is_admin()` helper function for RLS policies
  - [x] RLS policies updated to allow admins to view/manage all user data
  - [x] Auto-promote first user to admin on migration

- [x] Admin Dashboard (`app/admin/page.tsx`)

  - [x] View all users with email, name, and role
  - [x] Promote users to admin
  - [x] Demote admins to customer (with self-protection)
  - [x] System statistics (total users, admins, customers)

- [x] Admin Utilities (`lib/supabase/admin.ts`)

  - [x] `isAdmin()` — server-side admin check
  - [x] `isAdminClient()` — client-side admin check
  - [x] `getUserRole()` — get current user's role

- [x] Admin Route Protection
  - [x] Middleware protects `/admin/*` routes
  - [x] Non-admins redirected to home

---

## 📦 Database Migrations

- [x] Migration system setup

  - [x] Local Supabase environment configured
  - [x] Migrations tracked in `supabase/migrations/`
  - [x] Production migrations applied via MCP

- [x] Completed migrations:
  - [x] `20251103000000_create_profiles_table.sql` — Profiles table
  - [x] `20251103000001_create_habits_table.sql` — Habits table
  - [x] `20251103000002_create_habit_sessions_table.sql` — Sessions table
  - [x] `20251103152942_create_profile_on_signup_trigger.sql` — Auto-profile creation
  - [x] `20251103152943_create_habit_progress_view.sql` — Progress view
  - [x] `20251103152944_update_habit_progress_view_security.sql` — View security
  - [x] `20251104000000_add_role_to_profiles.sql` — Role enum and column
  - [x] `20251104000001_create_admin_helper_function.sql` — Admin helper function
  - [x] `20251104000002_update_rls_for_admin_access.sql` — Admin RLS policies
  - [x] `20251104000003_add_email_and_name_to_profiles.sql` — Email and name fields

---

## 🌐 Local vs Production Environment

- [x] Local Supabase Setup

  - [x] Install Supabase CLI
  - [x] Initialize local Supabase (`supabase init`)
  - [x] Start local Supabase (`supabase start`)
  - [x] Local database accessible at `http://127.0.0.1:54322`
  - [x] Local Studio accessible at `http://127.0.0.1:54323`

- [x] Environment Variables

  - [x] `.env.local` — Local development (uses local Supabase)
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
    ```
  - [x] `.env.production` — Production (uses production Supabase)
    ```bash
    NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=<production-anon-key>
    ```
  - [x] Next.js automatically loads correct env file based on `NODE_ENV`

- [x] Migration Workflow
  - [x] Create migrations locally (`supabase migration new <name>`)
  - [x] Test migrations locally (`supabase migration up`)
  - [x] Apply migrations to production (`supabase db push` or via MCP)
  - [x] Migrations tracked in `supabase/migrations/` directory

---

## 🗂️ Habits CRUD (Server Actions)

- [x] `app/habits/[id]/actions.ts` — **logSession** & helpers

  - `logSession()` — Log session with minutes (1-300) and optional note
  - Validates input with Zod schema
  - Checks habit ownership and authorization
  - Supports admin logging sessions for other users

- [x] `app/habits/new/actions.ts` — Create habit server action

  - `createHabit()` — Create new habit with title and target minutes
  - Validates input with Zod schema
  - Redirects to habit detail page on success

- [x] `app/habits/new/page.tsx` — Form to create new habits

  - Client component with form validation
  - Inputs for title (max 80 chars) and target minutes (default: 1200)
  - Error handling and loading states

- [x] `app/page.tsx` — Fetch habits with progress (server component)

  - Fetches habits from `habit_progress` view
  - Calculates "qualified today" status (≥20m today)
  - Displays habits in grid with HabitCard components
  - Empty state when no habits exist

- [x] `app/habits/[id]/page.tsx` — Show progress %, total minutes, sessions, "Log 20m" form (POST to `logSession`)

  - Displays habit progress with ProgressRing component
  - Shows total minutes vs target minutes
  - Lists recent sessions (last 50) with timestamps and notes
  - Includes LogSessionForm component
  - Shows "qualified today" badge and completion state
  - Disables logging when habit is completed (total_minutes >= target_minutes)

---

## 🔴 "Qualified Today" Logic

- [x] Add a helper query for today (server component)

  - Implemented in `app/page.tsx` and `app/habits/[id]/page.tsx`
  - Calculates total minutes logged today (using UTC date filtering)
  - Shows "Qualified today" badge when ≥20 minutes logged
  - Query filters sessions by date range (today start to tomorrow start)

  > For correct local days: store `profiles.timezone` and compute "today" using that TZ in an RPC (nice-to-have).

---

## 🔁 Realtime (Optional but Nice)

- [x] Enable replication on `habit_sessions` (Database → Replication → Realtime → add table)

  - See `REALTIME_SETUP.md` for instructions
  - Can be enabled via Supabase Dashboard or SQL command

- [x] Client subscribe in `app/habits/[id]/page.tsx` (client section):

  - Created `components/RealtimeSessionsList.tsx` client component
  - Subscribes to `habit_sessions` table changes for specific habit
  - Updates local state immediately for better UX
  - Triggers router.refresh() to update progress and qualified today status
  - Handles INSERT, UPDATE, and DELETE events

  - [x] Cleanup on unmount.

- [x] React Query integration

  - Set up `QueryClientProvider` in `app/layout.tsx` via `components/Providers.tsx`
  - Configured with sensible defaults (1 minute stale time)
  - Ready for future query caching enhancements

---

## 🧩 UI Components

- [x] `components/ProgressRing.tsx` — Circular progress indicator with % text

  - SVG-based ring with conic-gradient styling
  - Color coding: green (100%), blue (75%+), yellow (50%+), orange (<50%)
  - Configurable size and stroke width
  - Displays percentage in center

- [x] `components/HabitCard.tsx` — Title, % complete, "Qualified today" badge

  - Displays habit title, progress ring, and minutes progress
  - Shows "Qualified today" badge when ≥20m logged today
  - Shows completion state when target reached
  - Clickable card that navigates to habit detail page

- [x] `components/LogSessionForm.tsx` — Quick buttons (10m, 20m, 30m, 60m) + custom minutes

  - Quick log buttons for common session lengths
  - Custom minutes input (1-300 minutes)
  - Optional note field (max 280 chars)
  - Form validation with Zod
  - Success/error feedback
  - Disabled state when habit is completed

---

## 🧪 Manual Testing Checklist

- [x] Auth & Onboarding:

  - [x] Sign up new user → Profile created with email, redirected to onboarding
  - [x] Complete onboarding form → Name saved, redirected to home
  - [x] Login with incomplete profile → Redirected to onboarding
  - [x] Login with complete profile → Access granted to app
  - [x] Middleware redirects incomplete profiles → All routes protected

- [x] Admin Features:

  - [x] First user automatically promoted to admin
  - [x] Admin can access `/admin` dashboard
  - [x] Non-admin redirected from `/admin` routes
  - [x] Admin can view all users
  - [x] Admin can promote/demote users
  - [x] Admin cannot demote themselves

- [ ] Habits & RLS:
  - [ ] Create 2 users, verify RLS prevents cross-access.
  - [ ] Verify admins can see all users' habits
  - [ ] Log <20m and confirm it **does not** qualify the day but adds to total.
  - [ ] Log ≥20m and confirm "Qualified today" flips.
  - [ ] Cross-day streak (optional): simulate by inserting `started_at` on previous days.
  - [ ] Edge cases: 0 / negative / >300 minutes rejected by Zod.

---

## 🎉 Completion & Cycle

- [x] When `total_minutes >= 1200`, show "Completed" state:

  - [x] Disable "Log Session" form when habit is completed
  - [x] Show completion message and badge on habit detail page
  - [x] Display completion state on dashboard HabitCard
  - [ ] Offer "Restart Cycle" (new habit with same title + "(Cycle 2)") **or** "Extend Target" (e.g., 1800) — _Future enhancement_

---

## ⏰ Reminders (Stretch)

- [ ] Add `profiles.reminder_hour int` (local hour).
- [ ] Create a Scheduled Function (cron) to email users who haven’t qualified today.
- [ ] Use Resend/SendGrid from an Edge Function.

---

## 🚀 Deploy

- [ ] Push to GitHub.
- [ ] Deploy to Vercel.
- [ ] Set env vars in Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Set **Auth → URL** in Supabase to the Vercel domain.
- [ ] Test login, RLS, and realtime in prod.

---

## 📝 Backlog Ideas

- [ ] 30-day heatmap (Postgres date series or client lib).
- [ ] Leaderboard (friends table + RLS).
- [ ] Dark mode toggle (CSS variables, no deps).
- [ ] CSV export of sessions.
- [ ] PWA install (offline home screen).
