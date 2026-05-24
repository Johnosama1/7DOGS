import { Router } from "express";
import { db } from "@workspace/db";
import { requiredChannelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ADMIN_TOKENS } from "./admin";

const router = Router();

function requireAdmin(req: any, res: any): boolean {
  const token = req.headers["x-admin-token"] as string;
  if (!token || !ADMIN_TOKENS.has(token)) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// GET /admin/channels
router.get("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const channels = await db.query.requiredChannelsTable.findMany({
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  res.json(channels.map(c => ({
    id: c.id, name: c.name, username: c.username,
    link: c.link, enabled: c.enabled, createdAt: c.createdAt.toISOString(),
  })));
});

// POST /admin/channels
router.post("/", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, username, link, enabled } = req.body as {
    name: string; username: string; link: string; enabled?: boolean;
  };
  if (!name || !username || !link) {
    res.status(400).json({ error: "name, username, link required" });
    return;
  }
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  const cleanLink = link.startsWith("https://") ? link : `https://t.me/${cleanUsername}`;
  const [ch] = await db.insert(requiredChannelsTable).values({
    name, username: cleanUsername, link: cleanLink, enabled: enabled ?? true,
  }).returning();
  res.status(201).json({
    id: ch.id, name: ch.name, username: ch.username,
    link: ch.link, enabled: ch.enabled, createdAt: ch.createdAt.toISOString(),
  });
});

// DELETE /admin/channels/:channelId
router.delete("/:channelId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.channelId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(requiredChannelsTable).where(eq(requiredChannelsTable.id, id));
  res.status(204).send();
});

// PATCH /admin/channels/:channelId
router.patch("/:channelId", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = parseInt(req.params.channelId);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { enabled } = req.body as { enabled: boolean };
  const [ch] = await db.update(requiredChannelsTable)
    .set({ enabled })
    .where(eq(requiredChannelsTable.id, id))
    .returning();
  res.json({
    id: ch.id, name: ch.name, username: ch.username,
    link: ch.link, enabled: ch.enabled, createdAt: ch.createdAt.toISOString(),
  });
});

export default router;
