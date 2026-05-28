# 7DOGS Mini App

A production-ready Telegram Mini App reward bot where users spin a luxury wheel, collect 7DOGS Coins, earn referral rewards, and redeem exclusive gifts — all wrapped in a premium black + gold casino aesthetic.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/7dogs run dev` — run the frontend (port 23860)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Required env: `ADMIN_PASSWORD` — Admin panel password (defaults to "admin123" in dev)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all API contracts)
- `lib/db/src/schema/` — Drizzle DB schema (users, wheel, gifts, referrals, settings)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/7dogs/src/` — React frontend (pages, components, context)
- `lib/api-client-react/src/generated/` — Generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — Generated Zod schemas for server (do not edit)

## Architecture decisions

- Contract-first API: all types flow from `openapi.yaml` → codegen → typed hooks + Zod validators
- Admin auth uses server-side token (in-memory set, 24h TTL) — no JWT library needed for this use case
- Admin panel only visible to users with username `J_O_H_N8` (or `demo_user` in dev mode)
- Referral reward logic: every N referrals (configurable) = reward for referrer, checked on new user join
- Weighted random spin: segment probabilities are relative weights, not fixed percentages

## Product

- **Wheel** — Animated SVG spin wheel with 9 reward segments (coins, spins, gifts). 1 free spin on signup.
- **Referrals** — Unique referral links (`https://t.me/BOT?start=USERID`), auto-counted, reward on milestone
- **Gifts** — Coin-priced gift shop with optional stock limits; disabled gifts show COMING SOON badge
- **Account** — User profile with total coins, spins, referrals; links to gift redemption
- **Admin Panel** — Password-gated owner dashboard for managing wheel, gifts, balances, settings, maintenance mode

## User preferences

- Owner admin username: `@J_O_H_N8` (only this user sees Admin tab)
- Premium black + gold luxury casino/crypto aesthetic throughout
- Mobile-first (375px) with bottom tab navigation

## Gotchas

- After changing `openapi.yaml`, always run codegen before touching frontend/backend
- Wheel segments must exist in the DB before the wheel renders — seed them if empty
- Admin token is in-memory only — server restarts clear all admin sessions
- `pnpm --filter @workspace/db run push-force` if schema push fails with column conflicts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
