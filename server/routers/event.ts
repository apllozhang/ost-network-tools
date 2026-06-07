import { router, protectedProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import { events, devices } from "../../drizzle/schema.js";
import { eq, and, like, desc, count } from "drizzle-orm";
import { z } from "zod";
import type { PaginatedResponse } from "../../shared/types.js";

// ── Input schemas ─────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

const eventFilterSchema = z.object({
  eventType: z.string().optional(),
  severity: z.string().optional(),
  deviceId: z.string().optional(),
});

const listInputSchema = paginationSchema.extend({
  filter: eventFilterSchema.optional(),
});

// ── Helpers ────────────────────────────────────────────────────────────

function buildEventWhere(filter?: z.infer<typeof eventFilterSchema>) {
  if (!filter) return undefined;
  const conditions = [];

  if (filter.eventType) {
    conditions.push(eq(events.eventType, filter.eventType as typeof events.eventType.enumValues[number]));
  }
  if (filter.severity) {
    conditions.push(eq(events.severity, filter.severity as typeof events.severity.enumValues[number]));
  }
  if (filter.deviceId) {
    conditions.push(eq(events.deviceId, filter.deviceId));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ── Router ─────────────────────────────────────────────────────────────

export const eventRouter = router({
  list: protectedProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { page, pageSize, filter } = input;
      const where = buildEventWhere(filter);
      const offset = (page - 1) * pageSize;

      const selectFields = {
        id: events.id,
        eventType: events.eventType,
        severity: events.severity,
        deviceId: events.deviceId,
        alertId: events.alertId,
        monitorId: events.monitorId,
        message: events.message,
        operator: events.operator,
        metadata: events.metadata,
        createdAt: events.createdAt,
        deviceName: devices.name,
      };

      const baseQuery = db
        .select(selectFields)
        .from(events)
        .leftJoin(devices, eq(events.deviceId, devices.id))
        .orderBy(desc(events.createdAt))
        .limit(pageSize)
        .offset(offset);

      const data = where ? await baseQuery.where(where) : await baseQuery;

      const [totalRow] = where
        ? await db
            .select({ count: count() })
            .from(events)
            .where(where)
        : await db.select({ count: count() }).from(events);

      const total = totalRow?.count ?? 0;

      return {
        data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      } satisfies PaginatedResponse<(typeof data)[number]>;
    }),
});
