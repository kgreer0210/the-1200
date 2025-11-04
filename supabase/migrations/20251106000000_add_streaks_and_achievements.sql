-- Add streaks and achievements system
-- This migration creates tables, functions, and triggers for tracking streaks and achievements

-- Create achievement type enum
create type achievement_type as enum ('streak', 'milestone');

-- Create habit_streaks table
create table public.habit_streaks (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_qualified_date date,
  updated_at timestamptz not null default now(),
  unique(habit_id, owner_id)
);

-- Enable RLS on habit_streaks
alter table public.habit_streaks enable row level security;

-- Policy: users can only see/edit their own streaks
create policy "streaks self"
  on public.habit_streaks
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Create achievements table (master list of all achievements)
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  type achievement_type not null,
  threshold integer not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on achievements (read-only for authenticated users)
alter table public.achievements enable row level security;

-- Policy: authenticated users can read all achievements
create policy "achievements read"
  on public.achievements
  for select
  to authenticated
  using (true);

-- Create user_achievements table (track unlocked achievements per user/habit)
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique(user_id, habit_id, achievement_id)
);

-- Enable RLS on user_achievements
alter table public.user_achievements enable row level security;

-- Policy: users can only see their own achievements
create policy "user_achievements self"
  on public.user_achievements
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Create index for faster lookups
create index idx_user_achievements_user_habit on public.user_achievements(user_id, habit_id);
create index idx_habit_streaks_habit_owner on public.habit_streaks(habit_id, owner_id);

