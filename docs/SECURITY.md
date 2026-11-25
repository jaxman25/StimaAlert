# Security

What protects StimaAlert today, what is deliberately left open, and what the
remaining risks are. This is a zero-trust pass over the frontend and the
deployment, not a claim that the product is audited.

Threat model in one line: the browser is untrusted. Anyone can read the JS
bundle, extract the anon key (it is public by design), and call the Supabase
REST and realtime APIs directly. Every guarantee therefore has to hold in the
database or at the HTTP layer, never in React.

---

## 1. Row Level Security

RLS is enabled on all four tables. Policies live in `supabase/migrations/`.

| Table | anon (no session) | authenticated (admin session) |
|---|---|---|
| `users` | read, insert | read, insert |
| `outages` | read, insert | read, insert, update, delete |
| `scheduled` | read | read, insert, update, delete |
| `confirmations` | read, insert | read, insert, delete |

Where each policy comes from:

| File | Policies |
|---|---|
| `001_init.sql` | `Public read *` on all tables, `Public insert users/outages/scheduled/confirmations` |
| `002_scheduled_delete_policy.sql` | delete on `scheduled` (superseded by 007) |
| `005_write_policies.sql` | update/delete on `outages`, delete on `confirmations` (superseded by 007) |
| `007_admin_write_policies.sql` | drops the anon write policies above and recreates them as `Authenticated *` for `authenticated` only |

**Intentionally open to anon**, and why:

- **Reads** on every table — the map is a public, crowdsourced product; anyone
  may browse outages and schedules.
- **Insert into `outages`** — reporting an outage must work without an account
  in V1. New rows are forced to `status = 'PENDING'` by the client, and the
  confirmation threshold is what promotes them.
- **Insert into `confirmations`** — confirming / "still out" / "it's back" is
  the crowdsourcing mechanic and needs no login.
- **Insert into `users`** — the app reports as a demo user until real reporter
  identity exists.

**Requires a session:** create/update/delete on `scheduled`, and update/delete
on `outages` and `confirmations`. These are admin actions.

### Known gaps in RLS

- `007_admin_write_policies.sql` is written but **must be applied**; until it
  is, the anon key can still write `scheduled` and delete outages. Applying
  migrations in order is part of deployment, not optional hardening.
- Any authenticated user is an admin. There is no `role` column, so a session
  is the whole authorisation model; add a `profiles.role` claim before handing
  out accounts you do not control.
- Anon inserts are only bounded by the client's own validation (§3) and by
  Supabase's platform limits. Abuse protection (per-IP rate limiting on
  reports) is not implemented yet — it is specced for V1 in `docs/SPEC.md` §8.
- `apps/web/src/lib/api.ts` still ships `DEMO_USER_ID`, a hard-coded uuid that
  any client can reuse to cast confirmations. It is a demo affordance, not an
  identity, and should go once reporters are authenticated.

---

## 2. HTTP security headers

Applied to every response by `vercel.json` → `headers` (Vercel serves them at
the edge; they are not in the Vite build, so `npm run preview` will not show
them).

| Header | Value | Why |
|---|---|---|
| `Content-Security-Policy` | see below | Blocks injected scripts and restricts where data can go |
| `X-Frame-Options` | `DENY` | No framing — clickjacking defence (redundant with `frame-ancestors 'none'`, kept for old browsers) |
| `X-Content-Type-Options` | `nosniff` | Stops MIME sniffing turning an upload into a script |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Full path stays same-origin; cross-origin leaks only the origin |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Two years of HTTPS-only, subdomains included |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | The app uses none of these |

### The CSP, directive by directive

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: https://*.tile.openstreetmap.org;
connect-src 'self' https://vcyzglfbpwzopoqwgygd.supabase.co wss://vcyzglfbpwzopoqwgygd.supabase.co;
font-src 'self' https://fonts.gstatic.com;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

- `script-src 'self'` — no inline scripts, no CDN scripts, no `eval`. This is
  the directive that does the real work against XSS.
- `style-src` allows `'unsafe-inline'` because React writes inline `style`
  attributes (Leaflet positions the map and pins that way) and Lucide/Leaflet
  inject styles. This is the one relaxation, and it cannot execute script.
  `https://fonts.googleapis.com` is required because `index.css` `@import`s
  Inter from Google Fonts — without it the typeface silently fails.
- `img-src` allows `data:` (favicon/inline images) and the OpenStreetMap tile
  host. Any new tile provider must be added here or tiles disappear.
