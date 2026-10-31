-- Hoot database setup. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to run more than once.

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null,
  family_id uuid references public.families on delete set null,
  created_at timestamptz not null default now()
);

-- One row per learner per card. `data` is the client's CardProgress JSON.
create table if not exists public.progress (
  user_id uuid not null references auth.users on delete cascade,
  deck_id text not null,
  card_id text not null,
  data jsonb not null,
  last_seen timestamptz not null,
  primary key (user_id, deck_id, card_id)
);

-- Cards reviewed per learner per day.
create table if not exists public.activity (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  cards int not null default 0,
  primary key (user_id, day)
);

-- Decks imported by anyone in the family (e.g. from Gemini); visible to the whole family.
create table if not exists public.family_decks (
  family_id uuid not null references public.families on delete cascade,
  deck_id text not null,
  deck jsonb not null,
  created_by uuid references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  primary key (family_id, deck_id)
);

-- "Try this phrase": one family member sends a card to another.
create table if not exists public.nudges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  from_user uuid not null references auth.users on delete cascade,
  to_user uuid not null references auth.users on delete cascade,
  deck_id text not null,
  card_id text not null,
  message text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
create index if not exists nudges_to_user on public.nudges (to_user, seen_at);

-- ── Helpers ──────────────────────────────────────────────────────────────────

-- The caller's family. SECURITY DEFINER so policies can use it without recursion.
create or replace function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.profiles where id = auth.uid()
$$;

-- Create a family and join it. Returns the new family row.
create or replace function public.create_family(family_name text) returns public.families
language plpgsql security definer set search_path = public as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.families (name, invite_code, created_by)
  values (
    coalesce(nullif(trim(family_name), ''), 'Our family'),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    auth.uid()
  )
  returning * into f;
  update public.profiles set family_id = f.id where id = auth.uid();
  return f;
end $$;

-- Join a family with its invite code. Returns the family row.
create or replace function public.join_family(code text) returns public.families
language plpgsql security definer set search_path = public as $$
declare f public.families;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into f from public.families where invite_code = upper(trim(code));
  if f.id is null then raise exception 'No family has that code'; end if;
  update public.profiles set family_id = f.id where id = auth.uid();
  return f;
end $$;

-- What everyone in my family has been up to. No scores, just facts.
create or replace function public.family_summary()
returns table (
  user_id uuid, display_name text, week_cards int, today_cards int,
  known_cards int, learning_cards int, last_practised timestamptz
)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name,
    coalesce((select sum(a.cards) from public.activity a
              where a.user_id = p.id and a.day > current_date - 7), 0)::int,
    coalesce((select a.cards from public.activity a
              where a.user_id = p.id and a.day = current_date), 0)::int,
    (select count(*) from public.progress g
      where g.user_id = p.id and (g.data->>'intervalDays')::numeric >= 7)::int,
    (select count(*) from public.progress g
      where g.user_id = p.id and (g.data->>'intervalDays')::numeric < 7)::int,
    (select max(g.last_seen) from public.progress g where g.user_id = p.id)
  from public.profiles p
  where p.family_id is not null and p.family_id = public.my_family()
  order by p.display_name
$$;

-- Create a profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row level security ───────────────────────────────────────────────────────

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.activity enable row level security;
alter table public.family_decks enable row level security;
alter table public.nudges enable row level security;

drop policy if exists "see my family" on public.families;
create policy "see my family" on public.families for select using (id = public.my_family());

drop policy if exists "see family profiles" on public.profiles;
create policy "see family profiles" on public.profiles for select
  using (id = auth.uid() or (family_id is not null and family_id = public.my_family()));
drop policy if exists "edit my profile" on public.profiles;
create policy "edit my profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own progress" on public.progress;
create policy "own progress" on public.progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own activity" on public.activity;
create policy "own activity" on public.activity for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "family decks read" on public.family_decks;
create policy "family decks read" on public.family_decks for select using (family_id = public.my_family());
drop policy if exists "family decks write" on public.family_decks;
create policy "family decks write" on public.family_decks for insert with check (family_id = public.my_family());
drop policy if exists "family decks update" on public.family_decks;
create policy "family decks update" on public.family_decks for update
  using (family_id = public.my_family()) with check (family_id = public.my_family());
drop policy if exists "family decks delete" on public.family_decks;
create policy "family decks delete" on public.family_decks for delete using (family_id = public.my_family());

drop policy if exists "nudges read" on public.nudges;
create policy "nudges read" on public.nudges for select using (to_user = auth.uid() or from_user = auth.uid());
drop policy if exists "nudges send" on public.nudges;
create policy "nudges send" on public.nudges for insert
  with check (from_user = auth.uid() and family_id = public.my_family()
              and to_user in (select id from public.profiles where family_id = public.my_family()));
drop policy if exists "nudges mark seen" on public.nudges;
create policy "nudges mark seen" on public.nudges for update
  using (to_user = auth.uid()) with check (to_user = auth.uid());

-- ── Grants ───────────────────────────────────────────────────────────────────

revoke execute on function public.create_family(text), public.join_family(text), public.family_summary() from anon, public;
grant execute on function public.create_family(text), public.join_family(text), public.family_summary(), public.my_family() to authenticated;
