create table public.spotify_connections (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null unique,
  spotify_user_id text,
  display_name text,
  access_token text not null,
  refresh_token text not null,
  scope text not null default '',
  token_type text not null default 'Bearer',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.spotify_connections enable row level security;

create policy "public read spotify_connections (no tokens)"
  on public.spotify_connections for select
  using (true);

create policy "public insert spotify_connections"
  on public.spotify_connections for insert
  with check (true);

create policy "public update spotify_connections"
  on public.spotify_connections for update
  using (true);

create policy "public delete spotify_connections"
  on public.spotify_connections for delete
  using (true);

create table public.music_reactions (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  track_id text not null,
  track_name text,
  artist_name text,
  vibe text not null,
  energy real,
  valence real,
  danceability real,
  happiness_delta integer not null default 0,
  energy_delta integer not null default 0,
  message text,
  created_at timestamptz not null default now()
);

alter table public.music_reactions enable row level security;

create policy "public read music_reactions"
  on public.music_reactions for select
  using (true);

create policy "public insert music_reactions"
  on public.music_reactions for insert
  with check (true);

create index music_reactions_partner_track_idx
  on public.music_reactions (partner_name, track_id, created_at desc);