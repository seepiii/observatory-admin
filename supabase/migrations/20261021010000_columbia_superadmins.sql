-- Our team's choice: every Columbia account (@columbia.edu) is a superadmin.
-- The admin area still checks only profiles.is_superadmin; this just decides who gets it.

-- The domain comes from auth.users (the Google-verified sign-in email), never from
-- profiles.email, which users can edit.
create or replace function public.grant_columbia_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from auth.users u
    where u.id = new.id and lower(u.email) like '%@columbia.edu'
  ) then
    new.is_superadmin := true;
  end if;
  return new;
end;
$$;

-- BEFORE triggers fire in name order: this "zz_" one runs after guard_superadmin_flag,
-- so the guard still blocks anyone setting the flag themselves through the API.
drop trigger if exists zz_grant_columbia_superadmin on public.profiles;
create trigger zz_grant_columbia_superadmin
  before insert on public.profiles
  for each row execute function public.grant_columbia_superadmin();

-- Columbia accounts that already exist.
update public.profiles p
set is_superadmin = true
from auth.users u
where u.id = p.id and lower(u.email) like '%@columbia.edu' and not p.is_superadmin;
