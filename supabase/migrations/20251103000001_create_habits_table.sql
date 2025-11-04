-- Create habits table
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  target_minutes integer not null default 1200,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.habits enable row level security;

-- Policy: users can only see/edit their own habits
create policy "habits self"
  on public.habits
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

