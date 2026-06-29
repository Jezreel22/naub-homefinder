# Vite SPA → Next.js App Router (with backend in same folder)

## Context

The project is currently a **Vite + React 19 SPA** that talks to an external API over HTTP. The original backend (Express + Drizzle + Postgres at `artifacts/api-server/`, plus shared `lib/` packages) was deleted when the monorepo was unwound. The generated React Query client (`src/api/`) now calls URLs like `/api/properties`, `/api/auth/login`, etc., but nothing serves them — the app would 404 on every call.

The user wants to refactor to **Next.js (App Router)** so the frontend pages and backend route handlers live in one project. Confirmed settings:
- **App Router** with TypeScript
- **Drizzle + Postgres** (matches the deleted backend's stack)
- **JWT in localStorage** (keep current pattern: `Authorization: Bearer <token>`)
- **Replicate the original backend 1:1** — implement every endpoint the UI already calls

The Vite SPA layer doesn't go away in this plan; it's reshaped into Next.js conventions (pages → `app/*`, wouter → `next/navigation`, `import.meta.env` → `process.env.NEXT_PUBLIC_*`, all interactive components get `'use client'`).

## Source inventory (what exists today)

- **Pages** ([src/pages/](src/pages/)): `home`, `register`, `login`, `dashboard`, `properties`, `list-property`, `property-detail`, `booking`, `messages`, `admin`, `kyc`, `not-found` (12 routes total)
- **Components** ([src/components/](src/components/)): `NavBar`, `PropertyCard`, `TrustBadge`, plus 47 shadcn/ui wrappers in `ui/`
- **API client** ([src/api/](src/api/)): `customFetch.ts`, generated `api.ts` (29 endpoint URL getters), `api.schemas.ts` (Zod schemas)
- **Hooks/util**: [src/hooks/](src/hooks/), [src/lib/](src/lib/), [src/index.css](src/index.css), [index.html](index.html), [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx)
- **Vite-only**: [vite.config.ts](vite.config.ts) (uses `@vitejs/plugin-react`, `@tailwindcss/vite`, Replit runtime-error plugin)
- **Env-dependent**: `VITE_GOOGLE_CLIENT_ID` in 4 files, `BASE_URL` in 4 files (App.tsx, login.tsx, kyc.tsx, register.tsx)
- **Browser-only**: `localStorage` in 11 page/component files
- **wouter**: `useLocation`, `useParams`, `useSearch`, `Link` across 9 files
- **Auth**: JWT in `localStorage.naub_token`, user object in `localStorage.naub_user`; `src/main.tsx:6` calls `setAuthTokenGetter(() => localStorage.getItem("naub_token"))`
- **Public assets**: `public/{favicon.svg, opengraph.jpg, robots.txt}`

## Backend surface to replicate (from `src/api/generated/api.ts`)

29 endpoints covering auth, users, properties, bookings, ratings, disputes, messages, KYC, plus admin endpoints called from `src/pages/admin.tsx` (pending-verifications, pending-properties, disputes):

- **Auth**: `/api/auth/{register, login, google, kyc}`
- **Users**: `/api/users/me`, `/api/users/{id}` (GET/PUT), `/api/users/{id}/trust-score`
- **Properties**: `/api/properties` (GET/POST), `/api/properties/me`, `/api/properties/{id}` (GET/PUT/DELETE), `/api/properties/{id}/photos`, `/api/properties/{id}/publish`
- **Bookings**: `/api/bookings` (GET/POST), `/api/bookings/{id}`, `/api/bookings/{id}/confirm`, `/api/bookings/{id}/dispute`
- **Ratings**: `/api/ratings` (GET/POST)
- **Disputes**: `/api/disputes` (GET), `/api/disputes/{id}`, `/api/disputes/{id}/adjudicate`
- **Messages**: `/api/messages/conversations`, `/api/messages` (POST), `/api/messages/conversations/{userId}`
- **Admin**: `/api/admin/{pending-verifications, pending-properties, disputes, ...}`
- **Misc**: `/api/healthz`

## Phase 1 — Foundation (replace Vite scaffolding)

1. **Rewrite [package.json](package.json)** — Add `next` (~15.x), `react`, `react-dom` are already at the right versions. Remove: `vite`, `@vitejs/plugin-react`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`, `@replit/vite-plugin-runtime-error-modal`, `wouter`. Add: `next`, `drizzle-orm`, `drizzle-kit`, `postgres`, `bcryptjs`, `jsonwebtoken`, `zod` (already present). Update scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"db:push": "drizzle-kit push"`, `"db:generate": "drizzle-kit generate"`, `"typecheck": "tsc -p tsconfig.json --noEmit"`.
2. **Rewrite [tsconfig.json](tsconfig.json)** — Next.js standard: `jsx: "preserve"`, `module: "esnext"`, `moduleResolution: "bundler"`, `incremental: true`, `plugins: [{name: "next"}]`, `paths: { "@/*": ["./src/*"] }`. Drop the `references` block.
3. **Create [next.config.ts](next.config.ts)** — minimal: `experimental: { /* nothing yet */ }`. Tailwind handled via PostCSS (not `@tailwindcss/vite`).
4. **Replace [vite.config.ts](vite.config.ts)** with PostCSS config `[postcss.config.mjs](postcss.config.mjs)` using `@tailwindcss/postcss` (Tailwind v4). Drop `BASE_PATH`/`PORT` Replit requirements.
5. **Move/rename [src/index.css](src/index.css)** → [src/app/globals.css](src/app/globals.css) (Tailwind v4 conventions).
6. **Delete**: [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx), [index.html](index.html). Public assets stay in [public/](public/).

## Phase 2 — App Router scaffold

7. **Create [src/app/layout.tsx](src/app/layout.tsx)** — root layout: `<html lang="en"><body>`, fonts (Inter from Google Fonts via `next/font`), `<Toaster>`, `<TooltipProvider>`, `<QueryClientProvider>`, `<GoogleOAuthProvider>`. Mark with `'use client'` only at the inner provider wrapper, not the layout itself (so `<html>/<body>` is server-rendered).
8. **Create [src/components/providers.tsx](src/components/providers.tsx)** — `'use client'` component hosting `QueryClientProvider` + `GoogleOAuthProvider` + the `TooltipProvider` and `Toaster`. Reads `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
9. **Page routes** (each as `'use client'` because they all use hooks/state/effects):
   - [src/app/page.tsx](src/app/page.tsx) ← [src/pages/home.tsx](src/pages/home.tsx)
   - [src/app/register/page.tsx](src/app/register/page.tsx) ← [src/pages/register.tsx](src/pages/register.tsx)
   - [src/app/login/page.tsx](src/app/login/page.tsx) ← [src/pages/login.tsx](src/pages/login.tsx)
   - [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) ← [src/pages/dashboard.tsx](src/pages/dashboard.tsx)
   - [src/app/properties/page.tsx](src/app/properties/page.tsx) ← [src/pages/properties.tsx](src/pages/properties.tsx)
   - [src/app/properties/new/page.tsx](src/app/properties/new/page.tsx) ← [src/pages/list-property.tsx](src/pages/list-property.tsx)
   - [src/app/properties/[id]/page.tsx](src/app/properties/[id]/page.tsx) ← [src/pages/property-detail.tsx](src/pages/property-detail.tsx)
   - [src/app/bookings/[id]/page.tsx](src/app/bookings/[id]/page.tsx) ← [src/pages/booking.tsx](src/pages/booking.tsx)
   - [src/app/messages/page.tsx](src/app/messages/page.tsx) ← [src/pages/messages.tsx](src/pages/messages.tsx) (handles both `/messages` and `/messages/[userId]` via optional catch-all)
   - [src/app/messages/[userId]/page.tsx](src/app/messages/[userId]/page.tsx) — thin re-export of the same component
   - [src/app/admin/page.tsx](src/app/admin/page.tsx) ← [src/pages/admin.tsx](src/pages/admin.tsx)
   - [src/app/kyc/page.tsx](src/app/kyc/page.tsx) ← [src/pages/kyc.tsx](src/pages/kyc.tsx)
   - [src/app/not-found.tsx](src/app/not-found.tsx) ← [src/pages/not-found.tsx](src/pages/not-found.tsx)
10. **Mechanical replacements** across the migrated pages/components:
    - `from "wouter"` → `from "next/navigation"` (or `next/link`)
    - `useLocation()` → `usePathname()` + `useRouter()` (`router.push()` in place of `setLocation()`)
    - `useParams()` → `useParams()` from `next/navigation` (same name, returns `Record<string, string | string[]>`; pages may need a small type cast)
    - `useSearch()` → `useSearchParams()`
    - `<Link to=...>` → `<Link href=...>`
    - `import.meta.env.VITE_GOOGLE_CLIENT_ID` → `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`
    - `import.meta.env.BASE_URL.replace(/\/$/, "")` → drop the prefix, use a hardcoded `/api` or `""` (Next.js handles basePath via config)
11. **Keep [src/components/](src/components/) and [src/hooks/](src/hooks/) as-is**, but mark `NavBar.tsx` and `PropertyCard.tsx` as `'use client'` (they use hooks/effects).

## Phase 3 — Backend (Drizzle + Postgres route handlers)

12. **Add database layer** ([src/lib/db/index.ts](src/lib/db/index.ts)) — Drizzle client over `postgres` driver. Connection string from `process.env.DATABASE_URL`. Single shared client per process.
13. **Add Drizzle schema** ([src/lib/db/schema.ts](src/lib/db/schema.ts)) — port table definitions from git HEAD `lib/db/src/schema/`: `users`, `properties`, `property_photos`, `bookings`, `disputes`, `messages`, `ratings`, `trust_scores`, `audit_log`. Use `drizzle-orm/pg-core`. Field shapes match `src/api/generated/api.schemas.ts` so route handlers return JSON the client already expects.
14. **Add [drizzle.config.ts](drizzle.config.ts)** pointing at `src/lib/db/schema.ts`, with `out: "drizzle"`.
15. **Add auth helpers** ([src/lib/auth.ts](src/lib/auth.ts)) — `signToken(payload)`, `verifyToken(token)`, `requireAuth(req)` (returns user or throws 401). Uses `jsonwebtoken`. Reads `JWT_SECRET` from env. `setAuthCookie` / `clearAuthCookie` are unused (we keep localStorage, not cookies).
16. **Migration script** ([src/lib/db/migrate.ts](src/lib/db/migrate.ts)) — minimal `drizzle-orm/postgres-js/migrator` runner.
17. **Add env file** — [.env.example](.env.example) with: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` (if needed by the OAuth flow).
18. **Route handlers** ([src/app/api/](src/app/api/)). Each file exports `GET`/`POST`/etc. functions. Use Zod schemas from [src/api/generated/api.schemas.ts](src/api/generated/api.schemas.ts) for body validation. Pull from the Drizzle schema in handlers.
    - **Auth** — `/auth/{register,login,google,kyc}/route.ts` (POST). `/login` returns JWT + user; `/register` same.
    - **Users** — `/users/me/route.ts` (GET), `/users/[id]/route.ts` (GET, PUT), `/users/[id]/trust-score/route.ts` (GET).
    - **Properties** — `/properties/route.ts` (GET, POST), `/properties/me/route.ts` (GET), `/properties/[id]/route.ts` (GET, PUT, DELETE), `/properties/[id]/photos/route.ts` (POST → writes to `/public/uploads/<uuid>` and returns URL), `/properties/[id]/publish/route.ts` (POST).
    - **Bookings** — `/bookings/route.ts` (GET, POST), `/bookings/[id]/route.ts` (GET), `/bookings/[id]/confirm/route.ts` (POST), `/bookings/[id]/dispute/route.ts` (POST).
    - **Ratings** — `/ratings/route.ts` (GET, POST).
    - **Disputes** — `/disputes/route.ts` (GET), `/disputes/[id]/route.ts` (GET), `/disputes/[id]/adjudicate/route.ts` (POST).
    - **Messages** — `/messages/conversations/route.ts` (GET), `/messages/route.ts` (POST), `/messages/conversations/[userId]/route.ts` (GET).
    - **Admin** — `/admin/pending-verifications/route.ts` (GET), `/admin/pending-properties/route.ts` (GET), `/admin/disputes/route.ts` (GET). Approval/reject mutations on existing routes (`PATCH /api/users/[id]/verification`, etc.) — to be confirmed against the dashboard's exact use.
    - **Misc** — `/healthz/route.ts` (GET).
    - **Photo uploads** — `/api/upload/route.ts` (POST, multipart) → writes to `public/uploads/<uuid>.<ext>`, returns `{ url: "/uploads/<uuid>.<ext>" }`.
19. **Photo URLs** — store URL strings in DB; the public folder is served as static files by Next.js. No external storage needed for local dev.
20. **Wire [src/api/custom-fetch.ts](src/api/custom-fetch.ts)** — replace the `fetch(input, ...)` call. The current code already uses relative `/api/*` paths (look at line 73: `return \`/api/healthz\``), so the only adjustment is removing the `setBaseUrl` requirement (it's a no-op since pages are served from same origin now). No code change needed beyond removing `setBaseUrl` calls if any.

## Phase 4 — Cleanup and integration

21. **Delete**:
    - [src/main.tsx](src/main.tsx) (logic absorbed into [src/components/providers.tsx](src/components/providers.tsx))
    - [src/App.tsx](src/App.tsx) (logic absorbed into [src/app/layout.tsx](src/app/layout.tsx))
    - [index.html](index.html) (Next.js provides the shell)
    - [vite.config.ts](vite.config.ts)
    - Old [src/pages/](src/pages/) directory once migration to [src/app/](src/app/) is verified
22. **Update package.json**: drop Vite plugins, drop wouter. Scripts: `"dev": "next dev"`, `"build": "next build"`, `"start": "next start"`, `"typecheck": "tsc -p tsconfig.json --noEmit"`, `"db:generate": "drizzle-kit generate"`, `"db:migrate": "tsx src/lib/db/migrate.ts"`, `"db:push": "drizzle-kit push"`.
23. **Update [next.config.ts](next.config.ts)** to disable the `eslint` build ignore for the dev cycle, and add `experimental.serverActions: { allowedOrigins: [...] }` if we use server actions later.

## Verification

- `npm install` succeeds.
- `npm run typecheck` (passes; `'use client'` boundaries enforce server/client separation; lint via `next lint`).
- `npm run dev` brings up Next.js on `http://localhost:3000`.
- DB ready: `docker run --rm -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16` then `DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres npm run db:push` to create tables.
- Smoke walk through each page: load `/`, log in (need a seeded user), list properties, view detail, send a message, open admin as escrow_officer, etc. Each verifies that the corresponding route handler returns data and the React Query hook consumes it.
- `npm run build` produces a `.next/` build with no errors.

## Critical files to create/modify

- **Modify**: [package.json](package.json), [tsconfig.json](tsconfig.json), [next.config.ts](next.config.ts) (new), [postcss.config.mjs](postcss.config.mjs) (new), [src/index.css](src/index.css) → [src/app/globals.css](src/app/globals.css)
- **Delete**: [src/main.tsx](src/main.tsx), [src/App.tsx](src/App.tsx), [index.html](index.html), [vite.config.ts](vite.config.ts), [src/pages/](src/pages/) (after migration)
- **New**:
  - [src/app/layout.tsx](src/app/layout.tsx), [src/app/not-found.tsx](src/app/not-found.tsx)
  - [src/components/providers.tsx](src/components/providers.tsx)
  - [src/lib/db/index.ts](src/lib/db/index.ts), [src/lib/db/schema.ts](src/lib/db/schema.ts), [src/lib/db/migrate.ts](src/lib/db/migrate.ts), [src/lib/auth.ts](src/lib/auth.ts)
  - [src/app/api/**/route.ts](src/app/api/) (one per endpoint group above)
  - [.env.example](.env.example), [drizzle.config.ts](drizzle.config.ts)
- **Migrate from src/pages/ to src/app/**: 12 page files plus the wouter/import.meta.env mechanical rewrites

## Out of scope (explicit non-goals)

- **No trust-score recomputation** — the field is exposed via `/api/users/{id}/trust-score` as a derived value but the algorithm is complex; the route will return a stub based on ratings count until we know the original formula.
- **No Stripe escrow integration** — bookings accept a `payment_method` but the actual charge flow is stubbed (we'll log it and mark the booking as "paid").
- **No KYC document verification** — `/api/auth/kyc` accepts document URLs and flips a flag; no IDV third-party call.
- **No production hardening** — rate limiting, request logging, input sanitization beyond Zod, CORS, CSP headers, etc. are deferred.
- **No Postgres migration seeding** — we'll add a `scripts/seed.ts` only after core wiring works.
- **Email/SMS notifications** — none of the original backend's email triggers are reimplemented.

## Open questions to resolve during/after Phase 1 (small, in-flight)

- **DATABASE_URL**: confirm whether you want local Docker Postgres (recommended) or a hosted dev DB. The plan assumes local Docker; swap is one env var.
- **`JWT_SECRET`**: any value works for dev; I'll add a checked-in default in `.env.example` and `gitignore` `.env.local`.
