-- Admin area access. Additive only: the main app (every week's frozen deployment)
-- shares this database, so nothing existing is dropped or narrowed.

-- 1. The flag. Everyone starts as a regular user.
alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- 2. "Is the signed-in user a superadmin?" Security definer so policies on profiles
--    can call it without recursing into profiles' own RLS.
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;
revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to anon, authenticated;

-- 3. Nobody can promote themselves through the API (users may update their own profile row).
--    Only a database owner (SQL Editor / service role) can change the flag.
create or replace function public.guard_superadmin_flag()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- API requests carry a JWT role; the SQL Editor and service jobs don't.
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '')
       in ('anon', 'authenticated')
     and new.is_superadmin is distinct from
         (case when tg_op = 'UPDATE' then old.is_superadmin else false end) then
    raise exception 'is_superadmin can only be changed by a database owner';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_superadmin_flag on public.profiles;
create trigger guard_superadmin_flag
  before insert or update on public.profiles
  for each row execute function public.guard_superadmin_flag();

-- 4. What superadmins can do (regular users' policies are unchanged).
drop policy if exists "Superadmins read all profiles" on public.profiles;
create policy "Superadmins read all profiles"
  on public.profiles for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins read all votes" on public.votes;
create policy "Superadmins read all votes"
  on public.votes for select to authenticated
  using (public.is_superadmin());

drop policy if exists "Superadmins update reports" on public.reports;
create policy "Superadmins update reports"
  on public.reports for update to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

drop policy if exists "Superadmins delete reports" on public.reports;
create policy "Superadmins delete reports"
  on public.reports for delete to authenticated
  using (public.is_superadmin());

-- Only the policies above let these through, so regular users still can't edit or delete.
grant update, delete on public.reports to authenticated;

drop policy if exists "Superadmins delete report images" on storage.objects;
create policy "Superadmins delete report images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and public.is_superadmin());

-- 5. Avoiding the lockout: run this once in the Supabase SQL Editor (it runs as the
--    database owner, so the guard above lets it through). Change the email to yours.
-- update public.profiles set is_superadmin = true where email = 'you@example.com';
