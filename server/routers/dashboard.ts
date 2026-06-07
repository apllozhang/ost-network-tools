import { router, protectedProcedure } from "../_core/trpc.js";
import { db } from "../db/index.js";
import {
  devices,
  alerts,
  probeResults,
  monitorTargets,
  deviceMetrics,
} from "../../drizzle/schema.js";
import { eq, and, desc, sql, count, avg } from "drizzle-orm";

// ── Router ─────────────────────────────────────────────────────────────

export const dashboardRouter = router({
  getKpis: protectedProcedure.query(async () => {
    // Device counts by status
    const deviceStatusRows = await db
      .select({
        status: devices.status,
        count: count(),
      })
      .from(devices)
      .groupBy(devices.status);

    const deviceByStatus: Record<string, number> = {};
    for (const r of deviceStatusRows) {
      deviceByStatus[r.status] = r.count;
    }

    // Alert counts by severity (non-closed)
    const alertSeverityRows = await db
      .select({
        severity: alerts.severity,
        count: count(),
      })
      .from(alerts)
      .where(sql`${alerts.status} != 'closed'`)
      .groupBy(alerts.severity);

    const alertBySeverity: Record<string, number> = {};
    for (const r of alertSeverityRows) {
      alertBySeverity[r.severity] = r.count;
    }

    // Average latency from latest probe results
    const [latencyRow] = await db
      .select({
        avgLatency: avg(probeResults.latencyMs),
      })
      .from(probeResults)
      .where(
        sql`${probeResults.createdAt} > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
      );

    // Monitor targets count
    const [targetRow] = await db
      .select({ count: count() })
      .from(monitorTargets);

    const totalDevices =
      Object.values(deviceByStatus).reduce((a, b) => a + b, 0);
    const onlineDevices =
      (deviceByStatus["healthy"] ?? 0) +
      (deviceByStatus["warning"] ?? 0) +
      (deviceByStatus["critical"] ?? 0);
    const availability =
      totalDevices > 0
        ? Math.round((onlineDevices / totalDevices) * 10000) / 100
        : 0;

    return {
      deviceByStatus,
      totalDevices,
      onlineDevices,
      alertBySeverity,
      totalAlerts: Object.values(alertBySeverity).reduce((a, b) => a + b, 0),
      avgLatency: latencyRow?.avgLatency
        ? Number.parseFloat(latencyRow.avgLatency)
        : null,
      availability,
      monitoredTargets: targetRow?.count ?? 0,
    };
  }),

  getCriticalAlerts: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        id: alerts.id,
        name: alerts.name,
        severity: alerts.severity,
        status: alerts.status,
        lastSeenAt: alerts.lastSeenAt,
        deviceName: devices.name,
        siteName: sql<string | null>`NULL`,
      })
      .from(alerts)
      .leftJoin(devices, eq(alerts.deviceId, devices.id))
      .where(
        and(
          sql`${alerts.severity} IN ('critical', 'major')`,
          sql`${alerts.status} NOT IN ('closed', 'recovered')`,
        ),
      )
      .orderBy(desc(alerts.lastSeenAt))
      .limit(5);

    return rows;
  }),

  getHealthTrend: protectedProcedure.query(async () => {
    // Device count by status per day for last 7 days
    const rows = await db
      .select({
        date: sql<string>`DATE(${deviceMetrics.collectedAt})`,
        device_count: sql<number>`COUNT(DISTINCT ${deviceMetrics.deviceId})`,
      })
      .from(deviceMetrics)
      .where(
        sql`${deviceMetrics.collectedAt} > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      )
      .groupBy(sql`DATE(${deviceMetrics.collectedAt})`)
      .orderBy(sql`DATE(${deviceMetrics.collectedAt})`);

    return rows;
  }),

  getSlowDevices: protectedProcedure.query(async () => {
    const rows = await db
      .select({
        id: devices.id,
        name: devices.name,
        ipAddress: devices.ipAddress,
        lastResponseMs: devices.lastResponseMs,
        status: devices.status,
      })
      .from(devices)
      .where(sql`${devices.lastResponseMs} IS NOT NULL`)
      .orderBy(desc(devices.lastResponseMs))
      .limit(5);

    return rows;
  }),
});
