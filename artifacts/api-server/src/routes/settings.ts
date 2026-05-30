import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

async function getSettingValue(key: string, defaultValue: string): Promise<string> {
  const row = await db.query.settingsTable.findFirst({ where: eq(settingsTable.key, key) });
  return row?.value ?? defaultValue;
}

// GET /api/settings
router.get("/", async (req, res) => {
  const [
    maintenanceMode,
    wheelEnabled,
    referralsEnabled,
    giftsEnabled,
    redeemEnabled,
    accountEnabled,
    referralsRequired,
    referralRewardType,
    referralRewardAmount,
    botUsername,
  ] = await Promise.all([
    getSettingValue("maintenance_mode", "false"),
    getSettingValue("wheel_enabled", "true"),
    getSettingValue("referrals_enabled", "true"),
    getSettingValue("gifts_enabled", "true"),
    getSettingValue("redeem_enabled", "true"),
    getSettingValue("account_enabled", "true"),
    getSettingValue("referrals_required", "5"),
    getSettingValue("referral_reward_type", "spins"),
    getSettingValue("referral_reward_amount", "1"),
    getSettingValue("bot_username", "mini_7DOGS_bot"),
  ]);

  res.json({
    maintenanceMode: maintenanceMode === "true",
    wheelEnabled: wheelEnabled === "true",
    referralsEnabled: referralsEnabled === "true",
    giftsEnabled: giftsEnabled === "true",
    redeemEnabled: redeemEnabled === "true",
    accountEnabled: accountEnabled === "true",
    referralsRequired: parseInt(referralsRequired),
    referralRewardType,
    referralRewardAmount: parseInt(referralRewardAmount),
    botUsername,
  });
});

export default router;
