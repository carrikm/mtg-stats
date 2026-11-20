-- MTG Results Tracker schema.
-- Run this once in the SQL editor of the MTG project's own Supabase database.
-- Already set up from an older version? Run the upgrade scripts in the README instead.
--
-- Every user has their own private data: their own decks, opponent decks, formats,
-- and matches. Row-level security makes sure each user can only ever read their own
-- rows, and all writes go through submit_match, which always saves to the caller.

-- Decks a user plays. Names are unique per user ignoring case, so "BR Reanimator"
-- and "br reanimator" are the same deck.
create table my_decks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0)
);
create unique index my_decks_name_key on my_decks (user_id, lower(name));

-- Decks a user plays against. Kept as a separate list from their own decks.
create table opponent_decks (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0)
);
create unique index opponent_decks_name_key on opponent_decks (user_id, lower(name));

-- Formats a match can be played in (Legacy, Modern, Pauper, ...).
create table formats (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0)
);
create unique index formats_name_key on formats (user_id, lower(name));

create table matches (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  my_deck_id bigint not null references my_decks (id),
  opponent_deck_id bigint not null references opponent_decks (id),
  -- Nullable only so matches logged before formats existed stay valid;
  -- submit_match always sets it.
  format_id bigint references formats (id),
  result text not null check (result in ('win', 'loss', 'draw'))
);
create index matches_user_id_idx on matches (user_id, created_at desc);

-- One row per game actually played. An unplayed Game 3 has no row.
-- A game belongs to whoever owns its match.
create table games (
  id bigint generated always as identity primary key,
  match_id bigint not null references matches (id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 3),
  on_play boolean not null,
  my_hand_size smallint not null check (my_hand_size between 0 and 7),
  opp_hand_size smallint not null check (opp_hand_size between 0 and 7),
  result text not null check (result in ('win', 'loss', 'draw')),
  comments text,
  unique (match_id, game_number)
);

-- Each signed-in user can read only their own rows. Signed-out visitors can read nothing.
-- There are no insert policies: the only way to add data is submit_match below.
alter table my_decks enable row level security;
alter table opponent_decks enable row level security;
alter table formats enable row level security;
alter table matches enable row level security;
alter table games enable row level security;

create policy "Owner read" on my_decks for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on opponent_decks for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on formats for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on matches for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on games for select to authenticated using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = (select auth.uid()))
);

-- Saves a whole match for the signed-in user in one transaction: finds or creates
-- their format and both decks, works out the match result from the games, and
-- inserts everything.
-- p_games is a JSON array of 2 or 3 objects:
--   { "game_number": 1, "on_play": true, "my_hand_size": 7,
--     "opp_hand_size": 6, "result": "win", "comments": "..." }
--
-- Runs as security definer (row-level security doesn't apply inside it), so every
-- lookup and insert below is pinned to auth.uid() by hand.
create or replace function submit_match(p_format text, p_my_deck text, p_opp_deck text, p_games jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_my_deck_id bigint;
  v_opp_deck_id bigint;
  v_format_id bigint;
  v_match_id bigint;
  v_wins int;
  v_losses int;
begin
  if v_user_id is null then
    raise exception 'You need to be signed in to save a match.';
  end if;
  p_format := trim(p_format);
  if p_format is null or p_format = '' then
    raise exception 'A format is required.';
  end if;
  p_my_deck := trim(p_my_deck);
  p_opp_deck := trim(p_opp_deck);
  if p_my_deck = '' or p_opp_deck = '' then
    raise exception 'Both decks are required.';
  end if;
  if jsonb_array_length(p_games) not between 2 and 3 then
    raise exception 'A match needs 2 or 3 games.';
  end if;

  select id into v_format_id from formats where user_id = v_user_id and lower(name) = lower(p_format);
  if v_format_id is null then
    insert into formats (user_id, name) values (v_user_id, p_format) returning id into v_format_id;
  end if;

  select id into v_my_deck_id from my_decks where user_id = v_user_id and lower(name) = lower(p_my_deck);
  if v_my_deck_id is null then
    insert into my_decks (user_id, name) values (v_user_id, p_my_deck) returning id into v_my_deck_id;
  end if;

  select id into v_opp_deck_id from opponent_decks where user_id = v_user_id and lower(name) = lower(p_opp_deck);
  if v_opp_deck_id is null then
    insert into opponent_decks (user_id, name) values (v_user_id, p_opp_deck) returning id into v_opp_deck_id;
  end if;

  select count(*) filter (where g ->> 'result' = 'win'),
         count(*) filter (where g ->> 'result' = 'loss')
    into v_wins, v_losses
    from jsonb_array_elements(p_games) as g;

  insert into matches (user_id, format_id, my_deck_id, opponent_deck_id, result)
  values (
    v_user_id,
    v_format_id,
    v_my_deck_id,
    v_opp_deck_id,
    case when v_wins > v_losses then 'win' when v_losses > v_wins then 'loss' else 'draw' end
  )
  returning id into v_match_id;

  insert into games (match_id, game_number, on_play, my_hand_size, opp_hand_size, result, comments)
  select v_match_id,
         (g ->> 'game_number')::smallint,
         (g ->> 'on_play')::boolean,
         (g ->> 'my_hand_size')::smallint,
         (g ->> 'opp_hand_size')::smallint,
         g ->> 'result',
         nullif(trim(g ->> 'comments'), '')
    from jsonb_array_elements(p_games) as g;

  return v_match_id;
end;
$$;

revoke execute on function submit_match(text, text, text, jsonb) from public, anon;
grant execute on function submit_match(text, text, text, jsonb) to authenticated;
