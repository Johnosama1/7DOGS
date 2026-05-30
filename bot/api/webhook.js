"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// 7DOGS Telegram Bot — Vercel Serverless Webhook
// IMPORTANT: Returns HTTP 200 IMMEDIATELY, then processes the update async.
// Telegram drops the webhook if no 200 arrives within 5 seconds.
// ─────────────────────────────────────────────────────────────────────────────

require("dotenv").config();

const { Telegraf } = require("telegraf");

// ── Environment ───────────────────────────────────────────────────────────────

const BOT_TOKEN    = process.env.BOT_TOKEN    || "";
const DATABASE_URL = process.env.DATABASE_URL || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const ADMIN_ID     = parseInt(process.env.ADMIN_ID || "0", 10);
const SPIN_COST    = 10;

console.log("[7DOGS] Module loaded. BOT_TOKEN set:", !!BOT_TOKEN, "| DB set:", !!DATABASE_URL);

if (!BOT_TOKEN) {
  console.error("[7DOGS] FATAL: BOT_TOKEN is missing — bot will not work!");
}

// ── Telegraf instance ─────────────────────────────────────────────────────────

const bot = new Telegraf(BOT_TOKEN || "0:dummy");

// ── DB (lazy — only imported when DATABASE_URL is available) ──────────────────

let db = null;
function getDb() {
  if (!db && DATABASE_URL) {
    try {
      db = require("../src/db");
      console.log("[7DOGS] DB module loaded");
    } catch (e) {
      console.error("[7DOGS] DB load error:", e.message);
    }
  }
  return db;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const from = ctx.from;
  console.log(`[7DOGS] /start from user ${from.id} (@${from.username || "none"})`);

  // Register user in DB (non-blocking — don't let DB failure stop the reply)
  const db = getDb();
  if (db) {
    db.getOrCreateUser(from.id, from.username).catch((e) =>
      console.error("[7DOGS] DB getOrCreateUser error:", e.message)
    );
  }

  const name = escapeHtml(from.first_name || from.username || "there");

  const extra = {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: MINI_APP_URL
        ? [[{ text: "🎰 Open 7DOGS App", web_app: { url: MINI_APP_URL } }]]
        : [],
    },
  };

  try {
    await ctx.telegram.sendMessage(
      ctx.chat.id,
      `<tg-emoji emoji-id="5319007286004299794">👋</tg-emoji> Welcome to 7DOGS, ${name}!\n\n` +
      `<tg-emoji emoji-id="6129832240303051599">😀</tg-emoji> The fastest NFT earning bot!\n\n` +
      `<tg-emoji emoji-id="6131673419768403090">✨</tg-emoji> How to earn <tg-emoji emoji-id="5436113877181941026">❓</tg-emoji>\n\n` +
      `<tg-emoji emoji-id="6203785577070858514">🔤</tg-emoji>Invite friends <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> 1 free spin per <tg-emoji emoji-id="5373026392735895830">5️⃣</tg-emoji> friends\n\n` +
      `<tg-emoji emoji-id="5104986024807760966">🎰</tg-emoji> Spin the wheel <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> win 50 to 1000!`,
      extra
    );
    console.log(`[7DOGS] /start reply sent to ${from.id}`);
  } catch (err) {
    console.error(`[7DOGS] /start reply failed for ${from.id}:`, err.message);
  }
});

// ── /balance ──────────────────────────────────────────────────────────────────

bot.command("balance", async (ctx) => {
  console.log(`[7DOGS] /balance from ${ctx.from.id}`);
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    await ctx.replyWithHTML(
      `💰 <b>Your Balance</b>\n\nCoins: <b>${user.coins}</b>\n\nEach spin costs <b>${SPIN_COST} coins</b>.`
    );
  } catch (err) {
    console.error("[7DOGS] /balance error:", err.message);
    await ctx.reply("Error fetching balance. Try again.");
  }
});

// ── /spin ─────────────────────────────────────────────────────────────────────

bot.command("spin", async (ctx) => {
  console.log(`[7DOGS] /spin from ${ctx.from.id}`);
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    if (user.coins < SPIN_COST) {
      return ctx.replyWithHTML(
        `❌ <b>Not enough coins!</b>\n\nYou need <b>${SPIN_COST} coins</b> to spin.\nBalance: <b>${user.coins} coins</b>`
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
    const resultText = won.value > 0
      ? `🎉 <b>You won: ${escapeHtml(won.name)}!</b>\n+${won.value} coins added.`
      : `😔 <b>${escapeHtml(won.name)}</b> — Better luck next time!`;
    await ctx.replyWithHTML(
      `🎰 <b>Spinning...</b>\n\n${resultText}\n\n💰 Balance: <b>${finalBalance} coins</b>`
    );
    console.log(`[7DOGS] /spin result for ${ctx.from.id}: ${won.name} (${won.value})`);
  } catch (err) {
    console.error("[7DOGS] /spin error:", err.message);
    await ctx.reply("Spin error. Try again.");
  }
});

// ── /prizes ───────────────────────────────────────────────────────────────────

bot.command("prizes", async (ctx) => {
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const prizes = await db.getAllPrizes();
    const lines = prizes.map((p) => {
      const pct = (p.probability * 100).toFixed(1);
      return `${escapeHtml(p.name)} — <b>${p.value} coins</b> (${pct}% chance)`;
    });
    await ctx.replyWithHTML(
      `🎡 <b>Prize Wheel</b>\n\n` + lines.join("\n") +
      `\n\nSpin with /spin (costs ${SPIN_COST} coins)`
    );
  } catch (err) {
    console.error("[7DOGS] /prizes error:", err.message);
  }
});

