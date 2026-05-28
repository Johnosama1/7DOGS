"use strict";

const { Telegraf } = require("telegraf");

module.exports = async (req, res) => {
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    return res.status(500).json({ error: "BOT_TOKEN is not set" });
  }

  // Derive webhook URL from request host if not set explicitly
  const host =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `https://${req.headers.host}`;

  const webhookUrl = `${host}/api/webhook`;

  const bot = new Telegraf(BOT_TOKEN);

  try {
    await bot.telegram.setWebhook(webhookUrl, {
      allowed_updates: ["message"],
    });

    const info = await bot.telegram.getWebhookInfo();

    return res.status(200).json({
      ok: true,
      webhook_set_to: webhookUrl,
      telegram_confirmed: info.url,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
