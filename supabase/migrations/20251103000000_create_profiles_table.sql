-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policy: users can only see/edit their own profile
create policy "profiles are self"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

