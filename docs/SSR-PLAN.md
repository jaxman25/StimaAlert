# Server-side rendering: migration plan

The web app is a Vite + React Router SPA. Today `apps/web/scripts/prerender.mjs` writes a
per-route `dist/<route>.html` so each URL has its own title, description, canonical, Open Graph
tags and JSON-LD in the raw HTML. The **body** is still rendered by JavaScript. This document
covers what real SSR would take.

## What SSR actually buys us

| Problem today | Fixed by SSR? |
|---|---|
| Crawlers see an empty `#root` until JS runs | Yes |
| Per-route `<title>`/canonical/OG for unfurlers (Slack, X) | Already fixed by prerender |
| Slow first paint on a cold mobile connection | Yes, but data still arrives client-side |
| SEO ranking | No — content quality and links dominate |

So the immediate win is first paint and no-JS reliability, not ranking. That should drive how much
we spend on it.

## Constraints in this codebase

- **Leaflet** creates the map imperatively and touches `window`/`document` at import time. It must
  stay client-only (`React.lazy` or `ssr: false` equivalent), or SSR will crash on the server.
- **Supabase client** is created at module scope in `apps/web/src/lib/supabase.ts`; it reads
  `import.meta.env`, which does not exist in a Node server without a shim.
- **Auth state** (`onAuthStateChange`, localStorage token) is browser-only by design.
- **CSP** in `vercel.json` is strict (`script-src 'self'`, no `unsafe-inline`). Any SSR framework
  that inlines a hydration payload must use a nonce or hash, or the CSP must be relaxed — relaxing
  it is not acceptable.
- **Deployment** is Vercel with the repo root as Root Directory and `outputDirectory:
  apps/web/dist`. Moving to a server runtime changes that contract.

## Options

### A. Next.js (App Router) — recommended if we commit to SSR

- Vercel-native: no server to run, `generateMetadata` replaces the prerender script and
  `seo.json` stays the single source of truth.
- Cost: React Router routes become file-system routes, `<Link>` imports change, the map page needs
  `dynamic(() => import(...), { ssr: false })`, and the Supabase client needs a browser-only module.
- Effort: ~2–3 days, mostly mechanical route and head work, plus a careful hydration test of the map.

### B. React Router 7 framework mode (SSR)

- Smallest conceptual jump: same router, same page components.
- Needs `@vercel/react-router` or a Node preset; `react-router-dom` 6 → 7 upgrade touches every
  route definition.
- Effort: ~2 days, but we own the Vercel adapter config.

### C. Keep the SPA, improve the shell

- No framework change: inline critical CSS, preload the entry chunk, add a static above-the-fold
  skeleton inside `#root`, keep prerendered heads.
- Effort: ~half a day. Improves LCP/CLS without fixing no-JS rendering.

If the goal is "Google understands each URL", we already have that with option C plus the current
prerender step. If the goal is "the page paints without JS", option A is the honest path.

## Phased plan (option A)

1. **Foundation** — add Next.js alongside nothing; scaffold `apps/web-next` (or migrate in place on
   a branch) with `app/` routes `/`, `/status`, `/report`, `/scheduled`, `/more`, `/login`, `/admin`.
   Copy `seo.json`; write `generateMetadata` reading it. Deliverable: identical heads, no behaviour.
2. **Client-only map** — move `MapPage` behind a client boundary with a static skeleton of the same
   height to avoid layout shift. Verify `h1` count and tab bar still work at 360px.
3. **Supabase** — split `lib/supabase.ts` into a browser client (singleton, `createBrowserClient`)
   and a server client only if we server-render data. Initial data can stay client-fetched.
4. **Auth + admin** — `/login` and `/admin` remain client-rendered; confirm no token is read on the
   server and that CSP still forbids inline scripts.
5. **Deployment** — switch `vercel.json` to the framework preset, drop `cleanUrls`/`rewrites`,
   regenerate the CSP with a nonce, keep the security headers, and re-verify with `curl -sI`.
6. **Cutover** — delete `scripts/prerender.mjs` and the per-route `dist` HTML once
   `curl -s <url>/status | grep title` shows the right title from the server response.

## Verification at each step

- `curl -s https://stima-alert-web.vercel.app/status | grep -o '<title>[^<]*'` must show the status
  title with JavaScript disabled semantics (raw response, not rendered DOM).
- Exactly one `h1` per route, no horizontal overflow at 360×740.
- CSP still has no `unsafe-inline` in `script-src`.
- Map loads, tabs navigate, login redirect still works.

## Risks

- Hydration mismatches in date/time formatting — pin `timeZone: 'Africa/Nairobi'` on both sides.
- Leaflet leaking into the server bundle — assert `typeof window === 'undefined'` fails loudly in CI.
- Two sources of truth for metadata during migration — keep `seo.json` and delete the old copy in
  the same commit that adds the new one.
