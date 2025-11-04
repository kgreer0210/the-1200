-- Add email, first_name, and last_name columns to profiles table
alter table public.profiles
add column email text,
add column first_name text,
add column last_name text;

-- Backfill email from auth.users for existing profiles
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id
and p.email is null;

-- Update the trigger function to include email from auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, timezone, created_at, role)
  values (
    new.id,
    new.email,
    'America/New_York',
    now(),
    'customer'
  );
  return new;
end;
$$ language plpgsql security definer;

