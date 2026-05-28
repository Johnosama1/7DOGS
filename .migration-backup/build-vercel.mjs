/**
 * Root Vercel build script — called by Vercel's buildCommand.
 *
 * Steps:
 *   1. Build API handler → api/index.mjs  (via api-server's own esbuild)
 *   2. Build frontend   → artifacts/7dogs/dist/public  (via Vite)
 */

import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

function run(cmd, env = {}) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, {
    stdio: "inherit",
    cwd: rootDir,
    env: { ...process.env, ...env },
  });
}

// 1 — Build API serverless handler (esbuild lives inside api-server package)
run("pnpm --filter @workspace/api-server run build:vercel");

// 2 — Build Vite frontend (BASE_PATH=/ for Vercel root deployment)
run("pnpm --filter @workspace/7dogs run build", {
  BASE_PATH: "/",
  PORT: "3000",
  NODE_ENV: "production",
});

console.log("\n🚀 Vercel build complete!");
