"use strict";

// Import the configured bot (all command handlers already attached)
const { bot } = require("../src/bot");

module.exports = async (req, res) => {
  // Health check
  if (req.method === "GET") {
    return res.status(200).json({ status: "7DOGS Bot webhook active", ok: true });
  }

  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    // Vercel usually parses JSON body automatically; handle both cases
    const update = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!update || typeof update !== "object") {
      return res.status(400).json({ error: "Invalid update" });
    }

    await bot.handleUpdate(update);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[7DOGS] Webhook error:", err.message);
    // Always return 200 — prevents Telegram from retrying indefinitely
    res.status(200).json({ ok: false, error: err.message });
  }
};
