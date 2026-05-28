import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wheelSegmentsTable = pgTable("wheel_segments", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  rewardType: text("reward_type").notNull().default("coins"), // coins | spins | gift
  rewardAmount: integer("reward_amount").notNull().default(0),
  giftId: integer("gift_id"),
  probability: real("probability").notNull().default(1),
  color: text("color").notNull().default("#D4AF37"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWheelSegmentSchema = createInsertSchema(wheelSegmentsTable).omit({ id: true, createdAt: true });
export type InsertWheelSegment = z.infer<typeof insertWheelSegmentSchema>;
export type WheelSegment = typeof wheelSegmentsTable.$inferSelect;

export const spinsTable = pgTable("spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  segmentId: integer("segment_id").notNull(),
  label: text("label").notNull(),
  rewardType: text("reward_type").notNull(),
  rewardAmount: integer("reward_amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSpinSchema = createInsertSchema(spinsTable).omit({ id: true, createdAt: true });
export type InsertSpin = z.infer<typeof insertSpinSchema>;
export type Spin = typeof spinsTable.$inferSelect;
