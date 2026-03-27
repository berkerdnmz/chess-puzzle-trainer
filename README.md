# ♟ Blindspot — Chess Puzzle Trainer

A chess puzzle trainer with a twist: before making a move, you must first judge whether the position even has a winning move.

## What makes it different

Classic puzzle trainers always guarantee a solution exists. Blindspot doesn't.
Each position is either:
- ✅ **Winning** — find the move
- ❌ **Not winning** — recognize it and say so

Wrong judgment = ELO loss, even if you'd find the right move afterwards.

## Tech stack

| Layer | Tool |
|---|---|
| Frontend | React + Vite |
| Hosting | GitHub Pages (free) |
| Auth | Supabase (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Puzzles | Lichess open data (CC0) |
| Chess logic | chess.js + react-chessboard |

## Setup

### 1. Clone & install
```bash
git clone https://github.com/yourusername/chess-puzzle-trainer
cd chess-puzzle-trainer
npm install
```

### 2. Create Supabase project
1. Go to supabase.com and create a free project
2. Go to **SQL Editor** and run `supabase_schema.sql`
3. Go to **Authentication → Providers** → enable **Google**
   - Authorized redirect URI: `https://your-project-id.supabase.co/auth/v1/callback`

### 3. Configure environment
```bash
cp .env.example .env
# Fill in your Supabase URL and anon key
```

### 4. Run locally
```bash
npm run dev
```

### 5. Deploy to GitHub Pages
1. Push to GitHub
2. Add secrets in repo Settings → Secrets → Actions:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Settings → Pages → Source: `gh-pages` branch
4. Push to `main` — GitHub Actions deploys automatically

## Adding puzzles

Insert via Supabase dashboard → Table Editor → `puzzles`:

| Field | Type | Description |
|---|---|---|
| `fen` | text | Position in FEN notation |
| `has_winning_move` | boolean | true or false |
| `solution_moves` | text[] | UCI moves e.g. `{"e2e4"}` — empty if no winning move |
| `rating` | integer | Difficulty ~500–3000 |
| `themes` | text[] | Optional e.g. `{"fork","mateIn1"}` |

## Project structure

```
src/
├── components/Navbar.jsx
├── pages/
│   ├── Home.jsx
│   └── Puzzle.jsx
├── hooks/
│   ├── useAuth.jsx
│   └── useTheme.jsx
├── lib/
│   ├── supabase.js
│   └── elo.js
└── App.jsx
```

## Roadmap
- [ ] Bulk Lichess puzzle import script
- [ ] Stockfish pipeline for "no winning move" positions
- [ ] Admin panel
- [ ] Per-user stats

## License
MIT — source code open. User data stays in your Supabase project.
