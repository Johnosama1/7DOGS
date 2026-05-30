"use strict";

require("dotenv").config();

const { Telegraf } = require("telegraf");
const db = require("./src/db");

const BOT_TOKEN   = process.env.BOT_TOKEN   || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const ADMIN_ID    = parseInt(process.env.ADMIN_ID || "0", 10);
const SPIN_COST   = 10;

if (!BOT_TOKEN) {
  console.error("[7DOGS] FATAL: BOT_TOKEN is missing!");
  process.exit(1);
}

console.log("[7DOGS] Starting bot in polling mode...");
console.log("[7DOGS] ADMIN_ID:", ADMIN_ID);
console.log("[7DOGS] MINI_APP_URL:", MINI_APP_URL || "(not set)");

const bot = new Telegraf(BOT_TOKEN);

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── /start ────────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  const from = ctx.from;
  console.log(`[7DOGS] /start from user ${from.id} (@${from.username || "none"}) name="${from.first_name}"`);

  db.getOrCreateUser(from.id, from.username).catch((e) =>
    console.error("[7DOGS] DB error:", e.message)
  );

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
      `<tg-emoji emoji-id="6203785577070858514">🔤</tg-emoji>Invite friends <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> 1 free spin per 5️⃣ friends\n\n` +
      `<tg-emoji emoji-id="5104986024807760966">🎰</tg-emoji> Spin the wheel <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> win 50 to 1000!`,
      extra
    );
    console.log(`[7DOGS] /start reply sent to ${from.id} ✅`);
  } catch (err) {
    console.error(`[7DOGS] /start reply FAILED for ${from.id}:`, err.message);
  }
});

// ── /balance ──────────────────────────────────────────────────────────────────

bot.command("balance", async (ctx) => {
  console.log(`[7DOGS] /balance from ${ctx.from.id}`);
  try {
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    await ctx.replyWithHTML(
      `💰 <b>Your Balance</b>\n\nCoins: <b>${user.coins}</b>\n\nEach spin costs <b>${SPIN_COST} coins</b>.`
    );
  } catch (err) {
    console.error("[7DOGS] /balance error:", err.message);
    await ctx.reply("Error fetching balance.");
  }
});

// ── /spin ─────────────────────────────────────────────────────────────────────

bot.command("spin", async (ctx) => {
  console.log(`[7DOGS] /spin from ${ctx.from.id}`);
  try {
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    if (user.coins < SPIN_COST) {
      return ctx.replyWithHTML(
        `❌ <b>Not enough coins!</b>\n\nYou need <b>${SPIN_COST} coins</b>.\nBalance: <b>${user.coins}</b>`
      );
    }
    const updated = await db.deductCoins(ctx.from.id, SPIN_COST);
    if (!updated) return ctx.reply("Spin failed.");
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
    console.log(`[7DOGS] /spin result for ${ctx.from.id}: ${won.name} (${won.value}) ✅`);
  } catch (err) {
    console.error("[7DOGS] /spin error:", err.message);
    await ctx.reply("Spin error. Try again.");
  }
});

// ── /prizes ───────────────────────────────────────────────────────────────────

bot.command("prizes", async (ctx) => {
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
  try {
    const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!args) {
      return ctx.replyWithHTML(
        `💸 <b>Withdraw</b>\n\nUsage: <code>/withdraw [amount or prize]</code>`
      );
    }
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    const withdrawal = await db.createWithdrawal(ctx.from.id, args);
    await ctx.replyWithHTML(
      `✅ <b>Withdrawal Requested</b>\n\nPrize: <b>${escapeHtml(args)}</b>\nStatus: Pending\nID: #${withdrawal.id}`
    );
    if (ADMIN_ID) {
      bot.telegram.sendMessage(
        ADMIN_ID,
        `📬 Withdrawal #${withdrawal.id}\n` +
        `${escapeHtml(ctx.from.first_name || "User")} (@${ctx.from.username || ctx.from.id})\n` +
        `Prize: ${args}`
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

// ── Start polling ─────────────────────────────────────────────────────────────

bot.telegram.deleteWebhook({ drop_pending_updates: true })
  .then(() => {
    console.log("[7DOGS] Webhook cleared — starting long polling...");
    return bot.launch();
  })
  .then(() => {
    console.log("[7DOGS] ✅ Bot is running in polling mode! Send /start to test.");
  })
  .catch((err) => {
    console.error("[7DOGS] Failed to start polling:", err.message);
    process.exit(1);
  });

process.once("SIGINT",  () => { console.log("[7DOGS] Stopping..."); bot.stop("SIGINT");  });
process.once("SIGTERM", () => { console.log("[7DOGS] Stopping..."); bot.stop("SIGTERM"); });
