-- Week 7: the AI pipeline as data the admin area can read and edit.
-- Everything here is additive: older deployments never touch these tables.

-- ---------- LLM providers and models ----------
create table if not exists public.llm_providers (
  id bigint generated always as identity primary key,
  name text not null unique,
  website text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.llm_models (
  id bigint generated always as identity primary key,
  provider_id bigint not null references public.llm_providers(id) on delete restrict,
  name text not null,
  model_key text not null unique,      -- what the API is called with, e.g. gemini-3.5-flash
  purpose text not null default 'text',  -- text | vision | image
  fallback_order int not null default 1, -- 1 is tried first
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Prompt chains, their steps, and the mix ----------
create table if not exists public.prompt_chains (
  id bigint generated always as identity primary key,
  slug text not null unique,             -- matches reports.kind
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_chain_steps (
  id bigint generated always as identity primary key,
  chain_id bigint not null references public.prompt_chains(id) on delete cascade,
  step_order int not null,
  name text not null,
  model_id bigint references public.llm_models(id) on delete set null,
  instructions text not null,
  unique (chain_id, step_order)
);

-- How often each chain is offered (e.g. by the Daily Anomaly picker). Weights are relative.
create table if not exists public.prompt_chain_mix (
  chain_id bigint primary key references public.prompt_chains(id) on delete cascade,
  weight int not null default 1 check (weight >= 0),
  updated_at timestamptz not null default now()
);

-- ---------- Terms (the alien's glossary of human words) ----------
create table if not exists public.terms (
  id bigint generated always as identity primary key,
  term text not null unique,
  definition text not null,
  example text,
  created_at timestamptz not null default now()
);

-- ---------- Few-shot examples for the AI ----------
create table if not exists public.ai_generation_examples (
  id bigint generated always as identity primary key,
  chain_id bigint references public.prompt_chains(id) on delete cascade,
  input text not null,
  output text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Generation requests and LLM responses (logged automatically) ----------
create table if not exists public.generation_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  report_id uuid unique references public.reports(id) on delete set null,
  kind text not null,
  subject text,
  has_photo boolean not null default false,
  status text not null default 'succeeded',
  created_at timestamptz not null default now()
);

create table if not exists public.llm_responses (
  id bigint generated always as identity primary key,
  request_id bigint not null references public.generation_requests(id) on delete cascade,
  model text not null,
  prompt text,
  response text not null,
  created_at timestamptz not null default now()
);

-- ---------- Who may become an admin ----------
create table if not exists public.allowed_signup_domains (
  id bigint generated always as identity primary key,
  domain text not null unique check (domain ~ '^[a-z0-9.-]+\.[a-z]+$'),
  created_at timestamptz not null default now()
);

create table if not exists public.whitelisted_email_addresses (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+$'),
  note text,
  created_at timestamptz not null default now()
);

-- ---------- RLS: superadmins only ----------
do $$
declare t text;
begin
  foreach t in array array['llm_providers','llm_models','prompt_chains','prompt_chain_steps','prompt_chain_mix',
    'terms','ai_generation_examples','generation_requests','llm_responses','allowed_signup_domains',
    'whitelisted_email_addresses']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "superadmins manage" on public.%I', t);
    execute format('create policy "superadmins manage" on public.%I for all to authenticated
      using (public.is_superadmin()) with check (public.is_superadmin())', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- ---------- Log every report as a request + response ----------
-- A trigger (not app code) so every deployment, old or new, gets logged.
create or replace function public.log_generation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare req_id bigint;
begin
  insert into public.generation_requests (user_id, report_id, kind, subject, has_photo, created_at)
  values (new.user_id, new.id, new.kind, new.subject, new.source_image_url is not null, new.created_at)
  returning id into req_id;
  insert into public.llm_responses (request_id, model, prompt, response, created_at)
  values (req_id, new.model, new.prompt, new.body, new.created_at);
  return new;
end;
$$;

drop trigger if exists log_generation on public.reports;
create trigger log_generation after insert on public.reports
  for each row execute function public.log_generation();

-- Backfill the reports that already exist.
with reqs as (
  insert into public.generation_requests (user_id, report_id, kind, subject, has_photo, created_at)
  select user_id, id, kind, subject, source_image_url is not null, created_at
  from public.reports r
  where not exists (select 1 from public.generation_requests g where g.report_id = r.id)
  returning id, report_id
)
insert into public.llm_responses (request_id, model, prompt, response, created_at)
select reqs.id, r.model, r.prompt, r.body, r.created_at
from reqs join public.reports r on r.id = reqs.report_id;

-- ---------- Admin access now reads the two tables instead of a hard-coded domain ----------
create or replace function public.grant_columbia_superadmin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare signin_email text;
begin
  select lower(u.email) into signin_email from auth.users u where u.id = new.id;
  if signin_email is not null and (
    exists (select 1 from public.allowed_signup_domains d where signin_email like '%@' || d.domain)
    or exists (select 1 from public.whitelisted_email_addresses w where lower(w.email) = signin_email)
  ) then
    new.is_superadmin := true;
  end if;
  return new;
end;
$$;

-- ---------- Admins can upload and replace images in the reports bucket ----------
drop policy if exists "superadmins upload report images" on storage.objects;
create policy "superadmins upload report images" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and public.is_superadmin());
drop policy if exists "superadmins update report images" on storage.objects;
create policy "superadmins update report images" on storage.objects for update to authenticated
  using (bucket_id = 'reports' and public.is_superadmin());
drop policy if exists "superadmins read report images" on storage.objects;
create policy "superadmins read report images" on storage.objects for select to authenticated
  using (bucket_id = 'reports' and public.is_superadmin());

-- ---------- Seed with what the app really uses ----------
insert into public.llm_providers (name, website, notes) values
  ('Google Gemini', 'https://ai.google.dev', 'Writes every report; free tier.'),
  ('Pollinations', 'https://pollinations.ai', 'Paints postcard images ("the alien''s rendition").')
on conflict (name) do nothing;

insert into public.llm_models (provider_id, name, model_key, purpose, fallback_order)
select p.id, m.name, m.key, m.purpose, m.ord
from (values
  ('Google Gemini', 'Gemini 3.8 Flash', 'gemini-3.8-flash', 'text', 1),
  ('Google Gemini', 'Gemini 3.5 Flash', 'gemini-3.5-flash', 'text', 2),
  ('Google Gemini', 'Gemini 3.5 Flash-Lite', 'gemini-3.5-flash-lite', 'text', 3),
  ('Pollinations', 'Pollinations image', 'pollinations', 'image', 1)
) as m(provider, name, key, purpose, ord)
join public.llm_providers p on p.name = m.provider
on conflict (model_key) do nothing;

insert into public.prompt_chains (slug, name, description) values
  ('field_note', 'Field Note', 'The alien logs an observation about a human phenomenon.'),
  ('exoplanet', 'Exoplanet', 'A NYC place written up as a newly discovered planet.'),
  ('transmission', 'Transmission', 'A crackly radio report about an uploaded photo.'),
  ('postcard', 'Postcard', 'Gemini writes a caption and image prompt; Pollinations paints it.')
on conflict (slug) do nothing;

insert into public.prompt_chain_steps (chain_id, step_order, name, model_id, instructions)
select c.id, s.ord, s.name, (select id from public.llm_models where model_key = s.model), s.instr
from (values
  ('field_note', 1, 'Write the field note', 'gemini-3.8-flash', 'Start with "FIELD NOTE #" + 3-digit number. End with a line starting "Hypothesis:". 60–110 words, deadpan, never mean.'),
  ('exoplanet', 1, 'Write the discovery entry', 'gemini-3.8-flash', 'Labelled lines: Designation, Atmosphere, Gravity, Native life, Habitable?.'),
  ('transmission', 1, 'Look at the photo', 'gemini-3.8-flash', 'Describe only what is actually visible. If no subject was given, reply with a "TITLE:" line first.'),
  ('transmission', 2, 'Write the transmission', 'gemini-3.8-flash', 'Start "[TRANSMISSION INTERCEPTED]", end "[SIGNAL LOST]".'),
  ('postcard', 1, 'Write caption and image prompt', 'gemini-3.8-flash', 'A postcard caption from the chosen planet plus a short scene description for the painter.'),
  ('postcard', 2, 'Paint the scene', 'pollinations', 'Turn the scene description into an image ("the alien''s rendition").')
) as s(chain, ord, name, model, instr)
join public.prompt_chains c on c.slug = s.chain
on conflict (chain_id, step_order) do nothing;

insert into public.prompt_chain_mix (chain_id, weight)
select id, case slug when 'field_note' then 4 when 'exoplanet' then 3 when 'postcard' then 2 else 1 end
from public.prompt_chains
on conflict (chain_id) do nothing;

insert into public.terms (term, definition, example) values
  ('Bodega', 'A small human fuel depot guarded by a cat.', 'The specimen purchased one (1) egg sandwich at 2am.'),
  ('Butler', 'A library where humans sleep upright before exams.', 'Occupancy peaks during "finals".'),
  ('Low Steps', 'Ceremonial stone tiers where humans sit to be seen.', null)
on conflict (term) do nothing;

insert into public.ai_generation_examples (chain_id, input, output)
select c.id, 'Subject: people walking slowly on Broadway',
  'FIELD NOTE #041: Two humans proceed at 0.4 m/s, side by side, blocking all traffic behind them. They appear unaware of the others. Hypothesis: this is a courtship ritual.'
from public.prompt_chains c where c.slug = 'field_note'
and not exists (select 1 from public.ai_generation_examples);

insert into public.allowed_signup_domains (domain) values ('columbia.edu') on conflict do nothing;
insert into public.whitelisted_email_addresses (email, note)
values ('sampadaaprakash@gmail.com', 'Project owner') on conflict do nothing;
