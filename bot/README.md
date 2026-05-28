# 7DOGS Lucky Wheel Bot

Telegram bot for the 7DOGS lucky wheel game. Users spin to win coins and prizes.

---

## Features

| Command | Description |
|---|---|
| `/start` | Register + welcome message |
| `/balance` | Show coin balance |
| `/spin` | Spend 10 coins, spin the wheel |
| `/prizes` | List all prizes and probabilities |
| `/withdraw [prize]` | Request a prize withdrawal |
| `/addcoins [id] [amount]` | *(Admin)* Add coins to a user |
| `/pending` | *(Admin)* List pending withdrawals |

---

## VPS Setup

### 1. Server requirements

- Ubuntu 20.04+ (or any Linux)
- Node.js 18+
- A domain with HTTPS (Nginx + Certbot recommended)

### 2. Install Node.js 18

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone / upload the bot

```bash
# Upload the bot/ folder to your server, then:
cd /opt/7dogs-bot
npm install
```

### 4. Create the database

Run the migration on your PostgreSQL database (Neon, Supabase, Railway, etc.):

```bash
psql "$DATABASE_URL" -f migrations/001_init.sql
```

Or paste the contents of `migrations/001_init.sql` into the Neon/Supabase SQL editor.

### 5. Configure environment

```bash
cp .env.example .env
nano .env
```

Fill in:

```env
BOT_TOKEN=your_bot_token
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
WEBHOOK_URL=https://yourdomain.com
PORT=3000
ADMIN_ID=your_telegram_id
```

### 6. Configure Nginx reverse proxy

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 7. Get SSL certificate

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

### 8. Start the bot

```bash
npm start
```

### 9. Run as a service (keep alive after reboot)

```bash
sudo nano /etc/systemd/system/7dogs-bot.service
```

Paste:

```ini
[Unit]
Description=7DOGS Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/7dogs-bot
ExecStart=/usr/bin/node src/bot.js
Restart=on-failure
RestartSec=5
EnvironmentFile=/opt/7dogs-bot/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable 7dogs-bot
sudo systemctl start 7dogs-bot
sudo systemctl status 7dogs-bot
```

### Check logs

```bash
sudo journalctl -u 7dogs-bot -f
```

---

## Database schema

See `migrations/001_init.sql` — creates these tables:

- **users** — telegram_id, username, coins balance
- **prizes** — name, value, probability weights
- **spins** — history of every spin
- **withdrawals** — withdrawal requests with status

---

## Customising prizes

Edit the prizes directly in the database:

```sql
-- Update a prize probability
UPDATE prizes SET probability = 0.05 WHERE name LIKE '%Gold%';

-- Add a new prize
INSERT INTO prizes (name, value, probability) VALUES ('🚀 Mega Jackpot', 1000, 0.005);
```

> ⚠️ Keep the sum of all `probability` values equal to **1.0**

---

## Development (run locally without a domain)

Use [ngrok](https://ngrok.com) to create a temporary HTTPS tunnel:

```bash
npm install -g ngrok
ngrok http 3000
# Copy the https:// URL into WEBHOOK_URL in your .env
npm start
```
