-- Add timer fields to habit_sessions table
-- This migration adds support for active/paused timer sessions

-- Create enum type for session status
create type session_status as enum ('active', 'paused', 'completed');

-- Add new columns to habit_sessions
alter table public.habit_sessions
  add column status session_status default 'completed' not null,
  add column paused_at timestamptz,
  add column paused_duration_seconds integer default 0 not null;

-- Make minutes nullable (only required for completed sessions)
-- First, ensure all existing rows have minutes set
update public.habit_sessions
set minutes = 1
where minutes is null;

-- Drop the existing check constraint if it exists
alter table public.habit_sessions
  drop constraint if exists habit_sessions_minutes_check;

-- Now alter the column to be nullable
alter table public.habit_sessions
  alter column minutes drop not null;

-- Add check constraint: minutes must be positive when not null
alter table public.habit_sessions
  add constraint habit_sessions_minutes_check 
  check (minutes is null or minutes > 0);

-- Add constraint: only one active/paused session per habit per user
create unique index habit_sessions_one_active_per_habit_user 
on public.habit_sessions(habit_id, owner_id) 
where status in ('active', 'paused');

-- Update habit_progress view to exclude active/paused sessions
drop view if exists public.habit_progress;

create view public.habit_progress
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
  and s.status = 'completed'  -- Only count completed sessions
group by h.id;

-- Grant access to authenticated users
grant select on public.habit_progress to authenticated;

