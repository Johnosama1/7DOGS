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
import { eq, like, or, sql, desc, ilike } from "drizzle-orm";
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

export const ADMIN_TOKENS = new Set<string>();

function validateToken(req: any, res: any): boolean {
  const token = req.headers["x-admin-token"];
  if (!token || !ADMIN_TOKENS.has(token as string)) {
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

  const token = crypto.randomBytes(32).toString("hex");
  ADMIN_TOKENS.add(token);

  // Auto-expire token after 24 hours
  setTimeout(() => ADMIN_TOKENS.delete(token), 24 * 60 * 60 * 1000);

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
      usersTable.telegramId.mapWith(String) ? ilike(usersTable.telegramId, `%${search}%`) : undefined
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
    res.status(400).json({ error: "Invalid body" });
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
  const updates = bodyP.data;

  const [segment] = await db
    .update(wheelSegmentsTable)
    .set(updates)
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
    res.status(400).json({ error: "Invalid body" });
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
    res.status(400).json({ error: "Invalid body" });
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

  // Return updated settings
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
    getVal("bot_username", "SevenDogsBot"),
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

export default router;
