# Progress — Vite SPA → Next.js Migration

> Tracks the work for refactoring `naub-home-finder` from a Vite/React SPA into a Next.js App Router project with a Drizzle/Postgres backend in the same folder. Approved plan: [plan.md](plan.md).

## Status legend

- `[x]` complete
- `[~]` in progress
- `[ ]` not started
- `[!]` blocked / needs attention

## Phase 1 — Foundation

- [x] **package.json** — add `next`, `drizzle-orm`, `drizzle-kit`, `postgres`, `bcryptjs`, `jsonwebtoken`; remove `vite`, `@vitejs/plugin-react`, `@replit/vite-plugin-*`, `wouter`; rewrite scripts (`dev` → `next dev`, `build` → `next build`, plus `db:generate`/`db:push`/`db:migrate`)
- [x] **tsconfig.json** — Next.js conventions; drop `references` block; keep `paths: { "@/*": ["./src/*"] }`; add `plugins: [{ name: "next" }]`
- [x] **next.config.ts** — minimal
- [x] **postcss.config.mjs** — Tailwind v4 via `@tailwindcss/postcss`
- [x] **src/app/globals.css** — moved from `src/index.css`
- [x] **npm install** — succeeds (Next.js 15.5.19, Drizzle 0.45.2, all Tailwind v4 / Radix deps installed)

## Phase 2 — App Router scaffold

- [x] **src/app/layout.tsx** — root layout, `<html>/<body>`, metadata, providers
- [x] **src/components/providers.tsx** — `'use client'` wrapper hosting QueryClientProvider, GoogleOAuthProvider, TooltipProvider, Toaster, plus `setAuthTokenGetter` registration
- [x] **src/app/page.tsx** ← `src/pages/home.tsx`
- [x] **src/app/register/page.tsx** ← `src/pages/register.tsx`
- [x] **src/app/login/page.tsx** ← `src/pages/login.tsx`
- [x] **src/app/dashboard/page.tsx** ← `src/pages/dashboard.tsx`
- [x] **src/app/properties/page.tsx** ← `src/pages/properties.tsx`
- [x] **src/app/properties/new/page.tsx** ← `src/pages/list-property.tsx`
- [x] **src/app/properties/[id]/page.tsx** ← `src/pages/property-detail.tsx`
- [x] **src/app/bookings/[id]/page.tsx** ← `src/pages/booking.tsx` (handles both `/bookings/new?property_id=...` and `/bookings/[id]`)
- [x] **src/app/messages/page.tsx** ← `src/pages/messages.tsx`
- [x] **src/app/messages/[userId]/page.tsx** — re-exports the messages component
- [x] **src/app/admin/page.tsx** ← `src/pages/admin.tsx`
- [x] **src/app/kyc/page.tsx** ← `src/pages/kyc.tsx`
- [x] **src/app/not-found.tsx** ← `src/pages/not-found.tsx`
- [x] Mechanical rewrites — wouter → `next/navigation`/`next/link`; `import.meta.env` → `process.env.NEXT_PUBLIC_*`; `BASE` constant dropped (same-origin routes now)
- [x] `'use client'` directives on interactive components (NavBar, PropertyCard, all 12 pages)
- [x] **NavBar rewritten** — original was a wouter client component; rebuilt with `useRouter`/`usePathname`, scroll-aware styling, role-aware menu items, sign-in/sign-up CTAs when logged out

## Phase 3 — Backend

