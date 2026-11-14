-- SOP & Proof Hub — Supabase cloud foundation
-- Apply in Supabase SQL Editor after creating the project.
-- Private by default. Do not disable RLS on these tables or the evidence bucket.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'member' check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  category text not null,
  order_id text not null,
  store text not null,
  incident_at timestamptz not null,
  notes text not null default '',
  submitted_at timestamptz not null default now(),
  evidence jsonb not null default '[]'::jsonb,
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists incidents_owner_legacy_id_uidx
  on public.incidents(user_id, legacy_id) where legacy_id is not null;
create index if not exists incidents_user_submitted_idx
  on public.incidents(user_id, submitted_at desc);
create index if not exists incidents_submitted_idx
  on public.incidents(submitted_at desc);

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  incident_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  occurred_at timestamptz not null default now()
);
create index if not exists audit_events_occurred_idx
  on public.audit_events(occurred_at desc);

-- SECURITY DEFINER avoids recursive profile RLS checks.
create or replace function public.is_workspace_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function public.is_workspace_admin() from public;
grant execute on function public.is_workspace_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    'member'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists incidents_set_updated_at on public.incidents;
create trigger incidents_set_updated_at before update on public.incidents
for each row execute procedure public.set_updated_at();

create or replace function public.write_incident_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events(actor_id, incident_id, action)
  values (
    (select auth.uid()),
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists incidents_audit on public.incidents;
create trigger incidents_audit
  after insert or update or delete on public.incidents
  for each row execute procedure public.write_incident_audit_event();

alter table public.profiles enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "profile read own or admin" on public.profiles;
create policy "profile read own or admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_workspace_admin()));

-- Members may update only their display name. Role changes are intentionally
-- reserved for the project owner through the Supabase dashboard/SQL editor.
revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
drop policy if exists "profile update own display name" on public.profiles;
create policy "profile update own display name"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "incident read owner or admin" on public.incidents;
create policy "incident read owner or admin"
  on public.incidents for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_workspace_admin()));

drop policy if exists "member insert own incident" on public.incidents;
create policy "member insert own incident"
  on public.incidents for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "member update own incident" on public.incidents;
create policy "member update own incident"
  on public.incidents for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "member delete own incident" on public.incidents;
create policy "member delete own incident"
  on public.incidents for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "admin read audit events" on public.audit_events;
create policy "admin read audit events"
  on public.audit_events for select to authenticated
  using ((select public.is_workspace_admin()));

-- Private evidence bucket. File path format: <auth-user-id>/<incident-id>/<file-name>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-evidence',
  'incident-evidence',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "evidence read owner or admin" on storage.objects;
create policy "evidence read owner or admin"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'incident-evidence'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_workspace_admin())
    )
  );

drop policy if exists "member upload own evidence" on storage.objects;
create policy "member upload own evidence"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'incident-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "member update own evidence" on storage.objects;
create policy "member update own evidence"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'incident-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'incident-evidence'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "owner or admin delete evidence" on storage.objects;
create policy "owner or admin delete evidence"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'incident-evidence'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_workspace_admin())
    )
  );

-- After your own account has signed up once, promote it using the SQL editor:
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'YOUR_LOGIN_EMAIL');
--
-- Do not allow public sign-ups after onboarding is complete. Invite colleagues
-- from Authentication -> Users -> Invite user in the Supabase dashboard.
