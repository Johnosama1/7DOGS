"use strict";

const { Telegraf } = require("telegraf");
const { Client } = require("pg");

// ── DB helpers (single connection per request, serverless-safe) ───────────────

async function withDb(fn) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

const db = {
  async getOrCreateUser(telegramId, username) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO bot_users (telegram_id, username)
         VALUES ($1, $2)
         ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username
         RETURNING *`,
        [telegramId, username ?? null]
      );
      return rows[0];
    });
  },

  async getUserByTelegramId(telegramId) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM bot_users WHERE telegram_id = $1",
        [telegramId]
      );
      return rows[0] ?? null;
    });
  },

  async addCoins(telegramId, amount) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        `UPDATE bot_users SET coins = coins + $2
         WHERE telegram_id = $1 RETURNING *`,
        [telegramId, amount]
      );
      return rows[0] ?? null;
    });
  },

  async deductCoins(telegramId, amount) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        `UPDATE bot_users
         SET coins = GREATEST(0, coins - $2)
         WHERE telegram_id = $1 AND coins >= $2
         RETURNING *`,
        [telegramId, amount]
      );
      return rows[0] ?? null;
    });
  },

  async getAllPrizes() {
    return withDb(async (c) => {
      const { rows } = await c.query(
        "SELECT * FROM bot_prizes ORDER BY probability DESC"
      );
      return rows;
    });
  },

  pickPrize(prizes) {
    const rand = Math.random();
    let cumulative = 0;
    for (const prize of prizes) {
      cumulative += prize.probability;
      if (rand < cumulative) return prize;
    }
    return prizes[prizes.length - 1];
  },

  async recordSpin(telegramId, cost, prizeName, prizeValue) {
    return withDb(async (c) => {
      await c.query(
        `INSERT INTO bot_spins (user_id, cost, prize, prize_value)
         VALUES ($1, $2, $3, $4)`,
        [telegramId, cost, prizeName, prizeValue]
      );
    });
  },

  async createWithdrawal(telegramId, prize) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO bot_withdrawals (user_id, prize)
         VALUES ($1, $2) RETURNING *`,
        [telegramId, prize]
      );
      return rows[0];
    });
  },

  async getPendingWithdrawals(limit = 50) {
    return withDb(async (c) => {
      const { rows } = await c.query(
        `SELECT w.*, u.username
         FROM bot_withdrawals w
         JOIN bot_users u ON u.telegram_id = w.user_id
         WHERE w.status = 'pending'
         ORDER BY w.requested_at ASC
         LIMIT $1`,
        [limit]
      );
      return rows;
    });
  },
};

// ── Bot setup ─────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN;
const MINI_APP_URL = process.env.MINI_APP_URL ?? "";
const ADMIN_ID = parseInt(process.env.ADMIN_ID ?? "0", 10);
const SPIN_COST = 10;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN env var is required");

const bot = new Telegraf(BOT_TOKEN);

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// /start
bot.start(async (ctx) => {
  const from = ctx.from;
  await db.getOrCreateUser(from.id, from.username);
  const name = escapeHtml(from.first_name || from.username || "there");

  const extra = {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        MINI_APP_URL
          ? [{ text: "🎰 Open 7DOGS App", web_app: { url: MINI_APP_URL } }]
          : [],
      ].filter((row) => row.length > 0),
    },
  };

  await ctx.telegram.sendMessage(
    ctx.chat.id,
    `<tg-emoji emoji-id="5319007286004299794">👋</tg-emoji> Welcome to 7DOGS, ${name}!\n\n` +
    `<tg-emoji emoji-id="6129832240303051599">😀</tg-emoji> The fastest NFT earning bot!\n\n` +
    `<tg-emoji emoji-id="6131673419768403090">✨</tg-emoji> How to earn <tg-emoji emoji-id="5436113877181941026">❓</tg-emoji>\n\n` +
    `<tg-emoji emoji-id="6203840986443944067">🔤</tg-emoji> Invite friends <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> 1 free spin per 5 friends\n\n` +
    `<tg-emoji emoji-id="5104986024807760966">🎰</tg-emoji> Spin the wheel <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> win 50 to 1000!`,
    extra
  );
});

// /balance
bot.command("balance", async (ctx) => {
  const user = await db.getUserByTelegramId(ctx.from.id);
  if (!user) return ctx.reply("Please /start first.");
  await ctx.replyWithHTML(
    `💰 <b>Your Balance</b>\n\n` +
    `Coins: <b>${user.coins}</b>\n` +
    `Each spin costs <b>${SPIN_COST} coins</b>.`
  );
});

