import app from "./app";
import { logger } from "./lib/logger";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Auto-register Telegram webhook if BOT_TOKEN and REPLIT_DEV_DOMAIN are available
  const botToken = process.env.BOT_TOKEN;
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;

  if (botToken && replitDomain) {
    const webhookUrl = `https://${replitDomain}/api/telegram/webhook`;
    const appUrl = `https://${replitDomain}/`;

    try {
      // Register webhook
      const resp = await fetch(
        `https://api.telegram.org/bot${botToken}/setWebhook`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: webhookUrl, allowed_updates: ["message"] }),
        }
      );
      const data = (await resp.json()) as { ok: boolean; description?: string };
      if (data.ok) {
        logger.info({ webhookUrl }, "Telegram webhook registered");
      } else {
        logger.warn({ data }, "Failed to register Telegram webhook");
      }

      // Save app_url to settings for Mini App button
      await db
        .insert(settingsTable)
        .values({ key: "app_url", value: appUrl })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value: appUrl } });

      logger.info({ appUrl }, "App URL updated in settings");
    } catch (err) {
      logger.warn({ err }, "Telegram webhook auto-registration failed");
    }
  }
});
