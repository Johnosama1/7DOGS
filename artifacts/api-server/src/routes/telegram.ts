import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

const BOT_TOKEN = process.env.BOT_TOKEN ?? "";

async function sendMessage(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>
) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", ...extra }),
  });
}

async function getSettingValue(key: string, def: string): Promise<string> {
  const row = await db.query.settingsTable.findFirst({ where: eq(settingsTable.key, key) });
  return row?.value ?? def;
}

// POST /api/telegram/webhook
router.post("/webhook", async (req, res) => {
  res.status(200).end();

  try {
    const update = req.body as TelegramUpdate;

    const message = update.message;
    if (!message || !message.from) return;

    const from = message.from;
    const chatId = message.chat.id;
    const text = message.text ?? "";

    if (text.startsWith("/start")) {
      const parts = text.split(" ");
      const startParam = parts[1] ?? "";

      const [botUsername, appUrl] = await Promise.all([
        getSettingValue("bot_username", "7DogsBot"),
        getSettingValue("app_url", process.env.APP_URL ?? ""),
      ]);

      const name = from.first_name || from.username || "there";

      const welcomeText =
        `🐕 <b>Welcome to ${botUsername}!</b>\n\n` +
        `Spin the wheel and win NFT rewards!\n\n` +
        `🏆 Win up to big rewards per spin\n` +
        `👥 Invite friends for free spins\n` +
        `💸 Withdraw your earnings anytime`;

      const keyboard: Record<string, unknown> = appUrl
        ? {
            inline_keyboard: [
              [{ text: "🎰 Open 7DOGS App", web_app: { url: appUrl } }],
            ],
          }
        : {};

      await sendMessage(chatId, welcomeText, {
        reply_markup: keyboard,
      });

      logger.info({ telegramId: from.id, startParam }, "Welcome message sent");
    }
  } catch (err) {
    logger.error({ err }, "Telegram webhook error");
  }
});

// POST /api/telegram/set-webhook  (admin utility — call once after deploy)
router.post("/set-webhook", async (req, res) => {
  const { url } = req.body as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }
  if (!BOT_TOKEN) {
    res.status(503).json({ error: "BOT_TOKEN not configured" });
    return;
  }

  const resp = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, allowed_updates: ["message"] }),
    }
  );
  const data = (await resp.json()) as Record<string, unknown>;
  res.json(data);
});

// GET /api/telegram/webhook-info
router.get("/webhook-info", async (_req, res) => {
  if (!BOT_TOKEN) {
    res.status(503).json({ error: "BOT_TOKEN not configured" });
    return;
  }
  const resp = await fetch(
    `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
  );
  const data = (await resp.json()) as Record<string, unknown>;
  res.json(data);
});

export default router;

// ─── Telegram update types (minimal) ─────────────────────────────────────────
interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number; type: string };
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}
