-- Create a function to handle new user profile creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, timezone, created_at)
  values (
    new.id,
    'America/New_York',
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger that fires after a new user is inserted into auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

