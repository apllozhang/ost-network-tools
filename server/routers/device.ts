import { router, protectedProcedure, adminProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import { devices, sites, deviceMetrics, users } from "../../drizzle/schema.js";
import { eq, and, or, like, desc, asc, sql, count } from "drizzle-orm";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import type { PaginatedResponse } from "../../shared/types.js";
import { logAudit } from "../audit/logger.js";

// ── Input schemas ───────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(50),
});

const filterSchema = z.object({
  status: z.string().optional(),
  siteId: z.string().optional(),
  deviceType: z.string().optional(),
  vendor: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]),
});

const listInputSchema = paginationSchema.extend({
  filter: filterSchema.optional(),
  sort: sortSchema.optional(),
});

const getByIdSchema = z.object({ id: z.string() });

const createSchema = z.object({
  name: z.string().min(1),
  ipAddress: z.string().min(1),
  macAddress: z.string().optional(),
  siteId: z.string().optional(),
  deviceType: z.enum(["switch", "router", "firewall", "ap", "server", "other"]).optional(),
  vendor: z.string().optional(),
  model: z.string().optional(),
  osVersion: z.string().optional(),
  serialNumber: z.string().optional(),
  role: z.string().optional(),
  responsibleUserId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  ipAddress: z.string().optional(),
  macAddress: z.string().nullable().optional(),
  siteId: z.string().nullable().optional(),
  deviceType: z.enum(["switch", "router", "firewall", "ap", "server", "other"]).optional(),
  vendor: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  osVersion: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  responsibleUserId: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
});

const deleteSchema = z.object({ id: z.string() });

// ── Helpers ──────────────────────────────────────────────────────────

type DeviceStatus = "unknown" | "healthy" | "warning" | "critical" | "maintenance" | "offline";
type DeviceType = "switch" | "router" | "firewall" | "ap" | "server" | "other";

