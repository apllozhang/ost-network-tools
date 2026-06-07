import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import { monitorTargets, probeResults, devices } from "../../drizzle/schema.js";
import { logAudit } from "../audit/logger.js";

export const monitorRouter = router({
  list: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        id: monitorTargets.id,
        deviceId: monitorTargets.deviceId,
        deviceName: devices.name,
        deviceIp: devices.ipAddress,
        targetType: monitorTargets.targetType,
        target: monitorTargets.target,
        port: monitorTargets.port,
        intervalSeconds: monitorTargets.intervalSeconds,
        timeoutMs: monitorTargets.timeoutMs,
        enabled: monitorTargets.enabled,
        threshold: monitorTargets.threshold,
        createdAt: monitorTargets.createdAt,
        updatedAt: monitorTargets.updatedAt,
      })
      .from(monitorTargets)
      .leftJoin(devices, eq(monitorTargets.deviceId, devices.id))
      .orderBy(desc(monitorTargets.createdAt));
    return rows;
  }),

  create: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        targetType: z.enum(["ping", "tcp", "http", "dns", "snmp"]),
        target: z.string(),
        port: z.number().optional(),
        intervalSeconds: z.number().default(60),
        timeoutMs: z.number().default(3000),
        threshold: z
          .object({
            latencyMs: z.number().optional(),
            packetLossRate: z.number().optional(),
            failCount: z.number().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { v4: uuid } = await import("uuid");
      const id = uuid();
      await db.insert(monitorTargets).values({
        id,
        deviceId: input.deviceId,
        targetType: input.targetType,
        target: input.target,
        port: input.port ?? null,
        intervalSeconds: input.intervalSeconds,
        timeoutMs: input.timeoutMs,
        threshold: input.threshold ?? null,
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "create",
        objectType: "monitor",
        objectId: id,
        afterValue: { deviceId: input.deviceId, targetType: input.targetType, target: input.target },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await db.delete(probeResults).where(eq(probeResults.monitorId, input.id));
      await db.delete(monitorTargets).where(eq(monitorTargets.id, input.id));

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "delete",
        objectType: "monitor",
        objectId: input.id,
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  getResults: protectedProcedure
    .input(
      z.object({
        monitorId: z.string(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(probeResults)
        .where(eq(probeResults.monitorId, input.monitorId))
        .orderBy(desc(probeResults.createdAt))
        .limit(input.limit);
      return rows;
    }),
});
