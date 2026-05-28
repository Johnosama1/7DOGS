-- 7DOGS Bot — initial schema
-- Run once on your Postgres database before starting the bot

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username    TEXT,
  coins       INTEGER DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prizes (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  value       INTEGER NOT NULL,
  probability FLOAT NOT NULL
);

CREATE TABLE IF NOT EXISTS spins (
  id          SERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(telegram_id),
  cost        INTEGER NOT NULL,
  prize       TEXT NOT NULL,
  prize_value INTEGER,
  spun_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id           SERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(telegram_id),
  prize        TEXT NOT NULL,
  status       TEXT DEFAULT 'pending',
  requested_at TIMESTAMP DEFAULT NOW()
);

-- Default prize pool (total probability must equal 1.0)
INSERT INTO prizes (name, value, probability) VALUES
  ('💎 Diamond Jackpot', 500, 0.01),
  ('🥇 Gold Prize',      200, 0.04),
  ('🥈 Silver Prize',    100, 0.10),
  ('🎁 Bonus Coins',      50, 0.20),
  ('🎀 Small Reward',     20, 0.30),
  ('🔄 Try Again',          0, 0.35)
ON CONFLICT DO NOTHING;
