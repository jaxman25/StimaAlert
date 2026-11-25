# StimaAlert

> "Know before KPLC kills your work."

**🔴 Live Demo:** [https://stima-alert-web.vercel.app](https://stima-alert-web.vercel.app)

Real-time, estate-level power & internet outage map for Kenya. Telegram-first. Crowdsourced.

An outage only shows on the map once enough neighbours confirm it, so a single report cannot
skew the picture.

## Status

Early MVP — the mobile UI is being built screen by screen from the mockups in `reference-ui/`.
All data is currently **hardcoded**; Supabase is not wired into the web app yet.

| # | Screen | State |
|---|--------|-------|
| 01 | Map home — Leaflet map, outage pins, estate sheet, tab bar | Built |
| 02 | Report outage — power/net tiles, estate & provider pickers, CTA, skyline footer | Built |
| 03 | Outage detail — bottom sheet over the dimmed map, confirmations, status | Built |
| 04 | Estate status / follow | Not started |
| 05 | Scheduled outages | Not started |
| 06 | Admin scheduled entry | Not started |

Navigation is plain `useState` in `apps/web/src/App.tsx` (`'map' | 'report' | 'status' | 'scheduled'`);
React Router is not installed yet. The `status` and `scheduled` screens are placeholders.

## Repository layout

```
apps/
  web/          React + TypeScript + Vite web app (the map UI)
  bot/          Telegram bot (Telegraf) — scaffold, no handlers wired yet
packages/
  shared/       Shared types and Supabase client helpers — scaffold
supabase/
  migrations/   SQL migrations (001_init.sql)
docs/
  SPEC.md       Full MVP spec
  LAUNCH.md     Launch checklist
reference-ui/   Screen mockups (git-ignored, local only)
```

Each app installs its own dependencies — this is not an npm-workspaces monorepo, so run
`npm install` inside the app you are working on.

## Web app

```bash
cd apps/web
npm install
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build
npm run preview  # serve the production build
npm run lint     # eslint
```

Stack: React 19, TypeScript, Vite, Leaflet (via `react-leaflet`), Tailwind CSS 4, Lucide icons.

Design tokens live as CSS variables in `apps/web/src/index.css` (navy `#001E49`, blue `#0048DB`,
red `#E00812`, green `#11911D`, orange `#FE9800`, yellow `#FFDC0A`, plus tints and radii);
components consume those variables rather than hardcoding colours. Typeface is Inter.

Screens live in `apps/web/src/pages/`, reusable map pieces in `apps/web/src/components/`:

- `pages/MapPage.tsx` — header, map, estate bottom sheet, tab bar, outage detail modal
- `pages/ReportPage.tsx` — report form and decorative skyline
- `components/OutageMap.tsx` — Leaflet map, hardcoded pins, zoom/recenter controls
- `components/OutageDetail.tsx` — outage detail bottom sheet

## Telegram bot

```bash
cd apps/bot
npm install
npx tsx src/index.ts   # no npm scripts defined yet
```

Requires `TELEGRAM_BOT_TOKEN` and Supabase credentials in the environment (see `docs/SPEC.md`).
The bot currently has scaffolding only (`src/commands`, `src/notify.ts`, `src/prompts.ts`).

## Database

`supabase/migrations/001_init.sql` defines the initial schema. Apply it with the Supabase CLI:

```bash
supabase db push
```

## Docs

- [`docs/SPEC.md`](docs/SPEC.md) — product spec, data model, API and bot flows
- [`docs/LAUNCH.md`](docs/LAUNCH.md) — launch checklist

## Next steps

- Wire the report form and map pins to Supabase (replace the hardcoded data)
- Build screens 04–06
- Replace the `useState` navigation with React Router once screen count settles
