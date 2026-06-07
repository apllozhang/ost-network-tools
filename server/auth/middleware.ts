import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt.js";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; username: string; role: string };
    }
  }
}

export function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const token = req.cookies?.ost_session;
  if (token) {
    verifyToken(token).then((payload) => {
      if (payload) {
        req.user = payload;
      }
      next();
    }).catch(() => {
      next();
    });
  } else {
    next();
  }
}