-- Function to calculate streak for a habit
-- Returns the current streak count (consecutive days with >= 20 minutes)
create or replace function public.calculate_streak(p_habit_id uuid, p_owner_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_streak integer := 0;
  v_check_date date;
  v_total_minutes integer;
  v_yesterday date;
begin
  -- Start from yesterday (we'll check today separately)
  v_check_date := (current_date - interval '1 day')::date;
  
  -- Work backwards until we find a day without >= 20 minutes
  loop
    -- Get total minutes for this day
    select coalesce(sum(minutes), 0) into v_total_minutes
    from public.habit_sessions
    where habit_id = p_habit_id
      and owner_id = p_owner_id
      and status = 'completed'
      and started_at::date = v_check_date
      and minutes >= 0;
    
    -- If this day has >= 20 minutes, continue the streak
    if v_total_minutes >= 20 then
      v_streak := v_streak + 1;
      v_check_date := v_check_date - interval '1 day';
    else
      -- Streak broken, exit
      exit;
    end if;
    
    -- Safety limit to prevent infinite loops
    if v_streak > 1000 then
      exit;
    end if;
  end loop;
  
  -- Now check today
  select coalesce(sum(minutes), 0) into v_total_minutes
  from public.habit_sessions
  where habit_id = p_habit_id
    and owner_id = p_owner_id
    and status = 'completed'
    and started_at::date = current_date
    and minutes >= 0;
  
  -- If today has >= 20 minutes, add to streak
  if v_total_minutes >= 20 then
    v_streak := v_streak + 1;
  end if;
  
  return v_streak;
end;
$$;

-- Function to update habit streak
create or replace function public.update_habit_streak(p_habit_id uuid, p_owner_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_current_streak integer;
  v_longest_streak integer;
  v_last_qualified_date date;
  v_total_minutes integer;
begin
  -- Calculate current streak
  v_current_streak := public.calculate_streak(p_habit_id, p_owner_id);
  
  -- Get existing streak record
  select longest_streak, last_qualified_date into v_longest_streak, v_last_qualified_date
  from public.habit_streaks
  where habit_id = p_habit_id and owner_id = p_owner_id;
  
  -- If no record exists, initialize longest_streak
  if v_longest_streak is null then
    v_longest_streak := 0;
  end if;
  
  -- Update longest streak if current is higher
  if v_current_streak > v_longest_streak then
    v_longest_streak := v_current_streak;
  end if;
  
  -- Check if qualified today
  select coalesce(sum(minutes), 0) into v_total_minutes
  from public.habit_sessions
  where habit_id = p_habit_id
    and owner_id = p_owner_id
    and status = 'completed'
    and started_at::date = current_date
    and minutes >= 0;
  
  -- Update last_qualified_date if qualified today
  if v_total_minutes >= 20 then
    v_last_qualified_date := current_date;
  end if;
  
  -- Upsert streak record
  insert into public.habit_streaks (habit_id, owner_id, current_streak, longest_streak, last_qualified_date, updated_at)
  values (p_habit_id, p_owner_id, v_current_streak, v_longest_streak, v_last_qualified_date, now())
  on conflict (habit_id, owner_id) 
  do update set
    current_streak = excluded.current_streak,
    longest_streak = excluded.longest_streak,
    last_qualified_date = excluded.last_qualified_date,
    updated_at = now();
  
  -- Check for streak-based achievements
  perform public.check_streak_achievements(p_habit_id, p_owner_id, v_current_streak);
end;
$$;

-- Function to check and award streak-based achievements
create or replace function public.check_streak_achievements(p_habit_id uuid, p_owner_id uuid, p_current_streak integer)
returns void
language plpgsql
security definer
as $$
declare
  v_achievement record;
begin
  -- Check for streak achievements that match the current streak
  for v_achievement in
    select id, code, threshold
    from public.achievements
    where type = 'streak'
      and threshold = p_current_streak
  loop
    -- Check if user already has this achievement
    if not exists (
      select 1
      from public.user_achievements
      where user_id = p_owner_id
        and habit_id = p_habit_id
        and achievement_id = v_achievement.id
    ) then
      -- Award the achievement
      insert into public.user_achievements (user_id, habit_id, achievement_id)
      values (p_owner_id, p_habit_id, v_achievement.id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- Function to check and award milestone-based achievements
create or replace function public.check_milestone_achievements(p_habit_id uuid, p_owner_id uuid, p_total_minutes bigint)
returns void
language plpgsql
security definer
as $$
declare
  v_achievement record;
begin
  -- Check for milestone achievements that the user has reached
  for v_achievement in
    select id, code, threshold
    from public.achievements
    where type = 'milestone'
      and threshold <= p_total_minutes
  loop
    -- Check if user already has this achievement
    if not exists (
      select 1
      from public.user_achievements
      where user_id = p_owner_id
        and habit_id = p_habit_id
        and achievement_id = v_achievement.id
    ) then
      -- Award the achievement
      insert into public.user_achievements (user_id, habit_id, achievement_id)
      values (p_owner_id, p_habit_id, v_achievement.id)
      on conflict do nothing;
    end if;
  end loop;
end;
$$;

-- Trigger function to update streaks when a session is completed
create or replace function public.on_session_completed()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_minutes bigint;
begin
  -- Only process completed sessions
  if new.status = 'completed' then
    -- Update streak
    perform public.update_habit_streak(new.habit_id, new.owner_id);
    
    -- Get total minutes for milestone achievements
    select coalesce(sum(minutes), 0) into v_total_minutes
    from public.habit_sessions
    where habit_id = new.habit_id
      and owner_id = new.owner_id
      and status = 'completed'
      and minutes is not null;
    
    -- Check milestone achievements
    perform public.check_milestone_achievements(new.habit_id, new.owner_id, v_total_minutes);
  end if;
  
  return new;
end;
$$;

-- Create trigger on habit_sessions
create trigger on_habit_session_completed
  after insert or update on public.habit_sessions
  for each row
  when (new.status = 'completed')
  execute function public.on_session_completed();

-- Seed achievements
insert into public.achievements (code, name, description, type, threshold) values
  ('streak_3', '3-Day Streak', 'Maintain your habit for 3 consecutive days', 'streak', 3),
  ('streak_7', '7-Day Streak', 'Maintain your habit for 7 consecutive days', 'streak', 7),
  ('streak_30', '30-Day Streak', 'Maintain your habit for 30 consecutive days', 'streak', 30),
  ('milestone_100', 'First 100 Minutes', 'Log your first 100 minutes', 'milestone', 100),
  ('milestone_500', '500 Minutes', 'Reach 500 minutes of practice', 'milestone', 500),
  ('milestone_1000', '1000 Minutes', 'Reach 1000 minutes of practice', 'milestone', 1000)
on conflict (code) do nothing;

-- Grant necessary permissions
grant select on public.achievements to authenticated;
grant select, insert, update on public.habit_streaks to authenticated;
grant select, insert on public.user_achievements to authenticated;

