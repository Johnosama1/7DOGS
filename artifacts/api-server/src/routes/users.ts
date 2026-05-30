import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralsTable, settingsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetMeQueryParams,
  GetUserParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/users/me — get or create user by telegramId
router.get("/me", async (req, res) => {
  const parsed = GetMeQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { telegramId, firstName, lastName, username, referralCode } = parsed.data;

  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.telegramId, telegramId),
  });

  if (!user) {
    // New user — check for referral
    let referrerId: number | undefined;
    if (referralCode) {
      // referralCode is the referrer's telegramId (from t.me/bot?start={telegramId})
      const referrer = await db.query.usersTable.findFirst({
        where: eq(usersTable.telegramId, referralCode),
      });
      if (referrer && referrer.telegramId !== telegramId) {
        referrerId = referrer.id;
      }
    }

    const [created] = await db
      .insert(usersTable)
      .values({
        telegramId,
        firstName: firstName ?? "User",
        lastName: lastName ?? null,
        username: username ?? null,
        coins: 0,
        spins: 1,
        totalReferrals: 0,
        referredBy: referrerId ?? null,
      })
      .returning();

    // If referred, record referral and possibly reward referrer
    if (referrerId && created) {
      // Check if this referral already exists
      const existingReferral = await db.query.referralsTable.findFirst({
        where: eq(referralsTable.referredId, created.id),
      });

      if (!existingReferral) {
        await db.insert(referralsTable).values({
          referrerId,
          referredId: created.id,
        });

        // Increment referrer's total_referrals
        await db
          .update(usersTable)
          .set({ totalReferrals: sql`${usersTable.totalReferrals} + 1` })
          .where(eq(usersTable.id, referrerId));

        // Check if referrer should get a reward
        const referrer = await db.query.usersTable.findFirst({
          where: eq(usersTable.id, referrerId),
        });

        // Get referral settings
        const refRequiredRow = await db.query.settingsTable.findFirst({
          where: eq(settingsTable.key, "referrals_required"),
        });
        const refRewardTypeRow = await db.query.settingsTable.findFirst({
          where: eq(settingsTable.key, "referral_reward_type"),
        });
        const refRewardAmountRow = await db.query.settingsTable.findFirst({
          where: eq(settingsTable.key, "referral_reward_amount"),
        });

        const referralsRequired = parseInt(refRequiredRow?.value ?? "5");
        const rewardType = refRewardTypeRow?.value ?? "spins";
        const rewardAmount = parseInt(refRewardAmountRow?.value ?? "1");

        if (referrer && referrer.totalReferrals % referralsRequired === 0) {
          if (rewardType === "spins") {
            await db
              .update(usersTable)
              .set({ spins: sql`${usersTable.spins} + ${rewardAmount}` })
              .where(eq(usersTable.id, referrerId));
          } else {
            await db
              .update(usersTable)
              .set({ coins: sql`${usersTable.coins} + ${rewardAmount}` })
              .where(eq(usersTable.id, referrerId));
          }
        }
      }
    }

    user = created!;
  } else {
    // Update name if changed
    if (firstName && firstName !== user.firstName) {
      const [updated] = await db
        .update(usersTable)
        .set({ firstName, lastName: lastName ?? user.lastName, username: username ?? user.username })
        .where(eq(usersTable.id, user.id))
        .returning();
      user = updated;
    }
  }

  res.json({
    id: user.id,
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    coins: user.coins,
    spins: user.spins,
    totalReferrals: user.totalReferrals,
    createdAt: user.createdAt.toISOString(),
  });
});

// GET /api/users/stats — global stats
router.get("/stats", async (req, res) => {
  const [totalUsersRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const [coinsRow] = await db
    .select({ total: sql<number>`coalesce(sum(coins), 0)::int` })
    .from(usersTable);

  const { spinsTable, redemptionsTable } = await import("@workspace/db");
  const [spinsRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(spinsTable);

  const [redRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(redemptionsTable);

  res.json({
    totalUsers: totalUsersRow?.count ?? 0,
    totalCoinsIssued: coinsRow?.total ?? 0,
    totalSpins: spinsRow?.count ?? 0,
    totalRedemptions: redRow?.count ?? 0,
  });
});

// GET /api/users/photo/:telegramId — fetch Telegram profile photo URL
router.get("/photo/:telegramId", async (req, res) => {
  const telegramId = req.params.telegramId;
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    res.status(503).json({ error: "BOT_TOKEN not configured" });
    return;
  }

  try {
    const photosResp = await fetch(
      `https://api.telegram.org/bot${botToken}/getUserProfilePhotos?user_id=${telegramId}&limit=1`
    );
    const photosData = await photosResp.json() as any;

    if (!photosData.ok || !photosData.result?.photos?.length) {
      res.json({ photoUrl: null });
      return;
    }

    // Get the largest photo (last in the array)
    const photos = photosData.result.photos[0];
    const largestPhoto = photos[photos.length - 1];
    const fileId = largestPhoto.file_id;

    const fileResp = await fetch(
      `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const fileData = await fileResp.json() as any;

    if (!fileData.ok || !fileData.result?.file_path) {
      res.json({ photoUrl: null });
      return;
    }

    const photoUrl = `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`;
    res.json({ photoUrl });
  } catch {
    res.json({ photoUrl: null });
  }
});

// GET /api/users/:userId
router.get("/:userId", async (req, res) => {
  const parsed = GetUserParams.safeParse({ userId: parseInt(req.params.userId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, parsed.data.userId),
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    telegramId: user.telegramId,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    coins: user.coins,
    spins: user.spins,
    totalReferrals: user.totalReferrals,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
