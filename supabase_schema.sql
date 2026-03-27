-- ============================================================
-- Blindspot Chess Puzzle Trainer — Supabase Schema
-- Run this in Supabase > SQL Editor
-- ============================================================

-- 1. PROFILES (one per user, stores ELO)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  elo integer not null default 1000,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, elo)
  values (new.id, 1000)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PUZZLES
create table public.puzzles (
  id serial primary key,
  fen text not null,
  has_winning_move boolean not null,
  solution_moves text[] default '{}',  -- UCI format e.g. {"e2e4","d7d5"}
  rating integer not null default 1500,
  themes text[] default '{}',
  lichess_id text,
  created_at timestamptz default now()
);

-- 3. PUZZLE ATTEMPTS (for admin visibility)
create table public.puzzle_attempts (
  id serial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  puzzle_id integer references public.puzzles(id),
  correct boolean not null,
  player_elo_before integer,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.puzzles enable row level security;
alter table public.puzzle_attempts enable row level security;

-- Profiles: users can only read/update their own
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Puzzles: anyone can read
create policy "Puzzles are public"
  on public.puzzles for select using (true);

-- Attempts: users can insert their own, nobody can read others
create policy "Users can insert own attempts"
  on public.puzzle_attempts for insert with check (auth.uid() = user_id);

-- ============================================================
-- SAMPLE DATA (a few puzzles to get started)
-- has_winning_move = true  → real puzzle, solution_moves required
-- has_winning_move = false → trap position, no move needed
-- ============================================================

insert into public.puzzles (fen, has_winning_move, solution_moves, rating, themes) values
  -- Mate in 1 (white wins)
  ('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
   true, '{"f3f7"}', 1200, '{"mateIn1"}'),

  -- Fork (white wins)
  ('rnbqkb1r/ppp2ppp/4pn2/3p4/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5',
   true, '{"d4e5"}', 1400, '{"fork"}'),

  -- Trap position — looks dangerous but no real win for white
  ('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
   false, '{}', 1100, '{}'),

  -- Pin tactic (black wins)
  ('r1bqk2r/pppp1ppp/2n2n2/2b1p3/4P3/2NP1N2/PPP2PPP/R1BQKB1R b KQkq - 0 5',
   true, '{"c5f2"}', 1600, '{"pin"}'),

  -- Equal endgame — no winning move
  ('8/4k3/8/8/8/8/4K3/8 w - - 0 1',
   false, '{}', 900, '{}');
