import { NextFunction, Request, Response } from "express";

type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();

export function burstLimiter(ratePerSec = 20) {
  const capacity = ratePerSec;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
               req.ip || "0.0.0.0";

    const now = Date.now();
    const b = buckets.get(ip) || { tokens: capacity, last: now };
    // refill
    const delta = (now - b.last) / 1000;
    b.tokens = Math.min(capacity, b.tokens + delta * ratePerSec);
    b.last = now;

    if (b.tokens < 1) {
      res.status(429).json({ error: "rate_limited_burst" });
      return;
    }
    b.tokens -= 1;
    buckets.set(ip, b);
    next();
  };
}