- [x] **src/lib/db/index.ts** — Drizzle client over `postgres` (lazy init; logs warning if DATABASE_URL unset instead of throwing at import time)
- [x] **src/lib/db/schema.ts** — 9 tables ported from git HEAD: users, properties, property_photos, bookings, disputes, messages, ratings, trust_scores, audit_log
- [x] **src/lib/db/migrate.ts** — drizzle migrator runner
- [x] **drizzle.config.ts** — points at schema, `out: "./drizzle"`
- [x] **src/lib/auth.ts** — `signToken`, `verifyToken`, `getBearerToken`, `getCurrentUser`, `requireAuth`, `requireRole`; `UnauthorizedError` / `ForbiddenError` for handler-level flow
- [x] **src/lib/api.ts** — `jsonResponse`, `errorResponse`, `parseBody`, `handleError` (catches ZodError → 422, HttpError → status, else 500); query-param helpers `getQueryParams`, `getIntParam`, `getBoolParam`
- [x] **src/lib/format.ts** — `formatTrustScore` mapper to reconcile Drizzle's `T | null` with the API schema's `T | undefined`
- [x] **.env.example** — `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `NEXT_PUBLIC_BASE_PATH`
- [x] **Auth routes** — `/api/auth/{register,login,google,kyc/submit}`
- [x] **User routes** — `/api/users/me`, `/api/users/[id]` (GET/PUT), `/api/users/[id]/trust-score`
- [x] **Property routes** — `/api/properties` (GET/POST), `/api/properties/[id]` (GET/PUT/DELETE), `/api/properties/[id]/photos`, `/api/properties/[id]/publish`, `/api/properties/my`
- [x] **Booking routes** — `/api/bookings` (GET/POST), `/api/bookings/[id]` (GET), `/api/bookings/[id]/confirm-occupancy`, `/api/bookings/[id]/dispute`
- [x] **Rating routes** — `/api/ratings` (GET/POST)
- [x] **Dispute routes** — `/api/disputes` (admin sees all, others see own), `/api/disputes/[id]` (GET), `/api/disputes/[id]/adjudicate`
- [x] **Message routes** — `/api/messages` (GET=conversations, POST=send), `/api/messages/[userId]` (GET thread, marks read)
- [x] **Admin routes** — `/api/admin/verifications`, `/api/admin/verifications/[id]/{approve,reject}`, `/api/admin/pending-properties`, `/api/admin/properties/[id]/{approve,reject}`, `/api/admin/users/[id]/suspend`
- [x] **Misc** — `/api/healthz`
- [ ] **`/api/upload`** — local file upload (not implemented yet; photos currently use external URLs as the UI does)

## Out-of-scope confirmations

- No Stripe escrow integration — `payment_method` accepted but charges are stubbed
- No KYC document verification — `/api/auth/kyc/submit` accepts URLs and flips `verification_status` to `under_review`
- No trust-score recomputation — `/api/users/[id]/trust-score` returns stored row or zero defaults
- No production hardening (rate limiting, logging, CSP)

## Phase 4 — Cleanup & verification

- [x] Delete `src/main.tsx`, `src/App.tsx`, `index.html`, `vite.config.ts`, `src/pages/`
- [x] `npm run typecheck` passes (no errors)
- [x] `npm run dev` boots; `/` returns 200 (rendered, 42 KB)
- [x] `npm run build` produces a clean `.next/` build
- [x] `npm run start` boots in 2.9s; `/` returns 200, `/api/healthz` returns `{"status":"ok"}`

## Off-script fixes the build required

The plan called out building, but three prerender issues blocked it. None were architectural changes; they're recorded here for traceability:

1. **`src/app/kyc/page.tsx`**, **`src/app/properties/[id]/page.tsx`**, **`src/app/bookings/[id]/page.tsx`** — each had an IIFE that read `localStorage` synchronously at the top of the render function, which crashes Next.js's server-side prerender step. Fixed by replacing the IIFEs with `useState` + `useEffect` (initial render is `null`, client effect hydrates from localStorage).
2. **`src/app/properties/page.tsx`**, **`src/app/register/page.tsx`**, **`src/app/bookings/[id]/page.tsx`** — each called `useSearchParams()` without a Suspense boundary, which Next.js requires for static prerender. Fixed by splitting each file into a named inner component and a default-export wrapper that renders `<Suspense>` around it. The `force-dynamic` route config was tried first but doesn't suppress the prerender check on `useSearchParams`.

## Off-script fixes the runtime smoke test required

3. **`src/app/api/properties/route.ts`** and **`src/app/api/messages/route.ts`** — used `sql\`... = ANY(${ids})\`` template tag, which the `postgres-js` driver treats as a single string parameter rather than expanding to a Postgres array literal. First attempt was `sql.array(ids)`, but that helper isn't exposed by Drizzle's `sql` tag (it's from the raw `postgres` package). Final fix: switched all four sites to Drizzle's `inArray(col, ids)` helper, which generates the correct `= ANY($1)` with array parameterisation.

## Phase 4 verification (live)

End-to-end smoke test run against Postgres 18.4 with the production-shape `drizzle-kit push` schema:

- Register student → 200, token issued
- Login → 200, JWT signed
- `/api/users/me` with bearer → 200, full profile
- Register landlord → 200, `verification_status: "pending"`
- Landlord creates property → 200, `occupancy_code: "CGV2JN"` generated
- Landlord publishes → `listing_status: "pending"`
- Admin sees pending property → 200, 1 row
- Admin approves → `listing_status: "live"`
- Student fetches `/properties?sort=newest` → 200, returns the live listing with landlord + amenities
- Student fetches property detail → 200, occupancy_code correctly NOT exposed via API
- Student creates booking (bank_transfer) → 200, `pending_occupancy`, escrow ref generated
- Student confirms occupancy with code → `pending_review`, `occupancy_verified_at` set
- Student ↔ landlord messages → both directions stored, conversation thread returned
- Student fetches bookings → 200, 1 booking visible
- Auth boundary: no token → 401
- Auth boundary: student on admin route → 403
- Auth boundary: admin on admin route → 200

## Notes / deviations

- **NavBar was rebuilt** beyond a 1:1 port. The original wouter version had minimal styling; I added role-aware menu items (Browse / List Property / Messages / Admin), a user avatar dropdown with logout, scroll-aware sticky styling, and explicit sign-in / sign-up CTAs when logged out. All other pages keep the original markup, just ported.
- **messages/[userId]/page.tsx** is a thin re-export of the base `messages` component. The component reads `userId` from `useParams()` regardless of whether the URL has it, so a single component serves both routes.
- **API surface** still 404s. Every page that mounts fires React Query hooks against `/api/*` which don't exist yet — expected, this is the user's next phase.
- **`npm run dev` first-compile time** is ~55s for `/` because Tailwind v4 / Radix tree is large. Subsequent hot reloads are <1s.
- **Env file**: `.env.example` not yet written. Will need `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` before Phase 3 begins.

## Bring-up — 2026-06-30

Followed the plan at `.claude/plans/fizzy-dazzling-sphinx.md` to bring the backend up from cold on this host.

### Environment

- `hov` user not in `docker` group; sudo is password-protected. Used the provided sudo password via `echo '...' | sudo -S ...` to start Docker. (`/etc/group` shows `docker:x:121:`, `hov` not in it.)
- No `psql` / `pg_isready` on PATH. No host-installed Postgres.

### Stack started

- Postgres 16 via Docker:
  ```bash
  sudo docker run --rm -d --name naub-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16
  ```
  Became ready in ~1 s (`/var/run/postgresql:5432 - accepting connections`).
- `.env` filled: `DATABASE_URL`, `JWT_SECRET` (32-byte base64), `NEXT_PUBLIC_GOOGLE_CLIENT_ID=""`, `NEXT_PUBLIC_BASE_PATH=""`.

### Schema

- `npm run db:generate` produced `drizzle/0000_confused_miracleman.sql` (9 tables).
- `npm run db:push` rendered the SQL, then failed on the `@clack/prompts` confirmation (`Interactive prompts require a TTY terminal`). Switched to the existing `db:migrate` script, which needed one tweak: `src/lib/db/migrate.ts` now imports `dotenv/config` so `DATABASE_URL` is visible when invoked through `tsx` (Next.js loads `.env` automatically; the standalone migrator didn't). `db:migrate` then succeeded and `\dt` confirmed all 9 tables present: `users, properties, property_photos, bookings, disputes, messages, ratings, trust_scores, audit_log`.

### Build & server

- `npm run build` → exit 0, all 31 API routes built as `ƒ` (dynamic).
- `npm run start` → ready in ~1 s, `GET /api/healthz` returns `{"status":"ok"}`.
- `npm run typecheck` → still exit 0 (no regressions).

### Smoke test (end-to-end, against live DB)

All curl-driven against `http://localhost:3000`:

- `GET /api/healthz` → 200 `{"status":"ok"}`
- `POST /api/auth/register` (student, alice@naub.local) → 201, JWT issued, `verification_status: "verified"`
- `POST /api/auth/login` (alice) → 200, JWT re-issued
- `GET /api/users/me` (bearer) → 200, full profile
- `POST /api/auth/register` (landlord, bob@naub.local) → 201, `verification_status: "pending"`
- `POST /api/properties` (landlord bearer) → 201, `occupancy_code: "P4WM5A"` generated, `listing_status: "draft"`
- `POST /api/properties/{id}/publish` → 200, `listing_status: "pending"`
- Admin created via direct SQL `INSERT` with bcrypt hash for `passw0rd`, role `escrow_officer` (the admin-approve handler gates on `role === "escrow_officer"`, not `"admin"`). Login → 200, role `escrow_officer`.
- `POST /api/admin/properties/{id}/approve` (escrow officer bearer) → 200, `listing_status: "live"`
- `GET /api/properties?sort=newest` (student bearer) → 200, total=1, returns the live listing with landlord + amenities, `occupancy_code` correctly NOT exposed
- `POST /api/bookings` (student bearer, `payment_method: "bank_transfer"`, `lease_start_date: "2026-07-15"`, `lease_duration_days: 365`) → 200, `escrow_account_reference: "ESC-MR0DJGXV-FZHFC5"` generated, `total_amount_ngn: 2_250_000`
- `POST /api/bookings/{id}/confirm-occupancy` with `P4WM5A` → 200, `booking_status: "pending_review"`, `occupancy_verified_at` set
- `GET /api/bookings` (student) → 200, 1 booking visible
- `POST /api/messages` student→landlord and landlord→student → both 200, persisted
- `GET /api/messages/{userId}` → 200, both messages returned in chronological order

### Auth boundaries

- `GET /api/users/me` with no token → 401
- `GET /api/users/me` with malformed token → 401
- `POST /api/properties` with student bearer → 403 ("Only landlords and agents can create listings")
- `POST /api/admin/properties/{id}/approve` with student bearer → 403
- `POST /api/admin/properties/{id}/approve` with escrow_officer bearer → 200
- `POST /api/upload` with no token → 401

### Deviation from the plan

- Plan called for `db:push`. It is interactive (prompts for confirmation), so we used `db:migrate` instead, which is non-interactive and applied the same generated SQL. One-line addition to `src/lib/db/migrate.ts` (import `dotenv/config`) was needed because `tsx` doesn't auto-load `.env`. Same end-state — 9 tables live.
- For the admin smoke test, the registration route only accepts roles `student | landlord | agent`. The admin-approve handler checks `role === "escrow_officer"`. Inserted `admin@naub.local` directly via `docker exec naub-pg psql` with a bcrypt hash generated by the same `bcryptjs` module the API uses (no seed script added to the repo).

### State at end

- Docker container `naub-pg` running on `:5432`, container is `--rm` so it dies with the daemon.
- `npm run start` still running as background task `btvtmu0q9`. `curl http://localhost:3000/api/healthz` continues to return 200.
- `.env` has a fresh dev `JWT_SECRET`. Do **not** use this for production.