import { router, publicProcedure, adminProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { signToken, verifyToken, setAuthCookie, clearAuthCookie } from "../auth/jwt.js";
import { logAudit } from "../audit/logger.js";

export const authRouter = router({
  login: publicProcedure
    .input(z.object({ username: z.string().min(1), password: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const [user] = await db
        .select({
          id: users.id,
          username: users.username,
          passwordHash: users.passwordHash,
          displayName: users.displayName,
          role: users.role,
          isActive: users.isActive,
        })
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (!user || !user.isActive) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      }

      const token = await signToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      setAuthCookie(ctx.res, token);

      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      await logAudit({
        userId: user.id,
        username: user.username,
        action: "login",
        objectType: "user",
        objectId: user.id,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    const token = ctx.req.cookies?.ost_session;
    let logoutUser: { userId: string; username: string } | null = null;
    if (token) {
      logoutUser = await verifyToken(token);
    }

    clearAuthCookie(ctx.res);

    if (logoutUser) {
      await logAudit({
        userId: logoutUser.userId,
        username: logoutUser.username,
        action: "logout",
        objectType: "user",
        objectId: logoutUser.userId,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });
    }

    return { success: true };
  }),

  me: publicProcedure.query(async ({ ctx }) => {
    const token = ctx.req.cookies?.ost_session;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) return null;

    return user;
  }),

  register: adminProcedure
    .input(
      z.object({
        username: z.string().min(2).max(64),
        password: z.string().min(6),
        displayName: z.string().min(1).max(128),
        email: z.string().email().optional(),
        role: z.enum(["admin", "operator", "viewer"]).default("viewer"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Username already exists" });
      }

      const id = uuid();
      const passwordHash = await hashPassword(input.password);

      await db.insert(users).values({
        id,
        username: input.username,
        passwordHash,
        displayName: input.displayName,
        email: input.email ?? null,
        role: input.role,
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "create",
        objectType: "user",
        objectId: id,
        afterValue: { username: input.username, displayName: input.displayName, role: input.role },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { id, username: input.username, displayName: input.displayName, role: input.role };
    }),
});