function buildWhereConditions(filter?: z.infer<typeof filterSchema>) {
  if (!filter) return undefined;

  const conditions = [];

  if (filter.status) {
    conditions.push(eq(devices.status, filter.status as DeviceStatus));
  }
  if (filter.siteId) {
    conditions.push(eq(devices.siteId, filter.siteId));
  }
  if (filter.deviceType) {
    conditions.push(eq(devices.deviceType, filter.deviceType as DeviceType));
  }
  if (filter.vendor) {
    conditions.push(eq(devices.vendor, filter.vendor));
  }
  if (filter.search) {
    const term = `%${filter.search}%`;
    conditions.push(
      or(
        like(devices.name, term),
        like(devices.ipAddress, term),
        like(devices.vendor, term),
      ),
    );
  }
  if (filter.tags && filter.tags.length > 0) {
    conditions.push(
      sql`JSON_OVERLAPS(${devices.tags}, ${JSON.stringify(filter.tags)})`,
    );
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

// ── Router ───────────────────────────────────────────────────────────

export const deviceRouter = router({
  list: protectedProcedure.input(listInputSchema).query(async ({ input }) => {
    const { page, pageSize, filter, sort } = input;
    const where = buildWhereConditions(filter);

    const sortField = sort?.field ?? "updatedAt";
    const sortDir = sort?.direction ?? "desc";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const columnMap: Record<string, any> = {
      name: devices.name,
      ipAddress: devices.ipAddress,
      status: devices.status,
      deviceType: devices.deviceType,
      vendor: devices.vendor,
      osVersion: devices.osVersion,
      lastCollectionAt: devices.lastCollectionAt,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    };
    const sortColumn = columnMap[sortField] ?? devices.updatedAt;
    const orderBy = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const offset = (page - 1) * pageSize;

    const selectFields = {
      id: devices.id,
      name: devices.name,
      ipAddress: devices.ipAddress,
      deviceType: devices.deviceType,
      vendor: devices.vendor,
      model: devices.model,
      osVersion: devices.osVersion,
      status: devices.status,
      siteId: devices.siteId,
      siteName: sites.name,
      lastCollectionAt: devices.lastCollectionAt,
      lastResponseMs: devices.lastResponseMs,
      tags: devices.tags,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    };

    const data = where
      ? await db
          .select(selectFields)
          .from(devices)
          .leftJoin(sites, eq(devices.siteId, sites.id))
          .where(where)
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset)
      : await db
          .select(selectFields)
          .from(devices)
          .leftJoin(sites, eq(devices.siteId, sites.id))
          .orderBy(orderBy)
          .limit(pageSize)
          .offset(offset);

    const [totalRow] = where
      ? await db
          .select({ count: count() })
          .from(devices)
          .where(where)
      : await db.select({ count: count() }).from(devices);

    const total = totalRow?.count ?? 0;

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    } satisfies PaginatedResponse<(typeof data)[number]>;
  }),

  getById: protectedProcedure.input(getByIdSchema).query(async ({ input }) => {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, input.id))
      .limit(1);

    if (!device) {
      throw new Error("NOT_FOUND");
    }

    // Get site name
    let siteName: string | null = null;
    if (device.siteId) {
      const [site] = await db
        .select({ name: sites.name })
        .from(sites)
        .where(eq(sites.id, device.siteId))
        .limit(1);
      siteName = site?.name ?? null;
    }

    // Get responsible user name
    let responsibleUserName: string | null = null;
    if (device.responsibleUserId) {
      const [user] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, device.responsibleUserId))
        .limit(1);
      responsibleUserName = user?.displayName ?? null;
    }

    // Get latest metrics
    const [latestMetrics] = await db
      .select()
      .from(deviceMetrics)
      .where(eq(deviceMetrics.deviceId, input.id))
      .orderBy(desc(deviceMetrics.collectedAt))
      .limit(1);

    return {
      ...device,
      siteName,
      responsibleUserName,
      latestMetrics: latestMetrics ?? null,
    };
  }),

  create: protectedProcedure.input(createSchema).mutation(async ({ input, ctx }) => {
    const id = uuidv4();

    await db.insert(devices).values({
      id,
      name: input.name,
      ipAddress: input.ipAddress,
      macAddress: input.macAddress ?? null,
      siteId: input.siteId ?? null,
      deviceType: input.deviceType ?? "switch",
      vendor: input.vendor ?? null,
      model: input.model ?? null,
      osVersion: input.osVersion ?? null,
      serialNumber: input.serialNumber ?? null,
      role: input.role ?? null,
      responsibleUserId: input.responsibleUserId ?? null,
      tags: input.tags ?? null,
    });

    const [created] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    await logAudit({
      userId: ctx.userId!,
      username: ctx.username!,
      action: "create",
      objectType: "device",
      objectId: id,
      afterValue: created as unknown as Record<string, unknown>,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return created;
  }),

  update: protectedProcedure.input(updateSchema).mutation(async ({ input, ctx }) => {
    const { id, ...fields } = input;

    // Build update object from provided fields only
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("NO_FIELDS_TO_UPDATE");
    }

    const [before] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    await db.update(devices).set(updates).where(eq(devices.id, id));

    const [updated] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, id))
      .limit(1);

    await logAudit({
      userId: ctx.userId!,
      username: ctx.username!,
      action: "update",
      objectType: "device",
      objectId: id,
      beforeValue: before as unknown as Record<string, unknown>,
      afterValue: updated as unknown as Record<string, unknown>,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return updated;
  }),

  delete: adminProcedure.input(deleteSchema).mutation(async ({ input, ctx }) => {
    const [before] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, input.id))
      .limit(1);

    await db.delete(devices).where(eq(devices.id, input.id));

    await logAudit({
      userId: ctx.userId!,
      username: ctx.username!,
      action: "delete",
      objectType: "device",
      objectId: input.id,
      beforeValue: before as unknown as Record<string, unknown> | undefined,
      ipAddress: ctx.req.ip,
      userAgent: ctx.req.headers["user-agent"],
    });

    return { success: true };
  }),

  collect: protectedProcedure.input(getByIdSchema).mutation(async ({ input, ctx }) => {
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, input.id))
      .limit(1);

    if (!device) {
      throw new Error("NOT_FOUND");
    }

    // Dynamic import to avoid circular deps
    const { AosRestClient } = await import("../aos/rest-client.js");
    const { parser } = await import("../aos/store.js");
    const { buildSwitchFromSystem } = await import("../aos/models/builder.js");
    const { getClient } = await import("../aos/connection-pool.js");

    const startMs = Date.now();
    const client = getClient(input.id) ?? new AosRestClient(device.ipAddress);

    try {
      const rawOutput = await client.executeCli("show system");
      const responseMs = Date.now() - startMs;

      const parsed = await parser.parse("ale_aos8", "show system", rawOutput);
      const switchModel = buildSwitchFromSystem(parsed, device.ipAddress);

      // Update device record
      await db
        .update(devices)
        .set({
          name: switchModel.name || device.name,
          osVersion: switchModel.version || device.osVersion,
          status: "healthy" as const,
          uptime: switchModel.upTime || device.uptime,
          lastCollectionAt: new Date(),
          lastResponseMs: responseMs,
        })
        .where(eq(devices.id, input.id));

      // Store metrics
      const metricId = uuidv4();
      await db.insert(deviceMetrics).values({
        id: metricId,
        deviceId: input.id,
        cpuUsage: null,
        memoryUsage: null,
        temperature: null,
      });

      const [updated] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, input.id))
        .limit(1);

      await logAudit({
        userId: ctx.userId!,
        username: ctx.username!,
        action: "collect",
        objectType: "device",
        objectId: input.id,
        afterValue: { responseMs: Date.now() - startMs },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers["user-agent"],
      });

      return updated;
    } catch {
      // Mark as offline on failure
      await db
        .update(devices)
        .set({
          status: "offline" as const,
          lastCollectionAt: new Date(),
          lastResponseMs: Date.now() - startMs,
        })
        .where(eq(devices.id, input.id));

      throw new Error("COLLECTION_FAILED");
    }
  }),

  getSites: protectedProcedure.query(async () => {
    return db.select({ id: sites.id, name: sites.name }).from(sites);
  }),
});
