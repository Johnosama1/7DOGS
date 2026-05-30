# 7DOGS Lucky Wheel

A Telegram Mini App for the 7DOGS community — spin the lucky wheel to win coins and gifts, invite friends for free spins, and redeem exclusive rewards.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `BOT_TOKEN` — Telegram bot token (needed for webhook, channel membership checks, and broadcasts)
- Optional env: `ADMIN_PASSWORD` — Admin panel password (default: `admin123`)
- Optional env: `TOKEN_SECRET` — HMAC secret for admin tokens (default: `7dogs-admin-secret-key`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React, Tailwind CSS v4, wouter (routing), Tanstack Query
- API: Express 5 + Drizzle ORM + PostgreSQL
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/7dogs/` — Vite+React frontend (Telegram Mini App)
- `artifacts/7dogs/src/index.css` — Theme (dark gold luxury palette)
- `artifacts/7dogs/src/pages/` — wheel, referrals, gifts, account, my-gifts, admin, not-found
- `artifacts/7dogs/src/components/` — UI components, wheel, layout, admin panels
- `artifacts/api-server/src/routes/` — Express routes: users, wheel, gifts, referrals, settings, admin, channels, telegram
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `lib/db/src/schema/` — Drizzle table definitions (users, wheel, gifts, referrals, settings, channels)
- `bot/` — Standalone Telegram bot (Telegraf, runs separately via polling or webhook)

## Architecture decisions

- The Telegram bot (`bot/`) is intentionally separate from the API server — it runs as a standalone process. Webhook registration is done manually via `POST /api/telegram/set-webhook` after deploy.
- Admin auth uses a deterministic HMAC token derived from `ADMIN_PASSWORD` + `TOKEN_SECRET`, so tokens survive server restarts without a database session.
- The frontend detects Telegram context via `window.Telegram.WebApp` injected by the SDK loaded in `index.html`.
- Channel gate checks (`/api/channels/check`) fall through to `true` in dev if `BOT_TOKEN` is not set, so local development works without a real bot.

## Product

- **Spin Wheel**: Users earn daily spins, spin to win coins, bonus spins, or gifts
- **Referrals**: Invite friends via unique link; earn bonus spins after N referrals
- **Gifts Shop**: Redeem coins for exclusive luxury gifts
- **Admin Panel**: Password-protected admin UI for managing users, segments, gifts, settings, channels, and broadcast messages
- **Channel Gate**: Requires users to join configured Telegram channels before using the app
- **Welcome Screen**: First-time onboarding splash shown once per device

## Gotchas

- Run `pnpm --filter @workspace/api-spec run codegen` after any OpenAPI spec change — the generated hooks and Zod schemas are both used by the frontend and backend
- The OpenAPI inline body collision fix: `adminToggleChannel` uses `ChannelToggle` schema (not inline) to avoid TS2308 export collision
- `BOT_TOKEN` must be set for channel membership checks to work in production

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
