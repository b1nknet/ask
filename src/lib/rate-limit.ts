import { createHmac } from "node:crypto";
import { getClientIp } from "@/lib/client-ip";
import { getAuthSettings } from "@/lib/env";

type Bucket = { count: number; expiresAt: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly maxBuckets = 10_000,
  ) {}

  consume(key: string, now = Date.now()) {
    for (const [id, bucket] of this.buckets) {
      if (bucket.expiresAt <= now) this.buckets.delete(id);
    }

    const bucket = this.buckets.get(key);
    if (!bucket) {
      // Refuse new buckets at capacity instead of evicting active limits.
      if (this.buckets.size >= this.maxBuckets) return { allowed: false, retryAfter: 60 };
      this.buckets.set(key, { count: 1, expiresAt: now + this.windowMs });
      return { allowed: true, retryAfter: 0 };
    }

    if (bucket.count >= this.max) {
      return { allowed: false, retryAfter: Math.ceil((bucket.expiresAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfter: 0 };
  }
}

// Keep counters through development hot reloads. Nothing is written to SQLite.
const globalForLimits = globalThis as unknown as {
  questionLimiter?: RateLimiter;
  setupLimiter?: RateLimiter;
};
export const questionLimiter = (globalForLimits.questionLimiter ??= new RateLimiter(5, 60_000));
export const setupLimiter = (globalForLimits.setupLimiter ??= new RateLimiter(5, 60_000));

export function getClientKey(headers: Headers) {
  const address = getClientIp(headers) ?? "shared";
  return createHmac("sha256", getAuthSettings().secret).update(address).digest("hex");
}
