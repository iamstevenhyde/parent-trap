-- The Parent Trap: Supabase schema (project ziszzyvlevgsjiazgogr, same project as Better Off, the ranch game and Chasing Powder).
-- Paste this whole file into the Supabase SQL editor and press Run. Safe to run twice.
-- Every table is prefixed pt_ so nothing collides with weed_*, powder_* or the ranch game's tables.
-- Every NOT NULL column has a default, so the pages can write one column at a time (a CFO and a CEO editing the
-- same team's plan at the same moment never overwrite each other).
-- RLS is on, with open anon policies, like the other classroom games: a join code is the only gate.
-- Revised 2026-10-09 for the live market: no new table or column was needed. New values only: pt_games.phase can be 'market',
-- pt_games.settings holds {autoResolve, liveAuction, requireWhy, autoAdvance}, pt_decisions.market also holds {live, closed},
-- and pt_snapshots.kind can be 'market'. NOT yet run against Supabase (local file only).

create table if not exists pt_games (
  id          text primary key,                       -- PT-7K2M, also the ?g= value in every page URL
  seed        int  not null default 0,                -- the engine is deterministic: seed + plans rebuild the whole game
  team_count  int  not null default 8,
  bot_count   int  not null default 3,
  phase       text not null default 'lobby',          -- lobby | news | market | decide | resolving | results | final
  round       int  not null default 0,                -- 0 in the lobby, then 1..5
  clock       jsonb,                                  -- {endsAt, paused, remaining, total}; the clock lives here, so a reload never resets it
  reveal      jsonb,                                  -- {round, idx, ...} the projector reveal queue
  rev         int  not null default 0,                -- bumped whenever the admin publishes snapshots; pages refetch on change
  status      text not null default 'active',
  admin_key   text not null default '',               -- the ?k= value for the admin and projector shortcuts
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists pt_teams (
  game_id    text not null references pt_games(id) on delete cascade,
  team_id    text not null,                           -- T1..T10
  name       text not null default '',
  join_code  text not null default '',                -- 4 characters, no 0/O/1/I
  renamed    boolean not null default false,          -- team name can be changed once, in the lobby
  created_at timestamptz not null default now(),
  primary key (game_id, team_id)
);
create index if not exists pt_teams_code on pt_teams (join_code);

create table if not exists pt_seats (
  id            text primary key,
  game_id       text not null references pt_games(id) on delete cascade,
  team_id       text not null default '',
  name          text not null default '',
  slot          int  not null default 0,              -- join order; roles rotate by slot and round
  role          text not null default '',             -- role label when the seat registered (screens recompute it each round)
  role_override text,                                 -- set by the admin's Reassign role
  secret        text not null default '',             -- stale-cookie check; a takeover writes a new one
  removed       boolean not null default false,
  connected_at  timestamptz not null default now(),
  last_seen     timestamptz not null default now()
);
create index if not exists pt_seats_game on pt_seats (game_id);

create table if not exists pt_decisions (
  game_id      text not null references pt_games(id) on delete cascade,
  team_id      text not null,
  round        int  not null,
  capital      jsonb not null default '{}'::jsonb,                       -- CFO:  {unitId: 0 | 1 | null}
  actions      jsonb not null default '[]'::jsonb,                       -- Operations (and Deals for divest and listed deep dives)
  market       jsonb not null default '{"bids":[],"builds":[]}'::jsonb,  -- Head of Deals: bids, co-bids (ally), builds; live market adds live {lotKey: {amount, t}} while it is open and closed: true after
  why          text not null default '',                                 -- CEO: one sentence
  predicted    numeric,                                                  -- CEO: predicted enterprise value, $M
  locked       boolean not null default false,
  locked_by    text,
  locked_at    timestamptz,
  lock_left    int,                                                      -- seconds left on the clock when the CEO locked
  notes        jsonb not null default '[]'::jsonb,                       -- Suggest notes between seats
  engine_error text,                                                     -- set by the admin if the engine rejects a lock
  updated_at   timestamptz not null default now(),
  primary key (game_id, team_id, round)
);

create table if not exists pt_events (
  game_id  text not null references pt_games(id) on delete cascade,
  seq      int  not null,
  round    int  not null default 0,
  team_id  text,                                       -- null for world events (news, shocks)
  type     text not null default '',
  text     text not null default '',                   -- the engine's plain-words sentence
  payload  jsonb not null default '{}'::jsonb,
  primary key (game_id, seq)
);

create table if not exists pt_snapshots (
  game_id    text not null references pt_games(id) on delete cascade,
  round      int  not null,
  kind       text not null,                            -- public | news | market | view | result | final
  team_id    text not null default '',                 -- '' for public snapshots
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (game_id, round, kind, team_id)
);

alter table pt_games     enable row level security;
alter table pt_teams     enable row level security;
alter table pt_seats     enable row level security;
alter table pt_decisions enable row level security;
alter table pt_events    enable row level security;
alter table pt_snapshots enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pt_games','pt_teams','pt_seats','pt_decisions','pt_events','pt_snapshots'] loop
    if not exists (select 1 from pg_policies where tablename = t and policyname = 'anon_all_' || t) then
      execute format('create policy %I on %I for all to anon using (true) with check (true)', 'anon_all_' || t, t);
    end if;
  end loop;
end $$;

-- Realtime: add each table to the publication once.
do $$
declare t text;
begin
  foreach t in array array['pt_games','pt_teams','pt_seats','pt_decisions','pt_events','pt_snapshots'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;
