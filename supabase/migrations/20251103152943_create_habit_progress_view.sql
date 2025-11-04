-- Create habit_progress view
-- This view aggregates total minutes per habit from habit_sessions
-- Using security_invoker = true so the view respects RLS policies on underlying tables
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
group by h.id;

-- Grant access to authenticated users
grant select on public.habit_progress to authenticated;

-- Note: RLS is enforced through the underlying habits table's RLS policies
-- Users will only see their own habits (and thus their own progress) 
-- because of the "habits self" policy on the habits table

