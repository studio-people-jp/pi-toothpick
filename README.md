# Pi Toothpick

A worldwide collaborative Buffon's needle experiment. One click contributes 1,000 virtual toothpicks to a shared estimate of π.

## Project setup

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard and run all of `database/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and the anon/publishable key.
4. Edit `supabase-config.js` and replace the two placeholder strings:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`
5. In GitHub, open **Settings → Pages**. Under **Build and deployment**, select **Deploy from a branch**, choose `main` and `/ (root)`, then save.
6. Wait for the Pages deployment to finish.

The site will be available at:

https://studio-people-jp.github.io/pi-toothpick/

## How it works

The page generates a random midpoint and orientation for a toothpick of length `L = 1` between parallel lines spaced `d = 2` apart. It determines whether that toothpick crosses a line, then calls the Supabase RPC function `drop_toothpicks` with 1,000 trial results.

The database function increments the shared counters atomically, so simultaneous visitors do not overwrite one another's contributions.

With `N` total drops and `K` crossings:

```
π ≈ 2LN / (dK)
```

## Security notes

- The browser uses only the Supabase anon/publishable key. This key is designed for public clients; database permissions are controlled by RLS and function grants.
- **Never put the Supabase service_role key in this repository or in browser code.**
- The public batch RPC accepts exactly 1,000 boolean results per call. This is a fun public experiment, not a tamper-proof scientific measurement service.
