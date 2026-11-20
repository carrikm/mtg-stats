# Match Log

Tracks Magic: the Gathering match results: overall win rate, play/draw splits, and results by my deck, by opponent's deck, or by any pairing of the two.

Anyone can create an account. Each account's decks, formats, and matches are private: every page shows only the signed-in user's own data, enforced by Supabase row-level security.

Built with Vite, React, Recharts, and Supabase.

## Pages

- **Dashboard** (`/`): match win rate with a win/loss/draw pie chart, game win rate, play vs draw win rates (per game and per match, using Game 1), and the 5 most played decks. Can be filtered by format.
- **Breakdown** (`/stats`): filter by format, my deck, opponent's deck, or any combination (for example, everything against UG Show and Tell, or only BR Reanimator against UG Show and Tell). Includes per-deck tables and the full match list with comments.
- **New Match** (`/new`): log a best-of-3 match. Games 1 and 2 are required; Game 3 is optional.

Every page requires signing in. Signed-out visitors see the sign-in / create-account form.

## Setup

This site uses **its own Supabase project**, separate from any other site.

1. Create a new project at [supabase.com](https://supabase.com).
2. In that project's **SQL Editor**, run [supabase/schema.sql](supabase/schema.sql).
   Already set up from an older version? Run the upgrade scripts instead, in order, skipping any you've already run:
   1. [supabase/add_formats.sql](supabase/add_formats.sql) adds formats.
   2. [supabase/add_users.sql](supabase/add_users.sql) makes each account's data private and gives all existing matches to the account that already exists.
3. Under **Authentication → URL Configuration**, set **Site URL** to the deployed site's address, and add `http://localhost:5173` under **Redirect URLs** for local development. Confirmation emails link back to these.
4. Under **Authentication → Sign In / Providers**, make sure **Allow new users to sign up** and **Confirm email** are on.
5. Copy `.env.example` to `.env` and fill in the project's URL and anon key (**Project Settings → API**).
6. Install and run:

   ```sh
   npm install
   npm run dev
   ```

## Scripts

- `npm run dev`: start the dev server
- `npm test`: run the stats and validation tests
- `npm run lint`: lint with oxlint
- `npm run build`: production build into `dist/`

## How results are counted

- A match is won by whoever won more games. Equal game wins (for example 1–1 with no Game 3) is a draw.
- Win rate is wins ÷ all results, including draws, always shown alongside the W–L–D record.
- "Matches on the play" uses who was on the play in Game 1.
- Deck and format names are matched ignoring case within each account, so typing "br reanimator" picks your existing "BR Reanimator". Two accounts can each have a deck with the same name without affecting each other.