// ── /withdraw ─────────────────────────────────────────────────────────────────

bot.command("withdraw", async (ctx) => {
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!args) {
      return ctx.replyWithHTML(
        `💸 <b>Withdraw</b>\n\nUsage: <code>/withdraw [amount or prize]</code>\nExample: <code>/withdraw 200 coins</code>`
      );
    }
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    const withdrawal = await db.createWithdrawal(ctx.from.id, args);
    await ctx.replyWithHTML(
      `✅ <b>Withdrawal Requested</b>\n\nPrize: <b>${escapeHtml(args)}</b>\nStatus: Pending\nID: #${withdrawal.id}`
    );
    if (ADMIN_ID) {
      const username = ctx.from.username ? `@${ctx.from.username}` : `ID:${ctx.from.id}`;
      bot.telegram.sendMessage(
        ADMIN_ID,
        `📬 Withdrawal #${withdrawal.id}\n${escapeHtml(ctx.from.first_name || "User")} (${username})\nPrize: ${args}`
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[7DOGS] /withdraw error:", err.message);
    await ctx.reply("Error processing withdrawal.");
  }
});

// ── /addcoins (admin) ──────────────────────────────────────────────────────────

bot.command("addcoins", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const parts = ctx.message.text.split(" ");
    const targetId = parseInt(parts[1], 10);
    const amount   = parseInt(parts[2], 10);
    if (!targetId || !amount || isNaN(targetId) || isNaN(amount)) {
      return ctx.replyWithHTML(`Usage: <code>/addcoins [user_id] [amount]</code>`);
    }
    const updated = await db.addCoins(targetId, amount);
    if (!updated) return ctx.reply(`❌ User ${targetId} not found.`);
    await ctx.replyWithHTML(
      `✅ Added <b>${amount} coins</b> to user ${targetId}.\nNew balance: <b>${updated.coins}</b>`
    );
    bot.telegram.sendMessage(
      targetId,
      `🎁 You received <b>${amount} coins</b>!\nBalance: <b>${updated.coins} coins</b>`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  } catch (err) {
    console.error("[7DOGS] /addcoins error:", err.message);
  }
});

// ── /pending (admin) ──────────────────────────────────────────────────────────

bot.command("pending", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");
  const db = getDb();
  if (!db) return ctx.reply("Service temporarily unavailable.");
  try {
    const list = await db.getPendingWithdrawals();
    if (list.length === 0) return ctx.reply("✅ No pending withdrawals.");
    const lines = list.map((w) => `#${w.id} — @${w.username ?? w.user_id} — ${escapeHtml(w.prize)}`);
    await ctx.replyWithHTML(
      `📋 <b>Pending (${list.length})</b>\n\n` + lines.join("\n")
    );
  } catch (err) {
    console.error("[7DOGS] /pending error:", err.message);
  }
});

// ── Catch-all text handler (for debugging) ────────────────────────────────────

bot.on("text", async (ctx) => {
  console.log(`[7DOGS] Text message from ${ctx.from.id}: "${ctx.message.text}"`);
  // Only echo back if it's not a command (commands have their own handlers)
  if (!ctx.message.text.startsWith("/")) {
    await ctx.reply(`Got your message: "${ctx.message.text}"\n\nUse /start to begin.`).catch(() => {});
  }
});

// ── Serverless Entry Point ─────────────────────────────────────────────────────
// ⚠️  CRITICAL: Send HTTP 200 FIRST, then process update.
// Telegram will retry if no 200 within 5 seconds → causes duplicate processing.

module.exports = async (req, res) => {
  // ── Health check ──────────────────────────────────────────────────────────
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      status: "7DOGS Bot webhook active",
      bot_token_set: !!BOT_TOKEN,
      db_set: !!DATABASE_URL,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  // ── Parse update ──────────────────────────────────────────────────────────
  let update;
  try {
    update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch (parseErr) {
    console.error("[7DOGS] Failed to parse request body:", parseErr.message);
    return res.status(200).json({ ok: false, error: "parse_error" });
  }

  if (!update || typeof update !== "object") {
    console.error("[7DOGS] Invalid update received:", typeof update);
    return res.status(200).json({ ok: false, error: "invalid_update" });
  }

  // Log incoming update
  const updateType = Object.keys(update).filter((k) => k !== "update_id")[0] || "unknown";
  const userId = update.message?.from?.id || update.callback_query?.from?.id || "?";
  const text   = update.message?.text || "";
  console.log(`[7DOGS] Update #${update.update_id} | type:${updateType} | user:${userId} | text:"${text}"`);

  // ── ✅ Return 200 IMMEDIATELY — before any async processing ──────────────
  res.status(200).json({ ok: true });

  // ── Process update asynchronously (after response is sent) ───────────────
  if (!BOT_TOKEN) {
    console.error("[7DOGS] Cannot process update — BOT_TOKEN not set");
    return;
  }

  bot.handleUpdate(update).catch((err) => {
    console.error(`[7DOGS] handleUpdate error for update #${update.update_id}:`, err.message);
  });
};
