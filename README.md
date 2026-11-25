# StimaAlert

> "Know before KPLC kills your work."

**🔴 Live Demo:** [https://stima-alert-web.vercel.app](https://stima-alert-web.vercel.app)

Real-time, estate-level power & internet outage map for Kenya. Telegram-first. Crowdsourced.

An outage only shows on the map once enough neighbours confirm it, so a single report cannot
skew the picture.

## Status

Working MVP, deployed at the live demo above. The web app reads and writes the real Supabase
database, and outages, new-outage toasts and confirmation counts update live over realtime.
The Telegram bot is still a scaffold.

| # | Screen | State |
|---|--------|-------|
| 01 | Map home — Leaflet map, outage pins, estate sheet, tab bar | Built |
| 02 | Report outage — power/net tiles, estate & provider pickers, CTA, skyline footer | Built |
| 03 | Outage detail — bottom sheet over the dimmed map, confirmations, status | Built |
| 04 | Estate status / follow | Built |
| 05 | Scheduled outages | Built |
| 06 | Admin scheduled entry | Built, behind Supabase Auth |

Routing uses React Router (`/`, `/report`, `/status`, `/scheduled`, `/more`, `/login`, `/admin`);
`/admin` redirects to `/login` without a session. Reporting, confirming and resolving are wired to
Supabase; scheduled outages reload live when the admin panel changes them.

The frontend has had a zero-trust pass: every write validates its input, reads retry with
exponential backoff, login throttling is surfaced distinctly, and the deployment serves a strict
CSP and the usual hardening headers. See [`docs/SECURITY.md`](docs/SECURITY.md).

Known gaps: outage and confirmation rows can still be deleted by anon until
`007_admin_write_policies.sql` is applied, and `reports` only stays in step with the
`confirmations` table once `003_triggers.sql` is applied.

## Repository layout

```
apps/
  web/          React + TypeScript + Vite web app (the map UI)
  bot/          Telegram bot (Telegraf) — scaffold, no handlers wired yet
packages/
  shared/       Shared types and Supabase client helpers — scaffold
supabase/
  migrations/   SQL migrations (001–009), applied in order
docs/
  SPEC.md       Full MVP spec
  LAUNCH.md     Launch checklist
  SECURITY.md   RLS, headers, rate limits and the localStorage tradeoff
reference-ui/   Screen mockups (git-ignored, local only)
vercel.json     Deployment: clean URLs, SPA rewrite, build config and security headers
.vercelignore   Keeps the bot, edge functions and tests out of the build
```

Each app installs its own dependencies — this is not an npm-workspaces monorepo, so run
`npm install` inside the app you are working on.

## Web app

```bash
cd apps/web
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build && prerender (per-route heads + sitemap)
npm run preview  # serve the production build
npm run lint     # eslint
```

Copy `apps/web/.env.example` to `apps/web/.env` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. The anon key is designed to be public — row level security is what
protects the data — and the app throws at startup if either value is missing.

Stack: React 19, TypeScript, Vite, React Router, Supabase (Postgres + Realtime + Auth), Leaflet
(via `react-leaflet`), Tailwind CSS 4, Lucide icons.

Design tokens live as CSS variables in `apps/web/src/index.css` (navy `#001E49`, blue `#0048DB`,
red `#E00812`, green `#11911D`, orange `#FE9800`, yellow `#FFDC0A`, plus tints and radii);
components consume those variables rather than hardcoding colours. Typeface is Inter.

Screens live in `apps/web/src/pages/`, reusable map pieces in `apps/web/src/components/`:

- `pages/MapPage.tsx` — header, map, estate bottom sheet, tab bar, outage detail modal
- `pages/ReportPage.tsx` — report form and decorative skyline
- `components/OutageMap.tsx` — Leaflet map, live outage + scheduled pins, zoom/recenter controls
- `components/OutageDetail.tsx` — outage detail bottom sheet with live confirmation count
- `components/Toast.tsx` — "new outage reported" toast driven by realtime inserts

Data and auth live in `apps/web/src/lib/`:

- `lib/api.ts` — typed reads/writes, input validation, retry backoff (no raw Supabase calls in pages)
- `lib/supabase.ts` — the single shared client, built from the two `VITE_` env vars
- `lib/AuthContext.tsx` — session tracking, `signIn` / `signOut`, consumed via `useAuth()`
- `lib/format.ts` — relative times, outage windows and provider labels

`pages/LoginPage.tsx` is the admin gate; `App.tsx` holds `ProtectedRoute`, which blocks `/admin`
until the stored session is restored.

## Telegram bot

```bash
cd apps/bot
npm install
cp .env.example .env   # then fill in TELEGRAM_BOT_TOKEN
npm start              # tsx, loads .env
npm run dev            # tsx watch — restarts on save
npm run resolve-prompts  # cron job: "is power back?" prompts
```

Commands: `/start` registers the chat in `users`, `/follow <estate>` and `/unfollow <estate>`
maintain `followed_estates`, `/status <estate>` reads active outages, and `/report` posts a
PENDING outage via inline buttons.

`npm start` also subscribes to `outages` over Supabase Realtime and messages every follower when
an outage goes PENDING → ACTIVE. Reporters and anyone who already confirmed that outage are
skipped. When it is later RESOLVED, followers get a "back ON" message. Both transitions need
`009_replica_identity.sql`: without it the realtime payload's `old` row contains only the id, so
the change is ignored.

`npm start` runs long polling; `npm run resolve-prompts` is a one-shot job meant for a scheduler
(Supabase Cron or Vercel Cron), not the poller. Set `DRY_RUN=1` to log who would be messaged
without sending. It asks followers of an active estate two hours after a report, re-asks at most
three times, resolves when back votes beat still-out votes by three, and resolves by timeout six
hours after the last unanswered prompt.

`apps/bot/.env` is gitignored. The entry point refuses to start without a token, initialises
Telegraf, and stops cleanly on Ctrl-C. The bot needs `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`; the web app must never see the service-role key.

## Admin access

The scheduled outage panel at `/admin` requires a Supabase Auth session.

1. In the Supabase dashboard, open **Authentication → Users → Add user**, enter an email and
   password, and tick **Auto Confirm User** (otherwise the first login fails as unconfirmed).
2. Open `/admin` — you are redirected to `/login` — and sign in with those credentials.
3. **Log Out** in the top right of the admin header clears the session and returns to the map.

The session persists across reloads via Supabase's localStorage session, so a signed-in admin
stays signed in until they log out. The login entry point is also linked at the bottom of the
**More** tab.

Only an email/password user you create this way can manage scheduled outages; applying
`007_admin_write_policies.sql` is what stops the anon key from doing the same writes directly
against the API.

## Database

`supabase/migrations/` holds the schema and its follow-up policies. **They must be applied in
order** — later files drop and recreate policies from earlier ones:

| File | What it does |
|---|---|
| `001_init.sql` | Schema, enums, indexes, RLS and demo seed rows |
| `002_scheduled_delete_policy.sql` | Delete policy for scheduled outages |
| `003_triggers.sql` | Keeps `reports` / vote counters in step with confirmations |
| `004_realtime.sql` | Publishes `outages` and `confirmations` to realtime |
| `005_write_policies.sql` | Delete/update policies for outages and confirmations |
| `006_scheduled_realtime.sql` | Publishes `scheduled` to realtime |
| `007_admin_write_policies.sql` | Admin writes require an authenticated session |
| `008_prompt_count.sql` | `outages.prompt_count`, so the bot asks "is it back?" at most 3× |
| `009_replica_identity.sql` | Full old rows on `outages` updates, so the bot sees PENDING → ACTIVE |

Apply them with the Supabase CLI:

```bash
supabase db push
```

Or paste each file into the **SQL Editor** in the dashboard, in order. Every file except `001`
is safe to re-run.

## Security

The frontend treats every request as potentially hostile and the database is the only real
boundary — anyone can lift the anon key out of the bundle, so no guarantee lives in React.
Full detail in [`docs/SECURITY.md`](docs/SECURITY.md); the short version:

- **RLS on every table.** Public reads everywhere; anon may insert outages and confirmations
  (that is the crowdsourcing mechanic); create/update/delete on `scheduled` and
  update/delete on `outages` require an admin session (`007_admin_write_policies.sql`).
- **Headers from Vercel.** Strict CSP (`script-src 'self'`, no inline script), `X-Frame-Options:
  DENY`, `nosniff`, `strict-origin-when-cross-origin`, two-year HSTS, and a locked-down
  `Permissions-Policy` — configured in `vercel.json`.
- **Input validation before every write.** Outage type, estate name, provider and confirmation
  kind are checked in `lib/api.ts` before anything reaches the API. Defense-in-depth only; the
  Postgres enums are the enforcement.
- **Backoff, not hammering.** `fetchActiveOutages` retries three times (1s, 2s, 4s) before
  surfacing an error.
- **Throttling is visible.** A `429` or "rate limit" from Supabase Auth shows "Too many attempts.
  Please wait a few minutes and try again." rather than a credentials error.
- **Known tradeoff: the session lives in `localStorage`**, which XSS could read. The CSP closes
  the usual injection paths; moving to `httpOnly` cookies needs an SSR layer. Documented as
  residual risk, not solved.

## Deployment

The web app is deployed on Vercel from this repo. The project's **Root Directory must be the repo
root** — `vercel.json` lives here and sets the rest:

| Setting | Value |
|---|---|
| `installCommand` | `npm ci --prefix apps/web` |
| `buildCommand` | `npm run build --prefix apps/web` |
| `outputDirectory` | `apps/web/dist` |
| `cleanUrls` | serves `/status` from `status.html` instead of redirecting |
| `rewrites` | unmatched paths → `/index.html` (SPA routing) |
| `headers` | CSP + hardening headers on `/(.*)` |

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment
variables — the build bakes them in, so a change needs a redeploy. `.env` itself is gitignored and
never deployed.

Confirm the headers are actually served:

```bash
curl -sI https://stima-alert-web.vercel.app | grep -i content-security-policy
```

If that comes back empty, the project's Root Directory is probably set to `apps/web`, which makes
Vercel ignore this `vercel.json` entirely.

## SEO

Metadata lives in `apps/web/src/lib/seo.json` — one entry per route with title, description,
priority and (for `/more`) the visible FAQ. Two consumers read it: the React `<SeoMeta />`
component keeps the head correct during in-app navigation, and `apps/web/scripts/prerender.mjs`
runs after `vite build` to write `dist/<route>.html` with that route's title, description,
canonical, Open Graph tags and JSON-LD, plus `dist/sitemap.xml`. `robots.txt` allows crawling,
points at the sitemap and blocks `/admin`; `/login` is intentionally absent from the sitemap.

This is build-time HTML, not server-side rendering: crawlers that read the raw HTML see the right
head for each URL, but the page body is still rendered by JavaScript.

## Docs

- [`docs/SPEC.md`](docs/SPEC.md) — product spec, data model, API and bot flows
- [`docs/LAUNCH.md`](docs/LAUNCH.md) — launch checklist
- [`docs/SECURITY.md`](docs/SECURITY.md) — RLS matrix, CSP rationale, rate limits, token storage
- [`docs/SSR-PLAN.md`](docs/SSR-PLAN.md) — what a server-rendered migration would take

## Next steps

- Apply migrations `002`–`009` to the live database (see the table above); `008` is required by
  `npm run resolve-prompts`, `009` by the ACTIVE-notification subscription
- Schedule `npm run resolve-prompts` on a cron and point it at the bot host
- Replace the demo user id in `apps/web/src/lib/api.ts` with real reporter identity
- Build the `scheduled-notify` job
- Add a `role` column so any authenticated user isn't automatically an admin
