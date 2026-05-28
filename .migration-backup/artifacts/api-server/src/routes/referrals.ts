import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, referralsTable, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetReferralsQueryParams } from "@workspace/api-zod";

const router = Router();

// GET /api/referrals
router.get("/", async (req, res) => {
  const parsed = GetReferralsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { userId } = parsed.data;

  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Get settings
  const refRequiredRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "referrals_required"),
  });
  const refRewardTypeRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "referral_reward_type"),
  });
  const refRewardAmountRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "referral_reward_amount"),
  });
  const botUsernameRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "bot_username"),
  });

  const referralsRequired = parseInt(refRequiredRow?.value ?? "5");
  const rewardType = refRewardTypeRow?.value ?? "spins";
  const rewardAmount = parseInt(refRewardAmountRow?.value ?? "1");
  const botUsername = botUsernameRow?.value ?? "SevenDogsBot";

  // Get referred users
  const myReferrals = await db.query.referralsTable.findMany({
    where: eq(referralsTable.referrerId, userId),
  });

  const referralList = [];
  for (const ref of myReferrals) {
    const refUser = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, ref.referredId),
    });
    if (refUser) {
      referralList.push({
        id: refUser.id,
        firstName: refUser.firstName,
        username: refUser.username,
        joinedAt: ref.createdAt.toISOString(),
      });
    }
  }

  const completedCycles = Math.floor(user.totalReferrals / referralsRequired);
  const nextRewardAt = (completedCycles + 1) * referralsRequired;

  res.json({
    userId: user.id,
    referralLink: `https://t.me/${botUsername}?start=${user.id}`,
    totalReferrals: user.totalReferrals,
    referralsRequired,
    rewardType,
    rewardAmount,
    nextRewardAt,
    referralList,
  });
});

export default router;
