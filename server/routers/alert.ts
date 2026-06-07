import { router, protectedProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import {
  alerts,
  alertTimeline,
  devices,
  sites,
  users,
} from "../../drizzle/schema.js";
import {
  eq,
  and,
  or,
  like,
  desc,
  asc,
  sql,
  count,
  inArray,
} from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { PaginatedResponse } from "../../shared/types.js";
import { canTransition, transition } from "../alerts/state-machine.js";
import { logAudit } from "../audit/logger.js";

// ── Input schemas ─────────────────────────────────────────────────────

type AlertSeverity = "critical" | "major" | "minor" | "warning" | "info";
type AlertStatus =
  | "triggered"
  | "unconfirmed"
  | "confirmed"
  | "processing"
  | "recovered"
  | "closed"
  | "silenced";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

const alertFilterSchema = z.object({
  severity: z.string().optional(),
  status: z.string().optional(),
  siteId: z.string().optional(),
  deviceId: z.string().optional(),
  search: z.string().optional(),
});

const listInputSchema = paginationSchema.extend({
  filter: alertFilterSchema.optional(),
  groupBy: z.enum(["device", "site", "rule"]).optional(),
});

const getByIdSchema = z.object({ id: z.string() });

// ── Helpers ────────────────────────────────────────────────────────────

function buildAlertWhere(filter?: z.infer<typeof alertFilterSchema>) {
  if (!filter) return undefined;
  const conditions = [];

  if (filter.severity) {
    conditions.push(eq(alerts.severity, filter.severity as AlertSeverity));
  }
  if (filter.status) {
    conditions.push(eq(alerts.status, filter.status as AlertStatus));
  }
  if (filter.siteId) {
    conditions.push(eq(alerts.siteId, filter.siteId));
  }
  if (filter.deviceId) {
    conditions.push(eq(alerts.deviceId, filter.deviceId));
  }
  if (filter.search) {
    const term = `%${filter.search}%`;
    conditions.push(
      or(like(alerts.name, term), like(alerts.description, term)),
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

const severityOrder = sql`FIELD(${alerts.severity}, 'critical', 'major', 'minor', 'warning', 'info')`;

// ── Router ─────────────────────────────────────────────────────────────

export const alertRouter = router({
  list: protectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { page, pageSize, filter } = input;
      const where = buildAlertWhere(filter);
      const offset = (page - 1) * pageSize;

      const selectFields = {
        id: alerts.id,
        name: alerts.name,
        description: alerts.description,
        severity: alerts.severity,
        status: alerts.status,
        deviceId: alerts.deviceId,
        siteId: alerts.siteId,
        businessImpact: alerts.businessImpact,
        firstSeenAt: alerts.firstSeenAt,
        lastSeenAt: alerts.lastSeenAt,
        recoveredAt: alerts.recoveredAt,
        closedAt: alerts.closedAt,
        repeatCount: alerts.repeatCount,
        responsibleUserId: alerts.responsibleUserId,
        silencedUntil: alerts.silencedUntil,
        createdAt: alerts.createdAt,
        updatedAt: alerts.updatedAt,
        deviceName: devices.name,
        siteName: sites.name,
      };

      const baseQuery = db
        .select(selectFields)
        .from(alerts)
        .leftJoin(devices, eq(alerts.deviceId, devices.id))
        .leftJoin(sites, eq(alerts.siteId, sites.id))
        .orderBy(severityOrder, desc(alerts.lastSeenAt))
        .limit(pageSize)
        .offset(offset);

      const data = where ? await baseQuery.where(where) : await baseQuery;

      const [totalRow] = where
        ? await db
            .select({ count: count() })
            .from(alerts)
            .where(where)
        : await db.select({ count: count() }).from(alerts);

      const total = totalRow?.count ?? 0;

      // Get responsible user names for the returned alerts
      const userIds = [
        ...new Set(
          data
            .map((a) => a.responsibleUserId)
            .filter(Boolean) as string[],
        ),
      ];
      const userMap = new Map<string, string>();
      if (userIds.length > 0) {
        const userRows = await db
          .select({ id: users.id, displayName: users.displayName })
          .from(users)
          .where(inArray(users.id, userIds));
        for (const u of userRows) {
          userMap.set(u.id, u.displayName);
        }
      }

      const dataWithUser = data.map((row) => ({
        ...row,
        responsibleUserName: row.responsibleUserId
          ? (userMap.get(row.responsibleUserId) ?? null)
          : null,
      }));

      return {
        data: dataWithUser,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      } satisfies PaginatedResponse<(typeof dataWithUser)[number]>;
    }),

  getById: protectedProcedure
    .input(getByIdSchema)
    .query(async ({ input }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) {
        throw new Error("NOT_FOUND");
      }

      // Device info
      let deviceName: string | null = null;
      let deviceIp: string | null = null;
      if (alert.deviceId) {
        const [device] = await db
          .select({ name: devices.name, ipAddress: devices.ipAddress })
          .from(devices)
          .where(eq(devices.id, alert.deviceId))
          .limit(1);
        deviceName = device?.name ?? null;
        deviceIp = device?.ipAddress ?? null;
      }

      // Site info
      let siteName: string | null = null;
      if (alert.siteId) {
        const [site] = await db
          .select({ name: sites.name })
          .from(sites)
          .where(eq(sites.id, alert.siteId))
          .limit(1);
        siteName = site?.name ?? null;
      }

      // Responsible user
      let responsibleUserName: string | null = null;
      if (alert.responsibleUserId) {
        const [user] = await db
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, alert.responsibleUserId))
          .limit(1);
        responsibleUserName = user?.displayName ?? null;
      }

      // Timeline events
      const timeline = await db
        .select({
          id: alertTimeline.id,
          alertId: alertTimeline.alertId,
          event: alertTimeline.event,
          userId: alertTimeline.userId,
          comment: alertTimeline.comment,
          metadata: alertTimeline.metadata,
          createdAt: alertTimeline.createdAt,
          userName: users.displayName,
        })
        .from(alertTimeline)
        .leftJoin(users, eq(alertTimeline.userId, users.id))
        .where(eq(alertTimeline.alertId, input.id))
        .orderBy(asc(alertTimeline.createdAt));

      return {
        ...alert,
        deviceName,
        deviceIp,
        siteName,
        responsibleUserName,
        timeline,
      };
    }),

  acknowledge: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) throw new Error("NOT_FOUND");

      const newStatus = transition(alert.status, "confirmed");

      await db
        .update(alerts)
        .set({ status: newStatus as AlertStatus })
        .where(eq(alerts.id, input.id));

      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "acknowledged",
        userId: ctx.userId,
        comment: input.comment ?? null,
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "acknowledge",
        objectType: "alert",
        objectId: input.id,
        afterValue: { status: newStatus },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  startProcessing: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) throw new Error("NOT_FOUND");

      const newStatus = transition(alert.status, "processing");

      await db
        .update(alerts)
        .set({ status: newStatus as AlertStatus })
        .where(eq(alerts.id, input.id));

      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "processing",
        userId: ctx.userId,
        comment: input.comment ?? null,
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "update",
        objectType: "alert",
        objectId: input.id,
        afterValue: { status: newStatus },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  silence: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        durationMinutes: z.number().int().min(1),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) throw new Error("NOT_FOUND");

      const newStatus = transition(alert.status, "silenced");
      const silencedUntil = new Date(
        Date.now() + input.durationMinutes * 60_000,
      );

      await db
        .update(alerts)
        .set({
          status: newStatus as AlertStatus,
          silencedUntil,
        })
        .where(eq(alerts.id, input.id));

      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "silenced",
        userId: ctx.userId,
        comment: input.comment ?? null,
        metadata: { silencedUntil: silencedUntil.toISOString() },
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "silence",
        objectType: "alert",
        objectId: input.id,
        afterValue: { status: newStatus, silencedUntil: silencedUntil.toISOString() },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  assign: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) throw new Error("NOT_FOUND");

      const [assignee] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      await db
        .update(alerts)
        .set({ responsibleUserId: input.userId })
        .where(eq(alerts.id, input.id));

      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "assigned",
        userId: ctx.userId,
        comment: null,
        metadata: { assignedTo: input.userId, assignedToName: assignee?.displayName },
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "update",
        objectType: "alert",
        objectId: input.id,
        afterValue: { responsibleUserId: input.userId },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  addComment: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        comment: z.string().min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "comment_added",
        userId: ctx.userId,
        comment: input.comment,
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "update",
        objectType: "alert",
        objectId: input.id,
        afterValue: { comment: input.comment },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  close: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        resolution: z.string().min(1),
        comment: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const [alert] = await db
        .select()
        .from(alerts)
        .where(eq(alerts.id, input.id))
        .limit(1);

      if (!alert) throw new Error("NOT_FOUND");

      transition(alert.status, "closed");

      await db
        .update(alerts)
        .set({
          status: "closed" as AlertStatus,
          closedAt: new Date(),
        })
        .where(eq(alerts.id, input.id));

      await db.insert(alertTimeline).values({
        id: uuidv4(),
        alertId: input.id,
        event: "closed",
        userId: ctx.userId,
        comment: input.comment ?? null,
        metadata: { resolution: input.resolution },
      });

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "close",
        objectType: "alert",
        objectId: input.id,
        afterValue: { status: "closed", resolution: input.resolution },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return { success: true };
    }),

  getKpis: protectedProcedure.query(async () => {
    // Counts by severity (non-closed)
    const severityRows = await db
      .select({
        severity: alerts.severity,
        count: count(),
      })
      .from(alerts)
      .where(sql`${alerts.status} != 'closed'`)
      .groupBy(alerts.severity);

    // Counts by status
    const statusRows = await db
      .select({
        status: alerts.status,
        count: count(),
      })
      .from(alerts)
      .groupBy(alerts.status);

    const severityMap: Record<string, number> = {};
    for (const r of severityRows) {
      severityMap[r.severity] = r.count;
    }

    const statusMap: Record<string, number> = {};
    for (const r of statusRows) {
      statusMap[r.status] = r.count;
    }

    return {
      critical: severityMap["critical"] ?? 0,
      major: severityMap["major"] ?? 0,
      minor: severityMap["minor"] ?? 0,
      warning: severityMap["warning"] ?? 0,
      info: severityMap["info"] ?? 0,
      triggered: statusMap["triggered"] ?? 0,
      unconfirmed: statusMap["unconfirmed"] ?? 0,
      confirmed: statusMap["confirmed"] ?? 0,
      processing: statusMap["processing"] ?? 0,
      recovered: statusMap["recovered"] ?? 0,
      closed: statusMap["closed"] ?? 0,
      silenced: statusMap["silenced"] ?? 0,
    };
  }),
});
