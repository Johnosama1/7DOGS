import { Router } from "express";
import { db } from "@workspace/db";
import { giftsTable, redemptionsTable, usersTable, settingsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import {
  RedeemGiftParams,
  RedeemGiftBody,
  GetMyRedemptionsQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/gifts
router.get("/", async (req, res) => {
  const gifts = await db.query.giftsTable.findMany({
    orderBy: [giftsTable.id],
  });

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

// GET /api/gifts/my-redemptions
router.get("/my-redemptions", async (req, res) => {
  const parsed = GetMyRedemptionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { userId } = parsed.data;

  const redemptions = await db.query.redemptionsTable.findMany({
    where: eq(redemptionsTable.userId, userId),
    orderBy: [redemptionsTable.createdAt],
  });

  res.json(redemptions.map((r) => ({
    id: r.id,
    userId: r.userId,
    giftId: r.giftId,
    giftName: r.giftName,
    giftImageUrl: r.giftImageUrl,
    coinsCost: r.coinsCost,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  })));
});

// POST /api/gifts/:giftId/redeem
router.post("/:giftId/redeem", async (req, res) => {
  const paramsP = RedeemGiftParams.safeParse({ giftId: parseInt(req.params.giftId) });
  const bodyP = RedeemGiftBody.safeParse(req.body);

  if (!paramsP.success || !bodyP.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }

  const { giftId } = paramsP.data;
  const { userId } = bodyP.data;

  // Check settings
  const redeemEnabledRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "redeem_enabled"),
  });
  if (redeemEnabledRow?.value === "false") {
    res.status(400).json({ error: "Redemption is currently disabled" });
    return;
  }

  const gift = await db.query.giftsTable.findFirst({
    where: eq(giftsTable.id, giftId),
  });
  if (!gift) {
    res.status(404).json({ error: "Gift not found" });
    return;
  }
  if (!gift.enabled) {
    res.status(400).json({ error: "Gift is not available" });
    return;
  }
  if (gift.stock !== null && gift.stock <= 0) {
    res.status(400).json({ error: "Gift is out of stock" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.coins < gift.coinPrice) {
    res.status(400).json({ error: "Insufficient coins" });
    return;
  }

  // Deduct coins
  await db
    .update(usersTable)
    .set({ coins: sql`${usersTable.coins} - ${gift.coinPrice}` })
    .where(eq(usersTable.id, userId));

  // Decrement stock if finite
  if (gift.stock !== null) {
    await db
      .update(giftsTable)
      .set({ stock: sql`${giftsTable.stock} - 1` })
      .where(eq(giftsTable.id, giftId));
  }

  // Create redemption
  const [redemption] = await db
    .insert(redemptionsTable)
    .values({
      userId,
      giftId,
      giftName: gift.name,
      giftImageUrl: gift.imageUrl,
      coinsCost: gift.coinPrice,
      status: "pending",
    })
    .returning();

  res.json({
    id: redemption.id,
    userId: redemption.userId,
    giftId: redemption.giftId,
    giftName: redemption.giftName,
    giftImageUrl: redemption.giftImageUrl,
    coinsCost: redemption.coinsCost,
    status: redemption.status,
    createdAt: redemption.createdAt.toISOString(),
  });
});

export default router;
