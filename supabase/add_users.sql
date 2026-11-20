-- Upgrade for databases created before each user had their own private data.
-- Run this once in the Supabase SQL editor, after add_formats.sql if you needed that one.
-- New projects only need schema.sql.
--
-- Every existing deck, format, and match is assigned to the one account that already
-- exists. If there is more than one account under Authentication -> Users, the script
-- stops without changing anything; edit the marked line to pick the owner by email.

begin;

-- The account that owns everything logged so far.
create temp table upgrade_owner on commit drop as
  select id from auth.users;
  -- More than one account? Replace the line above with:
  --   select id from auth.users where email = 'you@example.com';

do $$
begin
  if (select count(*) from upgrade_owner) <> 1 then
    raise exception 'Expected exactly one owner account, found %. Edit the upgrade_owner line to pick one by email.',
      (select count(*) from upgrade_owner);
  end if;
end;
$$;

-- Add an owner to every top-level table and give existing rows to that account.
alter table my_decks add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table opponent_decks add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table formats add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;
alter table matches add column user_id uuid default auth.uid() references auth.users (id) on delete cascade;

update my_decks set user_id = (select id from upgrade_owner);
update opponent_decks set user_id = (select id from upgrade_owner);
update formats set user_id = (select id from upgrade_owner);
update matches set user_id = (select id from upgrade_owner);

alter table my_decks alter column user_id set not null;
alter table opponent_decks alter column user_id set not null;
alter table formats alter column user_id set not null;
alter table matches alter column user_id set not null;

-- Names are now unique per user instead of across the whole site.
drop index my_decks_name_key;
drop index opponent_decks_name_key;
drop index formats_name_key;
create unique index my_decks_name_key on my_decks (user_id, lower(name));
create unique index opponent_decks_name_key on opponent_decks (user_id, lower(name));
create unique index formats_name_key on formats (user_id, lower(name));
create index matches_user_id_idx on matches (user_id, created_at desc);

-- Replace "anyone can read, any signed-in user can insert" with
-- "each user reads only their own rows; writes go through submit_match only".
drop policy "Public read" on my_decks;
drop policy "Public read" on opponent_decks;
drop policy "Public read" on formats;
drop policy "Public read" on matches;
drop policy "Public read" on games;
drop policy "Signed-in insert" on my_decks;
drop policy "Signed-in insert" on opponent_decks;
drop policy "Signed-in insert" on formats;
drop policy "Signed-in insert" on matches;
drop policy "Signed-in insert" on games;

create policy "Owner read" on my_decks for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on opponent_decks for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on formats for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on matches for select to authenticated using (user_id = (select auth.uid()));
create policy "Owner read" on games for select to authenticated using (
  exists (select 1 from matches m where m.id = match_id and m.user_id = (select auth.uid()))
);

-- Same arguments as before, but now saves to the signed-in user's own decks and formats.
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

commit;