// /spin
bot.command("spin", async (ctx) => {
  const user = await db.getUserByTelegramId(ctx.from.id);
  if (!user) return ctx.reply("Please /start first.");

  if (user.coins < SPIN_COST) {
    return ctx.replyWithHTML(
      `❌ <b>Not enough coins!</b>\n\n` +
      `You need <b>${SPIN_COST} coins</b> to spin.\n` +
      `Your balance: <b>${user.coins} coins</b>`
    );
  }

  const updated = await db.deductCoins(ctx.from.id, SPIN_COST);
  if (!updated) return ctx.reply("Spin failed — not enough coins.");

  const prizes = await db.getAllPrizes();
  const won = db.pickPrize(prizes);

  let finalBalance = updated.coins;
  if (won.value > 0) {
    const withPrize = await db.addCoins(ctx.from.id, won.value);
    finalBalance = withPrize?.coins ?? finalBalance;
  }

  await db.recordSpin(ctx.from.id, SPIN_COST, won.name, won.value);

  const resultText =
    won.value > 0
      ? `🎉 <b>You won: ${escapeHtml(won.name)}!</b>\n+${won.value} coins added.`
      : `😔 <b>${escapeHtml(won.name)}</b> — Better luck next time!`;

  await ctx.replyWithHTML(
    `🎰 <b>Spinning the wheel...</b>\n\n` +
    `${resultText}\n\n` +
    `💰 Balance: <b>${finalBalance} coins</b>`
  );
});

// /prizes
bot.command("prizes", async (ctx) => {
  const prizes = await db.getAllPrizes();
  const lines = prizes.map((p) => {
    const pct = (p.probability * 100).toFixed(1);
    return `${escapeHtml(p.name)} — <b>${p.value} coins</b> (${pct}% chance)`;
  });
  await ctx.replyWithHTML(
    `🎡 <b>Prize Wheel</b>\n\n` +
    lines.join("\n") +
    `\n\nSpin with /spin (costs ${SPIN_COST} coins)`
  );
});

// /withdraw
bot.command("withdraw", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
  if (!args) {
    return ctx.replyWithHTML(
      `💸 <b>Withdraw a Prize</b>\n\n` +
      `Usage: <code>/withdraw [prize name or amount]</code>\n` +
      `Example: <code>/withdraw 200 coins</code>`
    );
  }

  const user = await db.getUserByTelegramId(ctx.from.id);
  if (!user) return ctx.reply("Please /start first.");

  const withdrawal = await db.createWithdrawal(ctx.from.id, args);

  await ctx.replyWithHTML(
    `✅ <b>Withdrawal Requested</b>\n\n` +
    `Prize: <b>${escapeHtml(args)}</b>\n` +
    `Status: <b>Pending</b>\n` +
    `Request ID: #${withdrawal.id}\n\n` +
    `An admin will process your request soon.`
  );

  if (ADMIN_ID) {
    const name = escapeHtml(ctx.from.first_name || ctx.from.username || "User");
    const username = ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`;
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📬 New withdrawal #${withdrawal.id}\nFrom: ${name} (${username})\nPrize: ${args}`
    ).catch(() => {});
  }
});

// /addcoins [user_id] [amount]  — admin only
bot.command("addcoins", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");

  const parts = ctx.message.text.split(" ");
  const targetId = parseInt(parts[1], 10);
  const amount = parseInt(parts[2], 10);

  if (!targetId || !amount || isNaN(targetId) || isNaN(amount)) {
    return ctx.replyWithHTML(
      `Usage: <code>/addcoins [telegram_user_id] [amount]</code>`
    );
  }

  const updated = await db.addCoins(targetId, amount);
  if (!updated) return ctx.reply(`❌ User ${targetId} not found. They must /start first.`);

  await ctx.replyWithHTML(
    `✅ Added <b>${amount} coins</b> to user ${targetId}.\n` +
    `New balance: <b>${updated.coins} coins</b>`
  );

  await bot.telegram.sendMessage(
    targetId,
    `🎁 You received <b>${amount} coins</b> from the admin!\nNew balance: <b>${updated.coins} coins</b>`,
    { parse_mode: "HTML" }
  ).catch(() => {});
});

// /pending — admin only
bot.command("pending", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");

  const list = await db.getPendingWithdrawals();
  if (list.length === 0) return ctx.reply("✅ No pending withdrawals.");

  const lines = list.map(
    (w) => `#${w.id} — @${w.username ?? w.user_id} — ${escapeHtml(w.prize)}`
  );
  await ctx.replyWithHTML(
    `📋 <b>Pending Withdrawals (${list.length})</b>\n\n` + lines.join("\n")
  );
});

// ── Auto-register webhook on cold start (production) ─────────────────────────

const IS_DEV = process.env.NODE_ENV === "development";
const WEBHOOK_URL = process.env.WEBHOOK_URL ?? "";

if (!IS_DEV && WEBHOOK_URL) {
  const webhookTarget = `https://${WEBHOOK_URL}/api/webhook`;
  bot.telegram
    .setWebhook(webhookTarget, { allowed_updates: ["message", "callback_query"] })
    .then(() => console.log(`[7DOGS] Webhook registered → ${webhookTarget}`))
    .catch((err) => console.error("[7DOGS] Webhook registration failed:", err.message));

  if (MINI_APP_URL) {
    bot.telegram
      .setChatMenuButton({
        menuButton: {
          type: "web_app",
          text: "🎰 Open 7DOGS App",
          web_app: { url: MINI_APP_URL },
        },
      })
      .catch(() => {});
  }
}

// ── Serverless / Development handler ─────────────────────────────────────────

module.exports = async (req, res) => {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ status: "7DOGS Bot webhook active", mode: IS_DEV ? "development" : "production" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await bot.handleUpdate(req.body);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(200).json({ ok: false });
  }
};
