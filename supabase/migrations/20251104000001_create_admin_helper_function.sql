-- Create is_admin() helper function for RLS policies
-- This function checks if the current authenticated user is an admin
-- Uses security definer to bypass RLS when checking roles
create or replace function public.is_admin()
returns boolean as $$
declare
  user_role public.user_role;
begin
  -- Get the current user's role from profiles
  select role into user_role
  from public.profiles
  where id = auth.uid();
  
  -- Return true if role is admin, false otherwise
  return user_role = 'admin';
end;
$$ language plpgsql stable security definer set search_path = '';

-- Grant execute permission to authenticated users
grant execute on function public.is_admin() to authenticated, anon;

-- Revoke from public (security best practice)
revoke execute on function public.is_admin() from public;

