# Project Structure

```
├── apps
│   ├── admin
│   │   └── src
│   │       └── ScheduledForm.tsx
│   ├── bot
│   │   ├── src
│   │   │   ├── commands
│   │   │   │   ├── follow.ts
│   │   │   │   ├── report.ts
│   │   │   │   ├── start.ts
│   │   │   │   └── status.ts
│   │   │   ├── index.ts
│   │   │   ├── notify.ts
│   │   │   └── prompts.ts
│   │   └── package.json
│   └── web
│       ├── src
│       │   ├── components
│       │   │   ├── ConfirmBar.tsx
│       │   │   ├── OutageMap.tsx
│       │   │   ├── PinPopup.tsx
│       │   │   └── ReportForm.tsx
│       │   ├── lib
│       │   │   ├── api.ts
│       │   │   └── supabase.ts
│       │   ├── pages
│       │   │   ├── MapPage.tsx
│       │   │   └── ReportPage.tsx
│       │   └── App.tsx
│       └── package.json
├── docs
│   ├── LAUNCH.md
│   └── SPEC.md
├── packages
│   └── shared
│       ├── src
│       │   ├── supabase.ts
│       │   └── types.ts
│       └── package.json
├── supabase
│   ├── functions
│   │   ├── resolve-prompts
│   │   │   └── index.ts
│   │   └── scheduled-notify
│   │       └── index.ts
│   └── migrations
│       └── 001_init.sql
├── README.md
└── vercel.json
```
