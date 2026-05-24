import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, wheelSegmentsTable, spinsTable, settingsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  SpinWheelBody,
  GetSpinHistoryQueryParams,
} from "@workspace/api-zod";

const router = Router();

// GET /api/wheel/segments
router.get("/segments", async (req, res) => {
  const segments = await db.query.wheelSegmentsTable.findMany({
    where: eq(wheelSegmentsTable.enabled, true),
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

// POST /api/wheel/spin
router.post("/spin", async (req, res) => {
  const parsed = SpinWheelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const { userId } = parsed.data;

  // Check maintenance mode
  const maintenanceRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "maintenance_mode"),
  });
  if (maintenanceRow?.value === "true") {
    res.status(400).json({ error: "App is under maintenance" });
    return;
  }

  // Check wheel enabled
  const wheelEnabledRow = await db.query.settingsTable.findFirst({
    where: eq(settingsTable.key, "wheel_enabled"),
  });
  if (wheelEnabledRow?.value === "false") {
    res.status(400).json({ error: "Wheel is disabled" });
    return;
  }

  // Get user
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, userId),
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.spins <= 0) {
    res.status(400).json({ error: "No spins remaining" });
    return;
  }

  // Get enabled segments
  const segments = await db.query.wheelSegmentsTable.findMany({
    where: eq(wheelSegmentsTable.enabled, true),
  });
  if (!segments.length) {
    res.status(400).json({ error: "No wheel segments available" });
    return;
  }

  // Weighted random selection
  const totalWeight = segments.reduce((sum, s) => sum + s.probability, 0);
  let rand = Math.random() * totalWeight;
  let chosen = segments[0]!;
  for (const seg of segments) {
    rand -= seg.probability;
    if (rand <= 0) {
      chosen = seg;
      break;
    }
  }

  // Calculate landing angle
  const segmentAngle = 360 / segments.length;
  const segIndex = segments.findIndex((s) => s.id === chosen.id);
  const landingAngle = segIndex * segmentAngle + segmentAngle / 2;
  const fullRotations = 5 + Math.floor(Math.random() * 3);
  const finalAngle = fullRotations * 360 + landingAngle;

  // Deduct spin, credit reward
  const updates: { spins?: ReturnType<typeof sql>; coins?: ReturnType<typeof sql> } = {
    spins: sql`${usersTable.spins} - 1`,
  };
  if (chosen.rewardType === "coins") {
    updates.coins = sql`${usersTable.coins} + ${chosen.rewardAmount}`;
  } else if (chosen.rewardType === "spins") {
    updates.spins = sql`${usersTable.spins} - 1 + ${chosen.rewardAmount}`;
  }

  const [updatedUser] = await db
    .update(usersTable)
    .set(updates as Parameters<typeof db.update>[0] extends infer T ? any : any)
    .where(eq(usersTable.id, userId))
    .returning();

  // Record spin
  await db.insert(spinsTable).values({
    userId,
    segmentId: chosen.id,
    label: chosen.label,
    rewardType: chosen.rewardType,
    rewardAmount: chosen.rewardAmount,
  });

  res.json({
    segmentId: chosen.id,
    label: chosen.label,
    rewardType: chosen.rewardType,
    rewardAmount: chosen.rewardAmount,
    newCoins: updatedUser.coins,
    newSpins: updatedUser.spins,
    landingAngle: finalAngle,
  });
});

// GET /api/wheel/history
router.get("/history", async (req, res) => {
  const parsed = GetSpinHistoryQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const { userId, limit } = parsed.data;

  const history = await db.query.spinsTable.findMany({
    where: eq(spinsTable.userId, userId),
    orderBy: [desc(spinsTable.createdAt)],
    limit: limit ?? 20,
  });

  res.json(history.map((s) => ({
    id: s.id,
    userId: s.userId,
    segmentId: s.segmentId,
    label: s.label,
    rewardType: s.rewardType,
    rewardAmount: s.rewardAmount,
    createdAt: s.createdAt.toISOString(),
  })));
});

export default router;
