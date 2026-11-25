# StimaAlert — Kenya Outage Alert (MVP Spec)

> **"Know before KPLC kills your work."**
> Real-time, estate-level power & internet outage map for Kenya. Telegram-first. Crowdsourced.

---

## 1. Problem & Positioning

**The problem:** KPLC scheduled maintenance is buried in PDFs. Fiber goes down and support says "we're working on it" for 6 hours. Freelancers and students lose clients, deadlines, and data with zero warning. People currently rely on WhatsApp rumors — there is no real-time outage map.

**Positioning (the reframe):** StimaAlert is a **community-organizing product with a map attached** — not a map with reports attached. Trust and density in a single estate are the whole game. The map is the demo; the Telegram bot is the retention.

**What makes it different:**
- Real-time + crowdsourced (KPLC takes hours to tweet; users know in 5 minutes)
- Estate-level granularity ("Umoja 2", not "Nairobi")
- Proactive alerts before your meeting
- Free public API — become the source other devs build on

---

## 2. Scope: What's In V1 vs Later

### ✅ In V1 (ship in ~3 weeks, one estate)
- Live map with red (power) / blue (internet) pins
- 2-tap outage report
- Confirm / "still out" / "it's back" mechanics
- Estate following via Telegram bot
- Manual/curated scheduled outages (human enters KPLC PDF data weekly)
- Auto-resolve with **active "is it back?" prompts** (not passive timeout)

### ⏳ Later (post-launch, only if people use it)
- Automated KPLC PDF scraper
- Client-side connectivity telemetry (aggregated check-ins)
- WhatsApp Cloud API channel
- Phone verification (only when abuse appears)
- Public API + monetization (business API, ISP verified status, sponsors)
- Multi-city expansion beyond launch estate

