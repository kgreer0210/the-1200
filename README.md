# The 1200 - Habit Tracking Application

A modern habit tracking application that helps users track their progress toward a goal of 1200 minutes (20 hours) for various habits. Built with Next.js, React, and Supabase.

## Overview

**The 1200** is a focused habit tracking app designed around the concept of accumulating 1200 minutes of practice or activity for any habit. Users can:

- Create multiple habits with customizable targets (default: 1200 minutes)
- Track sessions using a built-in timer with start/pause/resume/stop functionality
- Log sessions manually with custom durations
- Monitor daily progress with a "Qualified Today" badge (requires ≥20 minutes per day)
- Visualize progress with circular progress indicators
- View real-time updates across multiple devices

## Key Features

### 🎯 Habit Tracking
- Create unlimited habits with custom titles and target minutes
- Default target of 1200 minutes (20 hours) per habit cycle
- Visual progress rings showing completion percentage
- Completion state when target is reached

### ⏱️ Session Timer
- Built-in timer with start, pause, resume, stop, and reset controls
- Tracks elapsed time accurately, accounting for paused periods
- Requires minimum 1 minute to save a session
- Optional notes for each session (max 280 characters)

### ✅ Daily Qualification
- "Qualified Today" badge when ≥20 minutes logged in a single day
- Separate tracking of daily vs. total progress
- Helps maintain consistent daily practice

### 📊 Progress Visualization
- Circular progress rings with color coding:
  - Green: 100% complete
  - Blue: 75%+ complete
  - Yellow: 50%+ complete
  - Orange: <50% complete
- Dashboard overview of all habits
- Detailed habit pages with session history

### 🔄 Real-time Updates
- Supabase Realtime integration for live session updates
- Automatic refresh when sessions are created, updated, or completed
- Multi-device synchronization

### 👑 Admin Dashboard
- View all users and their roles
- Promote/demote users between admin and customer roles
- System statistics
- First user automatically promoted to admin

### 🔐 Authentication & Security
- Email/password authentication via Supabase Auth
- Row Level Security (RLS) policies ensuring users only see their own data
- Admin users can view all user data
- Profile completion flow for new users

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: 19.2.0
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Form Handling**: React Hook Form + Zod
- **State Management**: React Query (TanStack Query)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm, yarn, pnpm, or bun package manager
- Supabase account (or local Supabase setup)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd the-1200
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

   For local development with Supabase CLI:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
   ```

4. **Set up Supabase**

   **Option A: Local Development (Recommended)**
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Initialize Supabase
   supabase init
   
   # Start local Supabase
   supabase start
   
   # Apply migrations
   supabase migration up
   ```

   **Option B: Production Setup**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run migrations from `supabase/migrations/` in the SQL Editor
   - Enable Realtime for the `habit_sessions` table

5. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

### Tables

- **`profiles`**: User profile information (email, name, role, timezone)
- **`habits`**: User habits with titles and target minutes
- **`habit_sessions`**: Individual tracking sessions with duration and notes

### Views

- **`habit_progress`**: Aggregated view showing total minutes per habit

### Key Features

- Row Level Security (RLS) enabled on all tables
- Users can only access their own data (except admins)
- Automatic profile creation on user signup
- First user automatically promoted to admin role

## Project Structure

```
the-1200/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin dashboard
│   ├── auth/              # Auth confirmation handler
│   ├── habits/            # Habit pages (list, detail, create)
│   ├── login/             # Authentication pages
│   ├── onboarding/        # Profile completion flow
│   ├── actions.ts         # Global server actions
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Dashboard (home page)
├── components/            # React components
│   ├── ui/                # shadcn/ui components
│   ├── HabitCard.tsx      # Habit card component
│   ├── SessionTimer.tsx   # Timer component
│   ├── ProgressRing.tsx   # Progress visualization
│   └── ...
├── lib/                   # Utility libraries
│   ├── supabase/          # Supabase client configurations
│   └── utils.ts           # Shared utilities
├── supabase/
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
└── public/                # Static assets
```

## Usage

### Creating a Habit

1. Click "New Habit" on the dashboard
2. Enter a habit title (max 80 characters)
3. Set target minutes (default: 1200)
4. Click "Create Habit"

### Tracking Sessions

**Using the Timer:**
1. Navigate to a habit detail page
2. Click "Start Session"
3. Use pause/resume/stop controls as needed
4. When stopping, optionally add a note
5. Save the session (minimum 1 minute required)

**Manual Logging:**
1. Use quick buttons (10m, 20m, 30m, 60m) or enter custom minutes
2. Optionally add a note
3. Submit to log the session

### Daily Qualification

- Log at least 20 minutes in a single day to earn the "Qualified Today" badge
- The badge appears on both the dashboard and habit detail pages
- Daily qualification is separate from total progress tracking

### Completion

- When a habit reaches its target minutes, it shows a completion state
- Session logging is disabled for completed habits
- Future enhancements may include cycle restart options

## Development

### Running Migrations

```bash
# Local development
supabase migration up

# Production (via Supabase MCP or Dashboard)
# Apply migrations from supabase/migrations/ directory
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- TypeScript strict mode enabled
- ESLint configured with Next.js rules
- React Server Components used for data fetching
- Client components marked with `"use client"` directive

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### Supabase Configuration

- Set **Auth → URL Configuration** in Supabase Dashboard to your Vercel domain
- Ensure all migrations are applied
- Enable Realtime for `habit_sessions` table

## Security

- Row Level Security (RLS) policies on all tables
- Users can only access their own data
- Admin users can view all user data via RLS policies
- Server-side validation for all user inputs
- Protected routes via middleware

## Roadmap

See `Roapmap.md` for detailed feature roadmap and completed tasks.

Future enhancements may include:
- 30-day heatmap visualization
- Leaderboard and social features
- Email reminders for daily practice
- Cycle restart functionality
- CSV export of sessions
- PWA support

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
