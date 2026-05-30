"use strict";

require("dotenv").config();

const { Telegraf } = require("telegraf");
const db = require("../src/db");

// ── Config ────────────────────────────────────────────────────────────────────

const BOT_TOKEN   = process.env.BOT_TOKEN   || "";
const MINI_APP_URL = process.env.MINI_APP_URL || "";
const ADMIN_ID    = parseInt(process.env.ADMIN_ID || "0", 10);
const SPIN_COST   = 10;

if (!BOT_TOKEN) {
  console.error("[7DOGS] BOT_TOKEN is not set!");
}

const bot = new Telegraf(BOT_TOKEN);

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── /start ───────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  try {
    const from = ctx.from;
    await db.getOrCreateUser(from.id, from.username);
    const name = escapeHtml(from.first_name || from.username || "there");

    const extra = {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: MINI_APP_URL
          ? [[{ text: "🎰 Open 7DOGS App", web_app: { url: MINI_APP_URL } }]]
          : [],
      },
    };

    await ctx.telegram.sendMessage(
      ctx.chat.id,
      `<tg-emoji emoji-id="5319007286004299794">👋</tg-emoji> Welcome to 7DOGS, ${name}!\n\n` +
      `<tg-emoji emoji-id="6129832240303051599">😀</tg-emoji> The fastest NFT earning bot!\n\n` +
      `<tg-emoji emoji-id="6131673419768403090">✨</tg-emoji> How to earn <tg-emoji emoji-id="5436113877181941026">❓</tg-emoji>\n\n` +
      `<tg-emoji emoji-id="6203785577070858514">🔤</tg-emoji>Invite friends <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> 1 free spin per 5️⃣ friends\n\n` +
      `<tg-emoji emoji-id="5104986024807760966">🎰</tg-emoji> Spin the wheel <tg-emoji emoji-id="5215229232476596064">➡️</tg-emoji> win 50 to 1000!`,
      extra
    );
  } catch (err) {
    console.error("[7DOGS] /start error:", err.message);
  }
});

// ── /balance ──────────────────────────────────────────────────────────────────

bot.command("balance", async (ctx) => {
  try {
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");
    await ctx.replyWithHTML(
      `💰 <b>Your Balance</b>\n\nCoins: <b>${user.coins}</b>\n\nEach spin costs <b>${SPIN_COST} coins</b>.`
    );
  } catch (err) {
    console.error("[7DOGS] /balance error:", err.message);
  }
});

// ── /spin ─────────────────────────────────────────────────────────────────────

bot.command("spin", async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    const user = await db.getUserByTelegramId(telegramId);
    if (!user) return ctx.reply("Please /start first.");

    if (user.coins < SPIN_COST) {
      return ctx.replyWithHTML(
        `❌ <b>Not enough coins!</b>\n\nYou need <b>${SPIN_COST} coins</b> to spin.\nYour balance: <b>${user.coins} coins</b>`
      );
    }

    const updated = await db.deductCoins(telegramId, SPIN_COST);
    if (!updated) return ctx.reply("Spin failed — not enough coins.");

    const prizes = await db.getAllPrizes();
    const won = db.pickPrize(prizes);

    let finalBalance = updated.coins;
    if (won.value > 0) {
      const withPrize = await db.addCoins(telegramId, won.value);
      finalBalance = withPrize?.coins ?? finalBalance;
    }

    await db.recordSpin(telegramId, SPIN_COST, won.name, won.value);

    const resultText = won.value > 0
      ? `🎉 <b>You won: ${escapeHtml(won.name)}!</b>\n+${won.value} coins added.`
      : `😔 <b>${escapeHtml(won.name)}</b> — Better luck next time!`;

    await ctx.replyWithHTML(
      `🎰 <b>Spinning the wheel...</b>\n\n${resultText}\n\n💰 Balance: <b>${finalBalance} coins</b>`
    );
  } catch (err) {
    console.error("[7DOGS] /spin error:", err.message);
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
        `💸 <b>Withdraw a Prize</b>\n\nUsage: <code>/withdraw [amount or prize]</code>\nExample: <code>/withdraw 200 coins</code>`
      );
    }
    const user = await db.getUserByTelegramId(ctx.from.id);
    if (!user) return ctx.reply("Please /start first.");

    const withdrawal = await db.createWithdrawal(ctx.from.id, args);
    await ctx.replyWithHTML(
      `✅ <b>Withdrawal Requested</b>\n\nPrize: <b>${escapeHtml(args)}</b>\nStatus: <b>Pending</b>\nRequest ID: #${withdrawal.id}\n\nAn admin will process your request soon.`
    );

    if (ADMIN_ID) {
      const name = escapeHtml(ctx.from.first_name || ctx.from.username || "User");
      const username = ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`;
      await bot.telegram.sendMessage(
        ADMIN_ID,
        `📬 New withdrawal #${withdrawal.id}\nFrom: ${name} (${username})\nPrize: ${args}`
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[7DOGS] /withdraw error:", err.message);
  }
});

// ── /addcoins (admin) ─────────────────────────────────────────────────────────

bot.command("addcoins", async (ctx) => {
  try {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");
    const parts = ctx.message.text.split(" ");
    const targetId = parseInt(parts[1], 10);
    const amount   = parseInt(parts[2], 10);
    if (!targetId || !amount || isNaN(targetId) || isNaN(amount)) {
      return ctx.replyWithHTML(`Usage: <code>/addcoins [user_id] [amount]</code>`);
    }
    const updated = await db.addCoins(targetId, amount);
    if (!updated) return ctx.reply(`❌ User ${targetId} not found.`);
    await ctx.replyWithHTML(
      `✅ Added <b>${amount} coins</b> to user ${targetId}.\nNew balance: <b>${updated.coins} coins</b>`
    );
    await bot.telegram.sendMessage(
      targetId,
      `🎁 You received <b>${amount} coins</b> from the admin!\nNew balance: <b>${updated.coins} coins</b>`,
      { parse_mode: "HTML" }
    ).catch(() => {});
  } catch (err) {
    console.error("[7DOGS] /addcoins error:", err.message);
  }
});

// ── /pending (admin) ──────────────────────────────────────────────────────────

bot.command("pending", async (ctx) => {
  try {
    if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");
    const list = await db.getPendingWithdrawals();
    if (list.length === 0) return ctx.reply("✅ No pending withdrawals.");
    const lines = list.map((w) => `#${w.id} — @${w.username ?? w.user_id} — ${escapeHtml(w.prize)}`);
    await ctx.replyWithHTML(
      `📋 <b>Pending Withdrawals (${list.length})</b>\n\n` + lines.join("\n")
    );
  } catch (err) {
    console.error("[7DOGS] /pending error:", err.message);
  }
});

// ── Serverless handler ────────────────────────────────────────────────────────

module.exports = async (req, res) => {
  if (req.method === "GET") {
    return res.status(200).json({ ok: true, status: "7DOGS webhook active" });
  }
  if (req.method !== "POST") {
    return res.status(405).end();
  }
  try {
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await bot.handleUpdate(update);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[7DOGS] Webhook error:", err.message);
    res.status(200).json({ ok: false, error: err.message });
  }
};
