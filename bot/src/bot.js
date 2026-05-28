"use strict";

require("dotenv").config();

const express = require("express");
const { Telegraf } = require("telegraf");
const db = require("./db");

// ── Config ───────────────────────────────────────────────────────────────────

const BOT_TOKEN = process.env.BOT_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const ADMIN_ID = parseInt(process.env.ADMIN_ID ?? "0", 10);
const SPIN_COST = 10;

if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required in .env");
if (!DATABASE_URL) throw new Error("DATABASE_URL is required in .env");
if (!WEBHOOK_URL) throw new Error("WEBHOOK_URL is required in .env");

const bot = new Telegraf(BOT_TOKEN);
const app = express();
app.use(express.json());

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function spinAnimation(prizeName) {
  const frames = ["🎰 ⠋", "🎰 ⠙", "🎰 ⠹", "🎰 ⠸", "🎰 ⠼", "🎰 ⠴"];
  return frames[Math.floor(Math.random() * frames.length)] + " " + prizeName;
}

// ── Commands ──────────────────────────────────────────────────────────────────

// /start — register + welcome
bot.start(async (ctx) => {
  const from = ctx.from;
  await db.getOrCreateUser(from.id, from.username);

  const name = escapeHtml(from.first_name || from.username || "there");

  await ctx.replyWithHTML(
    `🐕 <b>Welcome to 7DOGS, ${name}!</b>\n\n` +
    `Spin the lucky wheel and win amazing prizes!\n\n` +
    `🏆 Win up to <b>500 coins</b> per spin\n` +
    `👥 Invite friends for bonus rewards\n` +
    `💸 Withdraw your winnings anytime\n\n` +
    `<b>Commands:</b>\n` +
    `/balance — Check your coins\n` +
    `/spin — Spin the wheel (costs ${SPIN_COST} coins)\n` +
    `/prizes — View all prizes\n` +
    `/withdraw — Request a withdrawal\n\n` +
    `🎁 You start with <b>0 coins</b>. Ask an admin to top you up!`
  );
});

// /balance — show coins
bot.command("balance", async (ctx) => {
  const user = await db.getUserByTelegramId(ctx.from.id);
  if (!user) {
    return ctx.reply("Please /start first.");
  }
  await ctx.replyWithHTML(
    `💰 <b>Your Balance</b>\n\n` +
    `Coins: <b>${user.coins}</b>\n\n` +
    `Each spin costs <b>${SPIN_COST} coins</b>.`
  );
});

// /spin — spin the wheel
bot.command("spin", async (ctx) => {
  const telegramId = ctx.from.id;

  const user = await db.getUserByTelegramId(telegramId);
  if (!user) return ctx.reply("Please /start first.");

  if (user.coins < SPIN_COST) {
    return ctx.replyWithHTML(
      `❌ <b>Not enough coins!</b>\n\n` +
      `You need <b>${SPIN_COST} coins</b> to spin.\n` +
      `Your balance: <b>${user.coins} coins</b>`
    );
  }

  // Deduct coins
  const updated = await db.deductCoins(telegramId, SPIN_COST);
  if (!updated) {
    return ctx.reply("Spin failed — not enough coins.");
  }

  // Pick prize
  const prizes = await db.getAllPrizes();
  const won = db.pickPrize(prizes);

  // Award coins if value > 0
  let finalBalance = updated.coins;
  if (won.value > 0) {
    const withPrize = await db.addCoins(telegramId, won.value);
    finalBalance = withPrize?.coins ?? finalBalance;
  }

  // Record spin
  await db.recordSpin(telegramId, SPIN_COST, won.name, won.value);

  const resultText =
    won.value > 0
      ? `🎉 <b>You won: ${escapeHtml(won.name)}!</b>\n+${won.value} coins added to your balance.`
      : `😔 <b>${escapeHtml(won.name)}</b> — Better luck next time!`;

  await ctx.replyWithHTML(
    `🎰 <b>Spinning the wheel...</b>\n\n` +
    `${resultText}\n\n` +
    `💰 Balance: <b>${finalBalance} coins</b>`
  );
});

// /prizes — list prizes
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

// /withdraw — request withdrawal
bot.command("withdraw", async (ctx) => {
  const args = ctx.message.text.split(" ").slice(1).join(" ").trim();

  if (!args) {
    return ctx.replyWithHTML(
      `💸 <b>Withdraw a Prize</b>\n\n` +
      `Usage: <code>/withdraw [prize name or coins amount]</code>\n\n` +
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

  // Notify admin if configured
  if (ADMIN_ID) {
    const name = escapeHtml(ctx.from.first_name || ctx.from.username || "User");
    const username = ctx.from.username ? `@${ctx.from.username}` : `ID: ${ctx.from.id}`;
    await bot.telegram.sendMessage(
      ADMIN_ID,
      `📬 New withdrawal request #${withdrawal.id}\n` +
      `From: ${name} (${username})\n` +
      `Prize: ${args}`
    ).catch(() => {});
  }
});

// /addcoins [user_id] [amount] — admin only
bot.command("addcoins", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply("⛔ Admin only.");
  }

  const parts = ctx.message.text.split(" ");
  const targetId = parseInt(parts[1], 10);
  const amount = parseInt(parts[2], 10);

  if (!targetId || !amount || isNaN(targetId) || isNaN(amount)) {
    return ctx.replyWithHTML(
      `Usage: <code>/addcoins [telegram_user_id] [amount]</code>`
    );
  }

  const updated = await db.addCoins(targetId, amount);
  if (!updated) {
    return ctx.reply(`❌ User ${targetId} not found. They must /start first.`);
  }

  await ctx.replyWithHTML(
    `✅ Added <b>${amount} coins</b> to user ${targetId}.\n` +
    `New balance: <b>${updated.coins} coins</b>`
  );

  // Notify the user
  await bot.telegram.sendMessage(
    targetId,
    `🎁 You received <b>${amount} coins</b> from the admin!\n` +
    `New balance: <b>${updated.coins} coins</b>`,
    { parse_mode: "HTML" }
  ).catch(() => {});
});

// /pending — admin: list pending withdrawals
bot.command("pending", async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return ctx.reply("⛔ Admin only.");

  const list = await db.getPendingWithdrawals();
  if (list.length === 0) return ctx.reply("✅ No pending withdrawals.");

  const lines = list.map(
    (w) =>
      `#${w.id} — @${w.username ?? w.user_id} — ${escapeHtml(w.prize)}`
  );

  await ctx.replyWithHTML(
    `📋 <b>Pending Withdrawals (${list.length})</b>\n\n` +
    lines.join("\n")
  );
});

// ── Webhook setup ─────────────────────────────────────────────────────────────

const WEBHOOK_PATH = `/webhook/${BOT_TOKEN}`;

app.use(bot.webhookCallback(WEBHOOK_PATH));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, async () => {
  console.log(`[7DOGS Bot] Server listening on port ${PORT}`);

  const webhookFullUrl = `${WEBHOOK_URL}${WEBHOOK_PATH}`;
  try {
    await bot.telegram.setWebhook(webhookFullUrl, {
      allowed_updates: ["message"],
    });
    console.log(`[7DOGS Bot] Webhook set → ${webhookFullUrl}`);
  } catch (err) {
    console.error("[7DOGS Bot] Failed to set webhook:", err.message);
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
