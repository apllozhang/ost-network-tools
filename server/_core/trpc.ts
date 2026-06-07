import type * as express from "express";
import { initTRPC } from "@trpc/server";

export type Context = {
  req: express.Request;
  res: express.Response;
  userId?: string;
  username?: string;
  role?: string;
};

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const createCallerFactory = t.createCallerFactory;

const isAuthenticated = middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new Error("UNAUTHORIZED");
  }
  return next({ ctx });
});

const isAdmin = middleware(({ ctx, next }) => {
  if (!ctx.userId || ctx.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);
