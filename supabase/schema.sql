-- ─────────────────────────────────────────────────────────────────────────────
-- Mindy Plavinsky — public site schema
--
-- Run once in Supabase → SQL Editor → New query → Run.
-- Safe to run again after edits: every statement is idempotent.
--
-- Access model:
--   * Read  — anyone (the public site), but only where published = true.
--   * Write — only a signed-in user (the single admin account).
-- Row Level Security is what actually enforces this; the anon key is public.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Works ────────────────────────────────────────────────────────────────────
create table if not exists public.works (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  client        text not null default '',
  category      text not null,
  work_type     text not null check (work_type in ('single-ad', 'teaser', 'branding', 'brochure')),
  summary       text not null default '',
  story         text,
  year          text,
  published     boolean not null default true,
  display_order integer not null default 100,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists works_display_order_idx on public.works (display_order);

-- ── Assets (images and PDFs belonging to a work) ─────────────────────────────
create table if not exists public.works_assets (
  id            uuid primary key default gen_random_uuid(),
  work_id       uuid not null references public.works (id) on delete cascade,
  url           text not null,
  asset_type    text not null check (asset_type in ('image', 'pdf')),
  caption       text,
  width         integer,
  height        integer,
  display_order integer not null default 100
);

create index if not exists works_assets_work_idx on public.works_assets (work_id, display_order);

-- ── updated_at maintenance ───────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists works_touch_updated_at on public.works;
create trigger works_touch_updated_at
  before update on public.works
  for each row execute function public.touch_updated_at();

-- ── The works version ───────────────────────────────────────────────────────
-- One timestamp per run of this script, and it moves again on every change to
-- a work. The public site sends it with each read, so an answer from before a
-- save can never be mistaken for the answer after it — see the note in
-- `src/lib/works/remote.ts`. Because it is fixed when the script runs, running
-- it again (a rebuild) also tells every page the list is new.
create table if not exists public.works_version_state (
  id      boolean primary key default true,
  version text not null,
  constraint works_version_single_row check (id)
);

grant select on public.works_version_state to anon, authenticated;

alter table public.works_version_state enable row level security;
drop policy if exists "Anyone can read the works version" on public.works_version_state;
create policy "Anyone can read the works version"
  on public.works_version_state for select
  to anon, authenticated
  using (true);

-- Any change to a work moves the stamp, whichever way it was written.
create or replace function public.bump_works_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $bump$
begin
  update public.works_version_state
     set version = md5(random()::text || clock_timestamp()::text);
  return null;
end;
$bump$;

drop trigger if exists works_bump_version on public.works;
create trigger works_bump_version
  after insert or update or delete on public.works
  for each statement execute function public.bump_works_version();

drop trigger if exists works_assets_bump_version on public.works_assets;
create trigger works_assets_bump_version
  after insert or update or delete on public.works_assets
  for each statement execute function public.bump_works_version();

create or replace function public.works_version()
returns text
language sql
stable
as $version$
  select version from public.works_version_state where id;
$version$;

-- The site reads the stamp with the public (anon) key.
grant execute on function public.works_version() to anon, authenticated;

-- Always end on a fresh stamp: this line runs after every change above, and so
-- an existing database gets a new version the moment this script is applied.
insert into public.works_version_state (id, version)
values (true, md5(random()::text || clock_timestamp()::text))
on conflict (id) do update set version = excluded.version;

-- ── Row Level Security ───────────────────────────────────────────────────────
alter table public.works        enable row level security;
alter table public.works_assets enable row level security;

drop policy if exists "Public can read published works" on public.works;
create policy "Public can read published works"
  on public.works for select
  using (published = true);

drop policy if exists "Admin can read all works" on public.works;
create policy "Admin can read all works"
  on public.works for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert works" on public.works;
create policy "Admin can insert works"
  on public.works for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can update works" on public.works;
create policy "Admin can update works"
  on public.works for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Admin can delete works" on public.works;
create policy "Admin can delete works"
  on public.works for delete
  to authenticated
  using (true);

-- Assets are visible exactly when their work is visible.
drop policy if exists "Public can read assets of published works" on public.works_assets;
create policy "Public can read assets of published works"
  on public.works_assets for select
  using (exists (
    select 1 from public.works w
    where w.id = works_assets.work_id and w.published = true
  ));

drop policy if exists "Admin can read all assets" on public.works_assets;
create policy "Admin can read all assets"
  on public.works_assets for select
  to authenticated
  using (true);

drop policy if exists "Admin can insert assets" on public.works_assets;
create policy "Admin can insert assets"
  on public.works_assets for insert
  to authenticated
  with check (true);

drop policy if exists "Admin can delete assets" on public.works_assets;
create policy "Admin can delete assets"
  on public.works_assets for delete
  to authenticated
  using (true);

-- ── Storage: the public "works" bucket ───────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'works', 'works', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view work files" on storage.objects;
create policy "Public can view work files"
  on storage.objects for select
  using (bucket_id = 'works');

drop policy if exists "Admin can upload work files" on storage.objects;
create policy "Admin can upload work files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'works');

drop policy if exists "Admin can delete work files" on storage.objects;
create policy "Admin can delete work files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'works');

-- ── Later changes (safe to run on an existing project) ───────────────────────
-- The client name is optional: a work may be saved without one.
alter table public.works alter column client set default '';
alter table public.works alter column client drop not null;
