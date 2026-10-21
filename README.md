# Observatory Admin

The admin area for the **Earth Observatory** (the course's AI-media rating app, repo
`helloworld-assignment1`). It reads and writes the same Supabase database.

| Page | What it does |
|---|---|
| **Overview** `/` | Statistics: reports per day, busiest hours, report types, which Gemini model earns the best votes, most-visited planets, top crew, hall of fame, most divisive report |
| **Users** `/users` | READ every profile, with each person's reports, postcards, score earned and votes cast |
| **AI media** `/media` | READ / search / filter every report and postcard. CREATE a new one with Gemini (`/media/new`), UPDATE its title or text, DELETE it (and its votes and stored images) |
| **Votes** `/votes` | READ every upvote and downvote, filterable by direction and voter |

## Who can get in

Every route is behind Google sign-in **and** `profiles.is_superadmin = true`:

1. `src/proxy.ts` runs on every request. Signed out → `/login`. Signed in but not a superadmin → `/denied`.
2. Every page and server action calls `requireAdmin()` again next to the data.
3. The database enforces it too (RLS in `supabase/migrations/20261021000000_superadmin.sql`):
   only `public.is_superadmin()` users can read all profiles and votes or update/delete reports.
   Even with the public anon key, a regular account sees only its own profile.

### "Won't I be locked out?"

A brand-new column defaults to `false` for everyone, including me. The way in is to set my own flag
**outside the app**, in the Supabase SQL Editor, which runs as the database owner and bypasses RLS:

```sql
update public.profiles set is_superadmin = true where email = 'sampadaaprakash@gmail.com';
```

A trigger (`guard_superadmin_flag`) rejects any change to `is_superadmin` that comes through the API,
so a regular user can't promote themselves by editing their own profile row. Only the database owner can.

## Run it

```bash
npm install
# .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, GEMINI_API_KEY
npm run dev   # http://localhost:3001
npm test
```
