-- Create habit_sessions table
create table public.habit_sessions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  minutes integer not null check (minutes > 0),
  note text
);

-- Enable RLS
alter table public.habit_sessions enable row level security;

-- Policy: users can only see/edit their own sessions
create policy "sessions self"
  on public.habit_sessions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

