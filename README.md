# Nova Website (Next.js)

A marketing site plus minimal user and admin dashboards powered by Next.js 14, Tailwind CSS, and Supabase Auth. This site lives under `/website` and runs alongside the Expo app.

## Quick start
- Install deps (in repo root):
  - `npm install` (root) and `npm install --prefix website` if not already installed
- Start via Autopilot (recommended):
  - `autopilot.bat`  (starts Expo Web on 8082 and Next.js site on 5173, opens browsers)
  - `autopilot.bat site`  (Next.js only)
  - `autopilot.bat web`   (Expo Web only)
  - `autopilot.bat both`  (same as default)
- Start website manually:
  - `npm run dev --prefix website` then open http://localhost:5173

## Environment variables
Create `website/.env.local` with the following:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
# Optional: comma-separated list of admin emails allowed to access /admin
NEXT_PUBLIC_ADMIN_EMAILS=admin@yourdomain.com
```

Notes:
- Variables must be prefixed with `NEXT_PUBLIC_` so they are available in the browser.
- We already created an initial `.env.local` for you using your provided Supabase keys. Update as needed.

## Auth
- Sign in: `/login` (email/password)
- Sign up: `/signup`
- Protected routes:
  - `/dashboard` (requires authenticated user)
  - `/admin` (requires authenticated user AND email in `NEXT_PUBLIC_ADMIN_EMAILS`)

## Ports
- Expo Web: http://localhost:8082
- Next.js Website: http://localhost:5173

## Tech stack
- Next.js 14.2.x
- Tailwind CSS 3.x
- Supabase JS v2

## Pricing Management
Admins can update subscription pricing without code changes:
- Navigate to `/admin/pricing` (requires admin email in `.env.local`)
- Edit prices, features, savings, and toggle plans active/inactive
- Changes apply immediately to both website and mobile app
- See main README.md for full pricing documentation

## Troubleshooting
- If Supabase errors on the website, verify `website/.env.local` exists and contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- If Autopilot doesn't open browsers, wait a few seconds and open the URLs manually.
- If `episodes` do not load, ensure your Supabase RLS allows anon read for active episodes or sign in first.
- If pricing doesn't load, run the migration: `supabase/migrations/20260324_pricing_tiers.sql`
