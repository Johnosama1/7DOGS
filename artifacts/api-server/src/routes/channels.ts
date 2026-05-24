import { Router } from "express";
import { db } from "@workspace/db";
import { requiredChannelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CheckChannelMembershipQueryParams } from "@workspace/api-zod";

const router = Router();

const BOT_TOKEN = process.env.BOT_TOKEN || "";

async function isMemberOfChannel(telegramId: string, username: string): Promise<boolean> {
  if (!BOT_TOKEN) return true; // dev fallback: if no token, skip check
  try {
    const chatId = username.startsWith("@") ? username : `@${username}`;
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${telegramId}`;
    const res = await fetch(url);
    const data = await res.json() as { ok: boolean; result?: { status: string } };
    if (!data.ok) return false;
    const status = data.result?.status;
    return status === "member" || status === "administrator" || status === "creator";
  } catch {
    return false;
  }
}

// GET /api/channels — public list of all enabled channels
router.get("/", async (_req, res) => {
  const channels = await db.query.requiredChannelsTable.findMany({
    where: eq(requiredChannelsTable.enabled, true),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  res.json(channels.map(c => ({
    id: c.id,
    name: c.name,
    username: c.username,
    link: c.link,
    enabled: c.enabled,
    createdAt: c.createdAt.toISOString(),
  })));
});

// GET /api/channels/check?telegramId=xxx — channels user hasn't joined
router.get("/check", async (req, res) => {
  const parsed = CheckChannelMembershipQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing telegramId" });
    return;
  }
  const { telegramId } = parsed.data;

  const channels = await db.query.requiredChannelsTable.findMany({
    where: eq(requiredChannelsTable.enabled, true),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });

  const unjoined = [];
  for (const ch of channels) {
    const isMember = await isMemberOfChannel(telegramId, ch.username);
    if (!isMember) {
      unjoined.push({
        id: ch.id,
        name: ch.name,
        username: ch.username,
        link: ch.link,
        enabled: ch.enabled,
        createdAt: ch.createdAt.toISOString(),
      });
    }
  }
  res.json(unjoined);
});

export default router;
