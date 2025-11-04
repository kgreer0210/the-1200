-- Create user_role enum type
create type public.user_role as enum ('customer', 'admin');

-- Add role column to profiles table with default 'customer'
alter table public.profiles
add column role public.user_role not null default 'customer';

-- Backfill existing profiles to 'customer' (safe default)
update public.profiles
set role = 'customer'
where role is null;

-- Automatically promote the first existing user to admin
-- This finds the user with the oldest created_at timestamp
do $$
declare
  first_user_id uuid;
begin
  -- Find the first user (oldest created_at)
  select id into first_user_id
  from public.profiles
  order by created_at asc
  limit 1;
  
  -- If we found a user, promote them to admin
  if first_user_id is not null then
    update public.profiles
    set role = 'admin'
    where id = first_user_id;
  end if;
end $$;

-- Update the trigger function to set role to 'customer' on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, timezone, created_at, role)
  values (
    new.id,
    'America/New_York',
    now(),
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer;

