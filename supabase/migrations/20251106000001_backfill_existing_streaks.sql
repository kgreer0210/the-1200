-- Backfill streaks and achievements for existing habits
-- This migration calculates streaks for all existing habits and awards achievements

do $$
declare
  v_habit record;
  v_total_minutes bigint;
begin
  -- Loop through all habits
  for v_habit in
    select distinct h.id as habit_id, h.owner_id
    from public.habits h
  loop
    -- Calculate and update streak
    perform public.update_habit_streak(v_habit.habit_id, v_habit.owner_id);
    
    -- Get total minutes for milestone achievements
    select coalesce(sum(minutes), 0) into v_total_minutes
    from public.habit_sessions
    where habit_id = v_habit.habit_id
      and owner_id = v_habit.owner_id
      and status = 'completed'
      and minutes is not null;
    
    -- Check milestone achievements
    if v_total_minutes > 0 then
      perform public.check_milestone_achievements(v_habit.habit_id, v_habit.owner_id, v_total_minutes);
    end if;
  end loop;
end $$;