### ❌ Explicitly cut from V1
- Server-side DNS pinging as "outage detection" (doesn't work — see §9)
- IP-based verification (useless under CGNAT/shared Safaricom IPs)
- Mobile native app

---

## 3. Core Features (V1 Detail)

| Feature | Behavior |
|---|---|
| **Live Map** | Leaflet map. Red pin = power outage, blue pin = internet. Click pin → "Rongai — reported 15 min ago by 4 people." |
| **Report Outage** | 2 taps: "Power Out" → select estate → submit. Requires 2 confirmations to appear on map. |
| **Confirm / Still Out** | Other users confirm an active outage or mark "still out" to keep it alive. |
| **Is It Back?** | Bot proactively asks followers ~2 hrs after an outage: "Power back in Githurai 45? 👍/👎". This is the trust layer. |
| **Follow Estate** | Telegram: `/follow Githurai`. Bot pushes "⚡ Power OUT reported in Githurai 45 — 3 confirmations." |
| **Scheduled Outages** | Curated weekly (human reads KPLC PDF). Shown as amber pins + "Scheduled: Kinoo, Sat 23 Nov 9am–5pm." |
| **Auto-Resolve** | Resolves on positive "it's back" confirmations; falls back to timeout only as last resort. |

---

## 4. Tech Flows

### 4.1 Report → Map flow
```
User taps "Power Out" → selects estate
        │
        ▼
Frontend POST /reports ──► Supabase (status=PENDING, reports=1)
        │
        ▼
Needs 2nd confirmation ──► second user confirms
        │
        ▼
reports >= 2 ──► status=ACTIVE ──► appears on map
        │
        ▼
Bot notifies followers of that estate
```

### 4.2 Resolution flow (the trust layer)
```
Outage ACTIVE
        │
        ▼
Cron (~2h) ──► Bot asks followers "Is it back?" 👍/👎
        │
   ┌────┴─────┐
   ▼          ▼
 👍 votes   👎 votes
   │          │
   ▼          ▼
Resolve    Keep ACTIVE, re-ask later
(+3 net)   (max 3 prompts, then timeout-resolve)
```

### 4.3 Scheduled outage flow (V1 = manual)
```
Friday: human reads KPLC PDF
        │
        ▼
Admin panel / Supabase insert ──► Scheduled table
        │
        ▼
Cron (daily) ──► bot posts upcoming scheduled outages
        to followers of affected estates
```

### 4.4 Telegram bot flow
```
/start          → register user (no phone needed in V1)
/follow <estate>→ add to followedEstates
/unfollow <estate>
/report         → quick report via inline buttons
/status <estate>→ current state
```

---

## 5. Architecture & Tech Stack

| Part | Tool | Notes |
|---|---|---|
| **Frontend** | React + Leaflet | Free maps, pin rendering, report UI |
| **Backend / DB** | Supabase (Postgres + Auth + Realtime) | Reports, users, scheduled outages, realtime map updates |
| **Cron** | Supabase Cron / Vercel Cron | Resolution prompts, scheduled-outage notifications |
| **Bot** | Telegram Bot API | Primary channel in V1 |
| **Admin** | Supabase Studio + a tiny admin page | Manual scheduled-outage entry |
| **Hosting** | Vercel (frontend) + Supabase (backend) | Free tier — live at https://stima-alert-web.vercel.app |
| **Later** | Node + Puppeteer (scraper), WhatsApp Cloud API | Post-launch only |

**No scraper in V1. No server-side pinging in V1. No phone verification in V1.**

---

## 6. Database Schema

```sql
Outage {
  id            uuid PK
  type          enum("POWER","INTERNET")
  provider      enum("KPLC","SAFARICOM","ZUKU","FAIBA")
  estate        text
  location      geography(point)
  status        enum("PENDING","ACTIVE","RESOLVED")
  reportedBy    uuid FK User
  reports       int          -- confirmation count
  stillOutVotes int
  backVotes     int
  reportedAt    timestamptz
  lastPromptAt  timestamptz
  resolvedAt    timestamptz
}

Scheduled {
  id        uuid PK
  provider  enum(...)
  estate    text
  startTime timestamptz
  endTime   timestamptz
  sourceUrl text
  addedBy   text   -- "manual:admin"
}

User {
  id               uuid PK
  telegramId       text UNIQUE
  followedEstates  text[]
  createdAt        timestamptz
}

Confirmation {
  id         uuid PK
  outageId   uuid FK Outage
  userId     uuid FK User
  kind       enum("CONFIRM","STILL_OUT","BACK")
  createdAt  timestamptz
  UNIQUE(outageId, userId, kind)  -- one vote per kind per user
}
```

---

## 7. File Structure

```
stimaalert/
├── apps/
│   ├── web/                     # React + Leaflet frontend
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   │   ├── MapPage.tsx
│   │   │   │   └── ReportPage.tsx
│   │   │   ├── components/
│   │   │   │   ├── OutageMap.tsx
│   │   │   │   ├── PinPopup.tsx
│   │   │   │   ├── ReportForm.tsx
│   │   │   │   └── ConfirmBar.tsx
│   │   │   ├── lib/
│   │   │   │   ├── supabase.ts
│   │   │   │   └── api.ts
│   │   │   └── App.tsx
│   │   └── package.json
│   │
│   ├── bot/                     # Telegram bot
│   │   ├── src/
│   │   │   ├── index.ts         # webhook entry
│   │   │   ├── commands/
│   │   │   │   ├── start.ts
│   │   │   │   ├── follow.ts
│   │   │   │   ├── report.ts
│   │   │   │   └── status.ts
│   │   │   ├── notify.ts        # push outage alerts
│   │   │   └── prompts.ts       # "is it back?" logic
│   │   └── package.json
│   │
│   └── admin/                   # tiny scheduled-outage entry page
│       └── src/
│           └── ScheduledForm.tsx
│
├── packages/
│   └── shared/                  # shared types + Supabase client
│       ├── src/
│       │   ├── types.ts         # Outage, Scheduled, User, Confirmation
│       │   └── supabase.ts
│       └── package.json
│
├── supabase/
│   ├── migrations/
│   │   └── 001_init.sql         # schema from §6
│   └── functions/
│       ├── resolve-prompts/     # cron: ask "is it back?"
│       └── scheduled-notify/    # cron: upcoming scheduled outages
│
├── docs/
│   ├── SPEC.md                  # this document
│   └── LAUNCH.md                # single-estate launch playbook
│
├── vercel.json
└── README.md
```

---

## 8. Launch Strategy (the actual hard part)

**Cold-start is the real challenge, not fake reports.** A crowdsourced map is worthless with 4 reports. You need ~5–10% of residents in one estate reporting for reliability.

1. **Pick one estate** — yours.
2. **Recruit 20 people** — neighbors, estate WhatsApp group, campus.
3. **Seed manually** — you and 3 friends report/confirm during real outages so the map is never empty.
4. **Bot-first onboarding** — get people onto `/follow` before the web map matters.
5. **Measure daily active reporters**, not signups. Expand to estate #2 only when estate #1 has ≥10 active reporters/week.

**Abuse handling in V1:** rate-limit reports per user per hour, require 2 confirmations, allow community flagging. Add phone verification **only when abuse actually appears** — not before.

---

## 9. Known Constraints (be honest with yourself)

- **Server-side DNS pinging is not outage detection.** Pinging from your server tells you if *your server* reaches Safaricom — not whether Githurai is down. Safaricom/Zuku resolvers are anycast and rarely "down." Real detection needs *client-side* telemetry (aggregated browser/app check-ins), which is a post-launch feature.
- **PDF scraping is brittle.** KPLC publishes inconsistently (PDFs, images, late). Manual curation is faster and more reliable for V1; automate later once formats are known.
- **IP verification is useless in Kenya** under CGNAT/shared Safaricom IPs — it blocks legit users and misses fakes.
- **Auto-resolve by timeout alone is wrong** — people stop reporting once they've reported. That's why "is it back?" prompts are in V1.

---

## 10. Monetization (deferred — do not build yet)

Free forever for users. Later, once data is reliable and dense:
- Businesses pay for API access + SMS alerts across branches
- ISPs pay for "Verified" status and direct posting (**conflict-of-interest risk — gate this carefully**)
- Sponsors: generator/UPS sellers

Do not optimize monetization until one estate has daily active reporting.

---

## 11. To-Do List

### ✅ Now — Week 1: Report + Map (one estate)
- [ ] Set up Supabase project + run `001_init.sql`
- [ ] Set up Telegram bot (BotFather), webhook to `apps/bot`
- [ ] Build `/start` + `/follow <estate>` commands
- [ ] Build React + Leaflet map page showing ACTIVE outages as pins
- [ ] Build 2-tap report form → insert PENDING outage
- [ ] Build confirm flow → PENDING becomes ACTIVE at 2 confirmations
- [ ] Seed manually with 3 friends during a real outage
- [ ] Recruit 20 people in your estate onto `/follow`

### Week 2: Trust layer
- [ ] Add `Confirmation` votes: CONFIRM / STILL_OUT / BACK
- [ ] Build `resolve-prompts` cron: bot asks "Is it back?" ~2h after outage
- [ ] Resolve on +3 net 👍; re-ask on 👎 (max 3 prompts, then timeout-resolve)
- [ ] Add rate-limiting on reports (per user per hour)
- [ ] Add community flag button

### Week 3: Scheduled outages + polish
- [ ] Build tiny admin page for manual scheduled-outage entry
- [ ] Build `scheduled-notify` cron: daily push of upcoming scheduled outages to followers
- [ ] Show scheduled outages as amber pins on map
- [ ] Map polish: popup copy, pin clustering, mobile layout
- [ ] Write `docs/LAUNCH.md` playbook for estate #2

### 🔜 Later — only after estate #1 has ≥10 active reporters/week
- [ ] Automated KPLC PDF scraper (Node + Puppeteer) — expect 2–3x effort, maintain forever
- [ ] Client-side connectivity telemetry (aggregated check-ins)
- [ ] WhatsApp Cloud API channel
- [ ] Public free API + developer docs
- [ ] Phone verification (only if abuse appears)
- [ ] Monetization: business API, ISP verified status, sponsors
- [ ] Estate #2, #3 expansion

### ❌ Do not build (cut from V1)
- [ ] ~~Server-side DNS ping as outage detection~~
- [ ] ~~IP-based verification~~
- [ ] ~~Native mobile app~~
- [ ] ~~Automated scraper before manual curation proves demand~~

---

## 12. Your Next 3 Steps (today)

1. **Register the Telegram bot** via BotFather — name it **StimaAlert**. 30 lines of webhook code and people can start following their estate.
2. **Pick your estate** and list 20 people to onboard this week.
3. **Seed the first outage yourself** with 2 friends so the map is never empty on day one.