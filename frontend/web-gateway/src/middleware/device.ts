import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

declare global {
  namespace Express {
    interface Request {
      deviceId?: string;
    }
  }
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function deviceMiddleware(opts?: { secure?: boolean }) {
  const secure = !!opts?.secure;

  return (req: Request, res: Response, next: NextFunction) => {
    const existing = req.cookies?.device_id as string | undefined;
    const isValid = (v?: string) =>
      !!v && /^[A-Za-z0-9_\-:.]{8,128}$/.test(v);

    let id = existing && isValid(existing) ? existing : uuidv4();
    if (!existing || !isValid(existing)) {
      res.cookie("device_id", id, {
        httpOnly: true,
        secure,             // true in prod (HTTPS)
        sameSite: "lax",
        maxAge: ONE_YEAR_MS,
        path: "/",
      });
    }

    req.deviceId = id;
    next();
  };
}
