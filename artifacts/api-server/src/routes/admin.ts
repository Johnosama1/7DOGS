import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable,
  wheelSegmentsTable,
  giftsTable,
  settingsTable,
  adminLogsTable,
  spinsTable,
  redemptionsTable,
} from "@workspace/db";
import { eq, or, sql, desc, ilike } from "drizzle-orm";
import crypto from "crypto";
import {
  AdminVerifyBody,
  AdminGetUsersQueryParams,
  AdminAdjustBalanceParams,
  AdminAdjustBalanceBody,
  AdminCreateSegmentBody,
  AdminUpdateSegmentParams,
  AdminUpdateSegmentBody,
  AdminDeleteSegmentParams,
  AdminCreateGiftBody,
  AdminUpdateGiftParams,
  AdminUpdateGiftBody,
  AdminDeleteGiftParams,
  AdminUpdateSettingsBody,
  AdminGetLogsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// ─── Deterministic token (survives server restarts) ──────────────────────────
function generateToken(password: string): string {
  const secret = process.env.TOKEN_SECRET ?? "7dogs-admin-secret-key";
  return crypto.createHmac("sha256", secret).update(password).digest("hex");
}

function extractToken(req: any): string | null {
  const xToken = req.headers["x-admin-token"];
  if (xToken && typeof xToken === "string") return xToken;
  const auth = req.headers["authorization"];
  if (auth && typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice(7);
  }
  return null;
}

function validateToken(req: any, res: any): boolean {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const expected = generateToken(adminPassword);
  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function logAdminAction(action: string, details?: string) {
  await db.insert(adminLogsTable).values({ action, details: details ?? null });
}

// POST /api/admin/verify
router.post("/verify", async (req, res) => {
  const parsed = AdminVerifyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { password } = parsed.data;
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  if (password !== adminPassword) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const token = generateToken(password);
  await logAdminAction("admin_login", "Admin logged in");
  res.json({ token });
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminGetUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { search, page, limit } = parsed.data;
  const pageNum = page ?? 1;
  const limitNum = limit ?? 50;
  const offset = (pageNum - 1) * limitNum;

  let query = db.select().from(usersTable);
  let countQuery = db.select({ count: sql<number>`count(*)::int` }).from(usersTable);

  if (search) {
    const searchCondition = or(
      ilike(usersTable.username, `%${search}%`),
      ilike(usersTable.firstName, `%${search}%`),
    );
    // @ts-ignore
    query = query.where(searchCondition);
    // @ts-ignore
    countQuery = countQuery.where(searchCondition);
  }

  const [users, countResult] = await Promise.all([
    // @ts-ignore
    query.limit(limitNum).offset(offset).orderBy(desc(usersTable.createdAt)),
    countQuery,
  ]);

  const total = countResult[0]?.count ?? 0;

  res.json({
    users: users.map((u) => ({
      id: u.id,
      telegramId: u.telegramId,
      firstName: u.firstName,
      lastName: u.lastName,
      username: u.username,
      coins: u.coins,
      spins: u.spins,
      totalReferrals: u.totalReferrals,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page: pageNum,
    limit: limitNum,
  });
});

// PATCH /api/admin/users/:userId/balance
router.patch("/users/:userId/balance", async (req, res) => {
  if (!validateToken(req, res)) return;

  const paramsP = AdminAdjustBalanceParams.safeParse({ userId: parseInt(req.params.userId) });
  const bodyP = AdminAdjustBalanceBody.safeParse(req.body);
  if (!paramsP.success || !bodyP.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { userId } = paramsP.data;
  const { type, amount } = bodyP.data;

  const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let update: Record<string, any>;
  if (type === "coins") {
    update = { coins: sql`greatest(0, ${usersTable.coins} + ${amount})` };
  } else {
    update = { spins: sql`greatest(0, ${usersTable.spins} + ${amount})` };
  }

  const [updated] = await db
    .update(usersTable)
    .set(update)
    .where(eq(usersTable.id, userId))
    .returning();

  await logAdminAction("adjust_balance", `User ${userId}: ${type} ${amount > 0 ? "+" : ""}${amount}`);

  res.json({
    id: updated.id,
    telegramId: updated.telegramId,
    firstName: updated.firstName,
    lastName: updated.lastName,
    username: updated.username,
    coins: updated.coins,
    spins: updated.spins,
    totalReferrals: updated.totalReferrals,
    createdAt: updated.createdAt.toISOString(),
  });
});

// GET /api/admin/wheel
router.get("/wheel", async (req, res) => {
  if (!validateToken(req, res)) return;

  const segments = await db.query.wheelSegmentsTable.findMany({
    orderBy: [wheelSegmentsTable.id],
  });

  res.json(segments.map((s) => ({
    id: s.id,
    label: s.label,
    rewardType: s.rewardType,
    rewardAmount: s.rewardAmount,
    giftId: s.giftId,
    probability: s.probability,
    color: s.color,
    enabled: s.enabled,
  })));
});

// POST /api/admin/wheel
router.post("/wheel", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminCreateSegmentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    return;
  }

  const [segment] = await db
    .insert(wheelSegmentsTable)
    .values({
      label: parsed.data.label,
      rewardType: parsed.data.rewardType,
      rewardAmount: parsed.data.rewardAmount,
      giftId: parsed.data.giftId ?? null,
      probability: parsed.data.probability,
      color: parsed.data.color,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  await logAdminAction("create_segment", `Created segment: ${parsed.data.label}`);

  res.status(201).json({
    id: segment.id,
    label: segment.label,
    rewardType: segment.rewardType,
    rewardAmount: segment.rewardAmount,
    giftId: segment.giftId,
    probability: segment.probability,
    color: segment.color,
    enabled: segment.enabled,
  });
});

// PATCH /api/admin/wheel/:segmentId
router.patch("/wheel/:segmentId", async (req, res) => {
  if (!validateToken(req, res)) return;

  const paramsP = AdminUpdateSegmentParams.safeParse({ segmentId: parseInt(req.params.segmentId) });
  const bodyP = AdminUpdateSegmentBody.safeParse(req.body);
  if (!paramsP.success || !bodyP.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { segmentId } = paramsP.data;

  const [segment] = await db
    .update(wheelSegmentsTable)
    .set(bodyP.data)
    .where(eq(wheelSegmentsTable.id, segmentId))
    .returning();

  if (!segment) {
    res.status(404).json({ error: "Segment not found" });
    return;
  }

  await logAdminAction("update_segment", `Updated segment ${segmentId}`);

  res.json({
    id: segment.id,
    label: segment.label,
    rewardType: segment.rewardType,
    rewardAmount: segment.rewardAmount,
    giftId: segment.giftId,
    probability: segment.probability,
    color: segment.color,
    enabled: segment.enabled,
  });
});

// DELETE /api/admin/wheel/:segmentId
router.delete("/wheel/:segmentId", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminDeleteSegmentParams.safeParse({ segmentId: parseInt(req.params.segmentId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db.delete(wheelSegmentsTable).where(eq(wheelSegmentsTable.id, parsed.data.segmentId));
  await logAdminAction("delete_segment", `Deleted segment ${parsed.data.segmentId}`);

  res.status(204).end();
});

// GET /api/admin/gifts
router.get("/gifts", async (req, res) => {
  if (!validateToken(req, res)) return;

  const gifts = await db.query.giftsTable.findMany({ orderBy: [giftsTable.id] });

  res.json(gifts.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    coinPrice: g.coinPrice,
    imageUrl: g.imageUrl,
    stock: g.stock,
    enabled: g.enabled,
  })));
});

// POST /api/admin/gifts
router.post("/gifts", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminCreateGiftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    return;
  }

  const [gift] = await db
    .insert(giftsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      coinPrice: parsed.data.coinPrice,
      imageUrl: parsed.data.imageUrl ?? null,
      stock: parsed.data.stock ?? null,
      enabled: parsed.data.enabled ?? true,
    })
    .returning();

  await logAdminAction("create_gift", `Created gift: ${parsed.data.name}`);

  res.status(201).json({
    id: gift.id,
    name: gift.name,
    description: gift.description,
    coinPrice: gift.coinPrice,
    imageUrl: gift.imageUrl,
    stock: gift.stock,
    enabled: gift.enabled,
  });
});

// PATCH /api/admin/gifts/:giftId
router.patch("/gifts/:giftId", async (req, res) => {
  if (!validateToken(req, res)) return;

  const paramsP = AdminUpdateGiftParams.safeParse({ giftId: parseInt(req.params.giftId) });
  const bodyP = AdminUpdateGiftBody.safeParse(req.body);
  if (!paramsP.success || !bodyP.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const [gift] = await db
    .update(giftsTable)
    .set(bodyP.data)
    .where(eq(giftsTable.id, paramsP.data.giftId))
    .returning();

  if (!gift) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }

  await logAdminAction("update_gift", `Updated gift ${paramsP.data.giftId}`);

  res.json({
    id: gift.id,
    name: gift.name,
    description: gift.description,
    coinPrice: gift.coinPrice,
    imageUrl: gift.imageUrl,
    stock: gift.stock,
    enabled: gift.enabled,
  });
});

// DELETE /api/admin/gifts/:giftId
router.delete("/gifts/:giftId", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminDeleteGiftParams.safeParse({ giftId: parseInt(req.params.giftId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  await db.delete(giftsTable).where(eq(giftsTable.id, parsed.data.giftId));
  await logAdminAction("delete_gift", `Deleted gift ${parsed.data.giftId}`);

  res.status(204).end();
});

// PATCH /api/admin/settings
router.patch("/settings", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminUpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.errors });
    return;
  }

  const data = parsed.data;

  const settingMap: Record<string, string | undefined> = {
    maintenance_mode: data.maintenanceMode !== undefined ? String(data.maintenanceMode) : undefined,
    wheel_enabled: data.wheelEnabled !== undefined ? String(data.wheelEnabled) : undefined,
    referrals_enabled: data.referralsEnabled !== undefined ? String(data.referralsEnabled) : undefined,
    gifts_enabled: data.giftsEnabled !== undefined ? String(data.giftsEnabled) : undefined,
    redeem_enabled: data.redeemEnabled !== undefined ? String(data.redeemEnabled) : undefined,
    account_enabled: data.accountEnabled !== undefined ? String(data.accountEnabled) : undefined,
    referrals_required: data.referralsRequired !== undefined ? String(data.referralsRequired) : undefined,
    referral_reward_type: data.referralRewardType,
    referral_reward_amount: data.referralRewardAmount !== undefined ? String(data.referralRewardAmount) : undefined,
    bot_username: data.botUsername,
  };

  for (const [key, value] of Object.entries(settingMap)) {
    if (value !== undefined) {
      await db
        .insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
    }
  }

  await logAdminAction("update_settings", `Updated: ${Object.keys(data).join(", ")}`);

  const getVal = async (k: string, def: string) => {
    const row = await db.query.settingsTable.findFirst({ where: eq(settingsTable.key, k) });
    return row?.value ?? def;
  };

  const [mm, we, re, ge, red, ae, rr, rrt, rra, bu] = await Promise.all([
    getVal("maintenance_mode", "false"),
    getVal("wheel_enabled", "true"),
    getVal("referrals_enabled", "true"),
    getVal("gifts_enabled", "true"),
    getVal("redeem_enabled", "true"),
    getVal("account_enabled", "true"),
    getVal("referrals_required", "5"),
    getVal("referral_reward_type", "spins"),
    getVal("referral_reward_amount", "1"),
    getVal("bot_username", "mini_7DOGS_bot"),
  ]);

  res.json({
    maintenanceMode: mm === "true",
    wheelEnabled: we === "true",
    referralsEnabled: re === "true",
    giftsEnabled: ge === "true",
    redeemEnabled: red === "true",
    accountEnabled: ae === "true",
    referralsRequired: parseInt(rr),
    referralRewardType: rrt,
    referralRewardAmount: parseInt(rra),
    botUsername: bu,
  });
});

// POST /api/admin/broadcast
router.post("/broadcast", async (req, res) => {
  if (!validateToken(req, res)) return;

  const { text, parseMode = "HTML", photoUrl } = req.body as {
    text?: string;
    parseMode?: string;
    photoUrl?: string | null;
  };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    res.status(503).json({ error: "BOT_TOKEN not configured" });
    return;
  }

  const users = await db.select({ telegramId: usersTable.telegramId }).from(usersTable);

  const total = users.length;
  let sent = 0;
  let failed = 0;

  const DELAY_MS = 50;

  for (const user of users) {
    try {
      const telegramId = user.telegramId;
      let url: string;
      let body: Record<string, unknown>;

      if (photoUrl) {
        url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        body = { chat_id: telegramId, photo: photoUrl, caption: text, parse_mode: parseMode };
      } else {
        url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        body = { chat_id: telegramId, text, parse_mode: parseMode };
      }

      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (resp.ok) {
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  await logAdminAction("broadcast", `Sent to ${sent}/${total} users`);

  res.json({ total, sent, failed });
});

// GET /api/admin/logs
router.get("/logs", async (req, res) => {
  if (!validateToken(req, res)) return;

  const parsed = AdminGetLogsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 50) : 50;

  const logs = await db.query.adminLogsTable.findMany({
    orderBy: [desc(adminLogsTable.createdAt)],
    limit,
  });

  res.json(logs.map((l) => ({
    id: l.id,
    action: l.action,
    details: l.details,
    createdAt: l.createdAt.toISOString(),
  })));
});

// POST /api/admin/set-menu-button
// Sets the persistent Telegram bot menu button to open the mini app
router.post("/set-menu-button", async (req, res) => {
  if (!validateToken(req, res)) return;

  const { miniAppUrl } = req.body as { miniAppUrl?: string };
  const url = miniAppUrl || process.env.MINI_APP_URL;

  if (!url) {
    res.status(400).json({ error: "miniAppUrl is required (or set MINI_APP_URL env var)" });
    return;
  }

  const botToken = process.env.BOT_TOKEN;
  if (!botToken) {
    res.status(503).json({ error: "BOT_TOKEN not configured" });
    return;
  }

  try {
    const resp = await fetch(`https://api.telegram.org/bot${botToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "🎰 Open 7DOGS App",
          web_app: { url },
        },
      }),
    });

    const data = await resp.json() as { ok: boolean; description?: string };

    if (!data.ok) {
      res.status(400).json({ error: data.description ?? "Telegram API error" });
      return;
    }

    await logAdminAction("set_menu_button", `Menu button set to: ${url}`);
    res.json({ ok: true, url });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/fetch-og-image?url=...
// Fetches Open Graph image from a URL (used for t.me/nft gift links)
router.get("/fetch-og-image", async (req, res) => {
  if (!validateToken(req, res)) return;

  const { url } = req.query as { url?: string };
  if (!url) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        "User-Agent": "TelegramBot/1.0 (compatible; like Twitterbot)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      res.json({ imageUrl: null });
      return;
    }

    const html = await response.text();

    // Try og:image first, then twitter:image
    const patterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    ];

    let imageUrl: string | null = null;
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) {
        imageUrl = match[1];
        break;
      }
    }

    res.json({ imageUrl });
  } catch {
    res.json({ imageUrl: null });
  }
});

export default router;
