-- ─────────────────────────────────────────────────────────────────────────────
-- Mindy Plavinsky — fix: the works version trigger on UPDATE
--
-- Run once in Supabase → SQL Editor → New query → Run. Safe to run again.
--
-- What was wrong: `bump_works_version()` ran on every insert, update and
-- delete of a work. On an INSERT that update had nothing to match, and an
-- UPDATE with no WHERE clause is refused by the database
-- ("21000: UPDATE requires a WHERE clause"). The new row therefore failed,
-- and with it every save in the admin area.
--
-- The fix: the stamp still moves on every change, but the update is pinned to
-- the single row of `works_version_state` — so it always has a WHERE clause,
-- and it still bumps once however many rows changed.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.bump_works_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $bump$
begin
  -- `where id` is the single-row key of the table: it makes the update a
  -- statement the database accepts inside a trigger.
  update public.works_version_state
     set version = md5(random()::text || clock_timestamp()::text)
   where id;
  return null;
end;
$bump$;

-- The triggers themselves are unchanged; recreating them makes the new
-- function body take effect immediately.
drop trigger if exists works_bump_version on public.works;
create trigger works_bump_version
  after insert or update or delete on public.works
  for each statement execute function public.bump_works_version();

drop trigger if exists works_assets_bump_version on public.works_assets;
create trigger works_assets_bump_version
  after insert or update or delete on public.works_assets
  for each statement execute function public.bump_works_version();

-- A fresh stamp, so every page picks the fixed state up at once.
insert into public.works_version_state (id, version)
values (true, md5(random()::text || clock_timestamp()::text))
on conflict (id) do update set version = excluded.version;
