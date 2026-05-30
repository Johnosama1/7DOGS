# 7DOGS Bot — Vercel Serverless

Telegram bot for the 7DOGS lucky wheel app.  
Runs as Vercel serverless functions — no server, no polling, no keep-alive.

## Project structure

```
bot/
├── api/
│   ├── webhook.js   ← receives all Telegram updates
│   └── setup.js     ← registers webhook with Telegram (run once)
├── migrations/
│   └── 001_init.sql ← run once on your Postgres database
├── vercel.json
├── package.json
└── .env.example
```

## Deploy to Vercel

### 1. Import on Vercel

Go to https://vercel.com → New Project → import your GitHub repo.  
If the `bot/` folder is inside a bigger repo, set **Root Directory** to `bot` in the Vercel project settings.

### 2. Set environment variables on Vercel dashboard

```
BOT_TOKEN=<your telegram bot token from @BotFather>
DATABASE_URL=<your Neon / Postgres connection string>
ADMIN_ID=<your Telegram user ID — number only>
```

### 3. Run the database migration (once)

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

Or paste the contents of `migrations/001_init.sql` into the Neon / Supabase SQL editor.

### 4. Register the webhook (once after deploy)

Open this URL in your browser **once** after Vercel finishes deploying:

```
https://YOUR-PROJECT.vercel.app/api/setup
```

Expected response:

```json
{
  "ok": true,
  "webhook_set_to": "https://YOUR-PROJECT.vercel.app/api/webhook",
  "telegram_confirmed": "https://YOUR-PROJECT.vercel.app/api/webhook"
}
```

That's it — the bot is live.

---

## Bot commands

| Command | Who | Description |
|---------|-----|-------------|
| `/start` | Everyone | Register + welcome message |
| `/balance` | Everyone | Show coin balance |
| `/spin` | Everyone | Spin the wheel (costs 10 coins) |
| `/prizes` | Everyone | List all prizes and odds |
| `/withdraw [prize]` | Everyone | Request a withdrawal |
| `/addcoins [id] [amount]` | Admin only | Add coins to a user |
| `/pending` | Admin only | List pending withdrawal requests |

## Prize pool (default)

| Prize | Coins | Chance |
|-------|-------|--------|
| 💎 Diamond Jackpot | 500 | 1% |
| 🥇 Gold Prize | 200 | 4% |
| 🥈 Silver Prize | 100 | 10% |
| 🎁 Bonus Coins | 50 | 20% |
| 🎀 Small Reward | 20 | 30% |
| 🔄 Try Again | 0 | 35% |

## Customising prizes

Edit directly in the database:

```sql
UPDATE bot_prizes SET probability = 0.05 WHERE name LIKE '%Gold%';

INSERT INTO bot_prizes (name, value, probability) VALUES ('🚀 Mega Jackpot', 1000, 0.005);
```

> ⚠️ Keep the sum of all `probability` values equal to **1.0**
