"use strict";

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

// ── Users ────────────────────────────────────────────────────────────────────

async function getOrCreateUser(telegramId, username) {
  const { rows } = await pool.query(
    `INSERT INTO bot_users (telegram_id, username)
     VALUES ($1, $2)
     ON CONFLICT (telegram_id) DO UPDATE SET username = EXCLUDED.username
     RETURNING *`,
    [telegramId, username ?? null]
  );
  return rows[0];
}

async function getUserByTelegramId(telegramId) {
  const { rows } = await pool.query(
    "SELECT * FROM bot_users WHERE telegram_id = $1",
    [telegramId]
  );
  return rows[0] ?? null;
}

async function addCoins(telegramId, amount) {
  const { rows } = await pool.query(
    `UPDATE bot_users SET coins = coins + $2
     WHERE telegram_id = $1
     RETURNING *`,
    [telegramId, amount]
  );
  return rows[0] ?? null;
}

async function deductCoins(telegramId, amount) {
  const { rows } = await pool.query(
    `UPDATE bot_users
     SET coins = GREATEST(0, coins - $2)
     WHERE telegram_id = $1 AND coins >= $2
     RETURNING *`,
    [telegramId, amount]
  );
  return rows[0] ?? null;
}

// ── Prizes ───────────────────────────────────────────────────────────────────

async function getAllPrizes() {
  const { rows } = await pool.query(
    "SELECT * FROM bot_prizes ORDER BY probability DESC"
  );
  return rows;
}

function pickPrize(prizes) {
  const rand = Math.random();
  let cumulative = 0;
  for (const prize of prizes) {
    cumulative += prize.probability;
    if (rand < cumulative) return prize;
  }
  return prizes[prizes.length - 1];
}

// ── Spins ────────────────────────────────────────────────────────────────────

async function recordSpin(telegramId, cost, prizeName, prizeValue) {
  await pool.query(
    `INSERT INTO bot_spins (user_id, cost, prize, prize_value)
     VALUES ($1, $2, $3, $4)`,
    [telegramId, cost, prizeName, prizeValue]
  );
}

async function getUserSpins(telegramId, limit = 10) {
  const { rows } = await pool.query(
    `SELECT * FROM bot_spins WHERE user_id = $1
     ORDER BY spun_at DESC LIMIT $2`,
    [telegramId, limit]
  );
  return rows;
}

// ── Withdrawals ──────────────────────────────────────────────────────────────

async function createWithdrawal(telegramId, prize) {
  const { rows } = await pool.query(
    `INSERT INTO bot_withdrawals (user_id, prize)
     VALUES ($1, $2)
     RETURNING *`,
    [telegramId, prize]
  );
  return rows[0];
}

async function getPendingWithdrawals(limit = 50) {
  const { rows } = await pool.query(
    `SELECT w.*, u.username
     FROM bot_withdrawals w
     JOIN bot_users u ON u.telegram_id = w.user_id
     WHERE w.status = 'pending'
     ORDER BY w.requested_at ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

module.exports = {
  pool,
  getOrCreateUser,
  getUserByTelegramId,
  addCoins,
  deductCoins,
  getAllPrizes,
  pickPrize,
  recordSpin,
  getUserSpins,
  createWithdrawal,
  getPendingWithdrawals,
};