- `connect-src` allows the Supabase REST and realtime (`wss://`) endpoints for
  this project ref only. **If the project is ever moved or renamed, this line
  must change with it** or every request fails.
- `frame-ancestors 'none'` / `base-uri 'self'` / `form-action 'self'` — no
  framing, no `<base>` hijack, no form posts to a third party.

`'unsafe-inline'` for scripts is **not** present; if a future feature needs an
inline script, use a hash or nonce rather than weakening `script-src`.

---

## 3. Client-side input validation

`apps/web/src/lib/api.ts` validates before every write:

| Field | Rule |
|---|---|
| outage `type` | exactly `POWER` or `INTERNET` |
| `estate` | non-empty after trim, under 100 characters |
| `provider` | one of `KPLC`, `SAFARICOM`, `ZUKU`, `FAIBA`, or `null` |
| confirmation `kind` | `CONFIRM`, `STILL_OUT` or `BACK` |

Invalid input throws with a readable message and is logged via `console.error`.

This is **defense-in-depth, not a security boundary** — a hostile client can
skip it entirely and POST straight to PostgREST. The database enforces the same
rules with enums and `not null`; that is what actually holds. The value here is
that a bug or a tampered client fails early with a clear message instead of
surfacing a Postgres error.

Reads retry with exponential backoff (1s, 2s, 4s, three attempts) before
failing, so a transient outage does not cause a request storm against the
database.

---

## 4. Authentication

- Admin panel (`/admin`) is gated by Supabase Auth, email + password.
- `AuthProvider` hides the route until the stored session is restored, so a
  reload does not bounce a signed-in admin to `/login`.
- Login failures show the Supabase message, except throttling (HTTP 429 or a
  "rate limit" message), which shows "Too many attempts. Please wait a few
  minutes and try again." so an attacker learns nothing about whether the
  account exists.
- Sign out clears the session, and `onAuthStateChange` keeps the UI in sync.

### Rate limits

Rate limiting is **handled by Supabase, not by this repo**. Auth endpoints
(sign-in, sign-up, password recovery, token refresh) are throttled per IP by
the platform and return `429` when exceeded; the login page surfaces that as
the message above. No custom limits, CAPTCHA or IP allow-list have been
configured yet — do that in **Authentication → Rate Limits** before the admin
panel is advertised anywhere.

Data endpoints are only limited by RLS and any limits you set on the project.
Application-level limits for reporting (per user per hour, per §8 of the spec)
are **not implemented**.

---

## 5. Known tradeoff: session tokens in `localStorage`

Supabase's browser client persists the session (access + refresh token) in
`localStorage` by default, and this app uses that default.

**Why it matters:** `localStorage` is readable by any JavaScript running on the
origin. If an attacker achieves XSS, they can read the refresh token and keep
admin access even after the tab is closed — `httpOnly` cookies would not be
readable that way.

**Why it is acceptable for now:**

- The strong mitigation is `script-src 'self'` in the CSP: no inline script, no
  third-party script, no `eval`, so the usual injection paths are closed.
- React escapes rendered values by default, and the app never uses
  `dangerouslySetInnerHTML`.
- The token is scoped to one origin and expires (access tokens are short-lived;
  refresh tokens rotate).
- The blast radius is the admin panel: scheduled outage editing. It is not a
  payments or PII store.

**Residual risk / what would improve it:**

1. Move to cookie-based sessions with `httpOnly`, `Secure`, `SameSite`, which
   needs a server component or a Supabase SSR proxy — a real architectural
   change, not a config flag.
2. Shorten refresh token lifetime and add refresh-token reuse detection
   (Supabase Auth settings).
3. Add a strict CSP report-only rollout and monitor violations before
   tightening further.

Deployments behind a strict CSP are still the main control: treat "token in
localStorage" as mitigated but not eliminated, and revisit it if the admin panel
ever handles more than scheduled outages.

---

## 6. Deployment checklist

- [ ] Apply migrations `001`–`007` in order (see `README.md` → Database).
- [ ] Confirm headers are live: `curl -sI https://stima-alert-web.vercel.app | grep -i content-security-policy`.
- [ ] Create admin users in Supabase with **Auto Confirm User**, and keep the
      account list short and known.
- [ ] Set Supabase Auth rate limits and enable email confirmation.
- [ ] Rotate the Supabase anon key if it is ever leaked alongside a policy
      mistake — the key alone is not a secret, but it is the only handle on the
      API.
- [ ] Verify no `.env` is committed (`git ls-files | grep -i env`).
