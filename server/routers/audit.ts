import { router, adminProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import { auditLogs } from "../../drizzle/schema.js";
import { eq, and, desc, gte, lte, count } from "drizzle-orm";
import { z } from "zod";
import type { PaginatedResponse } from "../../shared/types.js";

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

const auditFilterSchema = z.object({
  userId: z.string().optional(),
  action: z.string().optional(),
  objectType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const listInputSchema = paginationSchema.extend({
  filter: auditFilterSchema.optional(),
});

export const auditRouter = router({
  list: adminProcedure
    .input(listInputSchema)
    .query(async ({ input }) => {
      const { page, pageSize, filter } = input;
      const conditions = [];

      if (filter?.userId) {
        conditions.push(eq(auditLogs.userId, filter.userId));
      }
      if (filter?.action) {
        conditions.push(eq(auditLogs.action, filter.action));
      }
      if (filter?.objectType) {
        conditions.push(eq(auditLogs.objectType, filter.objectType));
      }
      if (filter?.startDate) {
        conditions.push(gte(auditLogs.createdAt, new Date(filter.startDate)));
      }
      if (filter?.endDate) {
        conditions.push(lte(auditLogs.createdAt, new Date(filter.endDate)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;
      const offset = (page - 1) * pageSize;

      const data = where
        ? await db
            .select()
            .from(auditLogs)
            .where(where)
            .orderBy(desc(auditLogs.createdAt))
            .limit(pageSize)
            .offset(offset)
        : await db
            .select()
            .from(auditLogs)
            .orderBy(desc(auditLogs.createdAt))
            .limit(pageSize)
            .offset(offset);

      const [totalRow] = where
        ? await db
            .select({ count: count() })
            .from(auditLogs)
            .where(where)
        : await db.select({ count: count() }).from(auditLogs);

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
