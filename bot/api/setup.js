"use strict";

const { Telegraf } = require("telegraf");

module.exports = async (req, res) => {
  const BOT_TOKEN    = process.env.BOT_TOKEN;
  const WEBHOOK_URL  = process.env.WEBHOOK_URL;
  const DATABASE_URL = process.env.DATABASE_URL;
  const ADMIN_ID     = process.env.ADMIN_ID;

  // ── GET: show env + webhook status ─────────────────────────────────────────
  if (req.method === "GET") {
    const envStatus = {
      BOT_TOKEN:    BOT_TOKEN    ? "✅ set" : "❌ MISSING",
      WEBHOOK_URL:  WEBHOOK_URL  ? "✅ set" : "❌ MISSING",
      DATABASE_URL: DATABASE_URL ? "✅ set" : "❌ MISSING",
      ADMIN_ID:     ADMIN_ID     ? "✅ set" : "⚠️  not set (optional)",
    };

    let webhookInfo = null;
    if (BOT_TOKEN) {
      try {
        const bot = new Telegraf(BOT_TOKEN);
        webhookInfo = await bot.telegram.getWebhookInfo();
      } catch (e) {
        webhookInfo = { error: e.message };
      }
    }

    const allReady = BOT_TOKEN && DATABASE_URL;
    return res.status(200).json({
      status: allReady ? "✅ Ready" : "❌ Missing required env vars",
      env: envStatus,
      webhook: webhookInfo,
      action: allReady
        ? "POST to /api/setup to register webhook"
        : "Set missing env vars on Vercel → Settings → Environment Variables → then Redeploy",
    });
  }

  // ── POST: register webhook with Telegram ───────────────────────────────────
  if (req.method === "POST") {
    if (!BOT_TOKEN) {
      return res.status(400).json({ error: "BOT_TOKEN not set on Vercel" });
    }

    // Use WEBHOOK_URL env var, or fall back to request host
    const host = WEBHOOK_URL
      ? (WEBHOOK_URL.startsWith("https://") ? WEBHOOK_URL : `https://${WEBHOOK_URL}`)
      : `https://${req.headers.host}`;

    const webhookTarget = `${host}/api/webhook`;

    try {
      const bot = new Telegraf(BOT_TOKEN);
      await bot.telegram.setWebhook(webhookTarget, {
        allowed_updates: ["message", "callback_query"],
      });
      const info = await bot.telegram.getWebhookInfo();
      return res.status(200).json({
        ok: true,
        registered_to: webhookTarget,
        confirmed_by_telegram: info.url,
        pending_updates: info.pending_update_count,
        last_error: info.last_error_message ?? null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).end();
};
