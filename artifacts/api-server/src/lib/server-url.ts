import type { Request } from "express";

/**
 * Resolves the public base URL of the server using env vars, in priority order:
 *
 * 1. SERVER_URL        — explicit override (set this in Vercel / any platform)
 * 2. VERCEL_PROJECT_PRODUCTION_URL — Vercel stable production domain (no https://)
 * 3. VERCEL_URL        — Vercel per-deployment URL (no https://)
 * 4. Derived from the incoming Express request (local dev / fallback)
 * 5. http://localhost:8080
 *
 * Always returns a URL with no trailing slash.
 */
export function getServerUrl(req?: Request): string {
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (req) {
    const proto =
      (req.headers["x-forwarded-proto"] as string | undefined) ??
      req.protocol ??
      "http";
    const host =
      (req.headers["x-forwarded-host"] as string | undefined) ??
      req.headers.host ??
      "localhost:8080";
    return `${proto}://${host}`;
  }

  return "http://localhost:8080";
}
