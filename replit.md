# NAUB Home Finder

A property marketplace for NAUB university students to find safe, verified housing near campus. Students can register, landlords can list properties, and an escrow system protects payments.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/naub-home-finder run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite (wouter routing, Tailwind v4, shadcn/ui)
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Auth: JWT (jsonwebtoken) + bcryptjs password hashing
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/naub-home-finder/` — React + Vite frontend
- `artifacts/api-server/` — Express API server
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod validation schemas
- `lib/db/src/schema/users.ts` — users table schema

## Architecture decisions

- Migrated from Next.js (Vercel) → Vite + React (Replit pnpm monorepo)
- API routes converted from Next.js API routes / separate Express app → unified `artifacts/api-server` 
- Used `bcryptjs` (pure JS) instead of `bcrypt` (native addon) to avoid Replit build script restrictions
- JWT stored in localStorage under key `naub_token` after login/register
- DB schema defined in Drizzle ORM (lib/db), not raw SQL

## Product

- Landing page with value proposition for NAUB students
- User registration with role selection: student, landlord, agent, escrow_officer
- Students can optionally provide their matriculation number for faster verification
- JWT-authenticated login/register flow
- Dashboard showing user info, role, and verification status

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Don't use `pnpm dev` at workspace root — run workflows individually or via Replit workflow runner
- After any OpenAPI spec change, re-run `pnpm --filter @workspace/api-spec run codegen`
- `bcrypt` native addon is blocked by Replit build scripts — use `bcryptjs` instead
- CSS variables in `index.css` start as `red` placeholder — must be replaced before building components

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
