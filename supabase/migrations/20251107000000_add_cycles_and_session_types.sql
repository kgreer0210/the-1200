-- Add cycle tracking and session types
-- This migration adds support for 20-minute minimum requirement and cycle management

-- Add cycle_number to habits table
alter table public.habits
  add column cycle_number integer not null default 1;

-- Create session_type enum
create type session_type as enum ('qualified', 'partial');

-- Add session_type and cycle_number to habit_sessions
alter table public.habit_sessions
  add column session_type session_type default 'qualified' not null,
  add column cycle_number integer;

-- Backfill: set cycle_number for existing sessions based on their habit's cycle_number
-- First, set all existing sessions to cycle_number 1 (default)
update public.habit_sessions
set cycle_number = 1
where cycle_number is null;

-- Now make cycle_number not null
alter table public.habit_sessions
  alter column cycle_number set not null;

-- Backfill: set all existing completed sessions to 'qualified' type
update public.habit_sessions
set session_type = 'qualified'
where status = 'completed';

-- Create index for faster cycle-based queries
create index idx_habit_sessions_cycle on public.habit_sessions(habit_id, cycle_number, session_type);

-- Update habit_progress view to only count qualified sessions for current cycle
drop view if exists public.habit_progress;

create view public.habit_progress
with (security_invoker = true)
as
select 
  h.id as habit_id,
  h.owner_id,
  h.title,
  h.target_minutes,
  h.cycle_number,
  coalesce(sum(s.minutes), 0::bigint) as total_minutes
from public.habits h
left join public.habit_sessions s on s.habit_id = h.id 
  and s.status = 'completed'
  and s.session_type = 'qualified'  -- Only count qualified sessions
  and s.cycle_number = h.cycle_number  -- Only count sessions for current cycle
group by h.id, h.owner_id, h.title, h.target_minutes, h.cycle_number;

-- Grant access to authenticated users
grant select on public.habit_progress to authenticated;

-- Update calculate_streak function to only count qualified sessions
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
    -- Get total minutes for this day (only qualified sessions)
    select coalesce(sum(minutes), 0) into v_total_minutes
    from public.habit_sessions
    where habit_id = p_habit_id
      and owner_id = p_owner_id
      and status = 'completed'
      and session_type = 'qualified'  -- Only count qualified sessions
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
  
  -- Now check today (only qualified sessions)
  select coalesce(sum(minutes), 0) into v_total_minutes
  from public.habit_sessions
  where habit_id = p_habit_id
    and owner_id = p_owner_id
    and status = 'completed'
    and session_type = 'qualified'  -- Only count qualified sessions
    and started_at::date = current_date
    and minutes >= 0;
  
  -- If today has >= 20 minutes, add to streak
  if v_total_minutes >= 20 then
    v_streak := v_streak + 1;
  end if;
  
  return v_streak;
end;
$$;

-- Update update_habit_streak function to only count qualified sessions
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
  
  -- Check if qualified today (only qualified sessions)
  select coalesce(sum(minutes), 0) into v_total_minutes
  from public.habit_sessions
  where habit_id = p_habit_id
    and owner_id = p_owner_id
    and status = 'completed'
    and session_type = 'qualified'  -- Only count qualified sessions
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

-- Update on_session_completed trigger to only process qualified sessions
create or replace function public.on_session_completed()
returns trigger
language plpgsql
security definer
as $$
declare
  v_total_minutes bigint;
begin
  -- Only process completed sessions that are qualified
  if new.status = 'completed' and new.session_type = 'qualified' then
    -- Update streak
    perform public.update_habit_streak(new.habit_id, new.owner_id);
    
    -- Get total minutes for milestone achievements (only qualified sessions for current cycle)
    select coalesce(sum(s.minutes), 0) into v_total_minutes
    from public.habit_sessions s
    join public.habits h on h.id = s.habit_id
    where s.habit_id = new.habit_id
      and s.owner_id = new.owner_id
      and s.status = 'completed'
      and s.session_type = 'qualified'
      and s.cycle_number = h.cycle_number  -- Only count current cycle
      and s.minutes is not null;
    
    -- Check milestone achievements
    perform public.check_milestone_achievements(new.habit_id, new.owner_id, v_total_minutes);
  end if;
  
  return new;
end;
$$;

