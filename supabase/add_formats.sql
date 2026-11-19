-- Upgrade for databases created before formats existed.
-- Run this once in the Supabase SQL editor. New projects only need schema.sql.

create table formats (
  id bigint generated always as identity primary key,
  name text not null check (length(trim(name)) > 0)
);
create unique index formats_name_key on formats (lower(name));

-- Existing matches keep a blank format.
alter table matches add column format_id bigint references formats (id);

alter table formats enable row level security;
create policy "Public read" on formats for select using (true);
create policy "Signed-in insert" on formats for insert to authenticated with check (true);

-- The old 3-argument version is replaced by one that also takes the format.
drop function submit_match(text, text, jsonb);

-- Saves a whole match in one transaction: finds or creates the format and both decks,
-- works out the match result from the games, and inserts everything.
-- p_games is a JSON array of 2 or 3 objects:
--   { "game_number": 1, "on_play": true, "my_hand_size": 7,
--     "opp_hand_size": 6, "result": "win", "comments": "..." }
create or replace function submit_match(p_format text, p_my_deck text, p_opp_deck text, p_games jsonb)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_my_deck_id bigint;
  v_opp_deck_id bigint;
  v_format_id bigint;
  v_match_id bigint;
  v_wins int;
  v_losses int;
begin
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

  select id into v_format_id from formats where lower(name) = lower(p_format);
  if v_format_id is null then
    insert into formats (name) values (p_format) returning id into v_format_id;
  end if;

  select id into v_my_deck_id from my_decks where lower(name) = lower(p_my_deck);
  if v_my_deck_id is null then
    insert into my_decks (name) values (p_my_deck) returning id into v_my_deck_id;
  end if;

  select id into v_opp_deck_id from opponent_decks where lower(name) = lower(p_opp_deck);
  if v_opp_deck_id is null then
    insert into opponent_decks (name) values (p_opp_deck) returning id into v_opp_deck_id;
  end if;

  select count(*) filter (where g ->> 'result' = 'win'),
         count(*) filter (where g ->> 'result' = 'loss')
    into v_wins, v_losses
    from jsonb_array_elements(p_games) as g;

  insert into matches (format_id, my_deck_id, opponent_deck_id, result)
  values (
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
