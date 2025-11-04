-- Drop existing policies to recreate them with admin access
drop policy if exists "profiles are self" on public.profiles;
drop policy if exists "habits self" on public.habits;
drop policy if exists "sessions self" on public.habit_sessions;

-- Profiles policies: Allow users to see/edit their own profile OR admins to see/edit all
create policy "profiles are self or admin"
  on public.profiles
  for all
  using (
    auth.uid() = id 
    or (select public.is_admin())
  )
  with check (
    auth.uid() = id 
    or (select public.is_admin())
  );

-- Habits policies: Allow users to see/edit their own habits OR admins to see/edit all
create policy "habits self or admin"
  on public.habits
  for all
  using (
    auth.uid() = owner_id 
    or (select public.is_admin())
  )
  with check (
    auth.uid() = owner_id 
    or (select public.is_admin())
  );

-- Habit sessions policies: Allow users to see/edit their own sessions OR admins to see/edit all
create policy "sessions self or admin"
  on public.habit_sessions
  for all
  using (
    auth.uid() = owner_id 
    or (select public.is_admin())
  )
  with check (
    auth.uid() = owner_id 
    or (select public.is_admin())
  );

-- Note: habit_progress view inherits RLS from the underlying habits table
-- The habits policy above will automatically apply to the view

