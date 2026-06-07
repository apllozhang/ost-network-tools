// Background scheduler — periodically collects metrics from all registered devices.
// Reuses the same collection logic as the manual "collect" tRPC endpoint.

import { db } from "../db/index.js";
import { devices, deviceMetrics } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { logAudit } from "../audit/logger.js";

// ── Shared collection logic ────────────────────────────────────────────

export async function collectDevice(device: {
  id: string;
  ipAddress: string;
  name: string;
  osVersion: string | null;
  model: string | null;
  serialNumber: string | null;
  macAddress: string | null;
  uptime: string | null;
}): Promise<void> {
  const { AosRestClient } = await import("../aos/rest-client.js");
  const { parser } = await import("../aos/store.js");
  const { buildSwitchFromSystem, buildTemperatureFromParsed, buildChassisFromChassis } =
    await import("../aos/models/builder.js");
  const pool = await import("../aos/connection-pool.js");

  const startMs = Date.now();
  let client = pool.getClient(device.id);
  if (!client?.connected) {
    client = new AosRestClient(device.ipAddress);
    await client.login("admin", "switch");
    pool.setClient(device.id, client);
  }

  try {
    const rawOutput = await client.executeCli("show system");
    const responseMs = Date.now() - startMs;

    const parsed = await parser.parse("ale_aos8", "show system", rawOutput);
    const switchModel = buildSwitchFromSystem(parsed, device.ipAddress);

    // Health (CPU/memory)
    let cpuUsage: number | null = null;
    let memoryUsage: number | null = null;
    try {
      const healthRaw = await client.executeCli("show health");
      const healthParsed = await parser.parse("ale_aos8", "show health", healthRaw);
      if (healthParsed.length > 0) {
        const h = healthParsed[0]!;
        cpuUsage = Number(h["healthmodulecpucurrent"]) || null;
        memoryUsage = Number(h["healthmodulememorycurrent"]) || null;
      }
    } catch { /* best-effort */ }

    // Temperature
    let temperature: number | null = null;
    try {
      const tempRaw = await client.executeCli("show temperature");
      const tempParsed = await parser.parse("ale_aos8", "show temperature", tempRaw);
      const tempInfo = buildTemperatureFromParsed(tempParsed);
      if (tempInfo.length > 0) {
        temperature = tempInfo[0]!.current || null;
      }
    } catch { /* best-effort */ }

    // Chassis (serial, MAC, model)
    let chassisSerial: string | null = null;
    let chassisMac: string | null = null;
    let chassisModel: string | null = null;
    try {
      const chassisRaw = await client.executeCli("show chassis");
      const chassisParsed = await parser.parse("ale_aos8", "show chassis", chassisRaw);
      const chassisList = buildChassisFromChassis(chassisParsed);
      if (chassisList.length > 0) {
        chassisSerial = chassisList[0]!.serialNumber || null;
        chassisMac = chassisList[0]!.macAddress || null;
        chassisModel = chassisList[0]!.model || null;
      }
    } catch { /* best-effort */ }

    // Update device
    await db
      .update(devices)
      .set({
        name: (switchModel.name || device.name)?.slice(0, 128),
        osVersion: (switchModel.version || device.osVersion)?.slice(0, 64),
        model: (chassisModel || device.model)?.slice(0, 64),
        serialNumber: chassisSerial || device.serialNumber,
        macAddress: chassisMac || device.macAddress,
        status: "healthy" as const,
        uptime: (switchModel.upTime || device.uptime)?.slice(0, 128),
        lastCollectionAt: new Date(),
        lastResponseMs: responseMs,
      })
      .where(eq(devices.id, device.id));

    // Store metrics
    await db.insert(deviceMetrics).values({
      id: uuidv4(),
      deviceId: device.id,
      cpuUsage: cpuUsage?.toString() ?? null,
      memoryUsage: memoryUsage?.toString() ?? null,
      temperature: temperature?.toString() ?? null,
    });
  } catch {
    // Mark device as offline on failure
    await db
      .update(devices)
      .set({
        status: "offline" as const,
        lastCollectionAt: new Date(),
        lastResponseMs: Date.now() - startMs,
      })
      .where(eq(devices.id, device.id));
  }
}

// ── Scheduler ──────────────────────────────────────────────────────────

let currentIntervalSec = parseInt(process.env.COLLECT_INTERVAL ?? "30", 10);
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let tickFn: () => Promise<void>;

export function getCollectInterval(): number {
  return currentIntervalSec;
}

export function setCollectInterval(seconds: number): void {
  if (seconds < 5) seconds = 5;
  if (seconds > 3600) seconds = 3600;
  currentIntervalSec = seconds;

  // Restart interval with new value
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = setInterval(tickFn, currentIntervalSec * 1000);
  intervalHandle.unref();

  console.log(`[collector] Interval updated to ${currentIntervalSec}s`);
}

export function startCollector(): void {
  tickFn = async () => {
    try {
      const allDevices = await db
        .select({
          id: devices.id,
          ipAddress: devices.ipAddress,
          name: devices.name,
          osVersion: devices.osVersion,
          model: devices.model,
          serialNumber: devices.serialNumber,
          macAddress: devices.macAddress,
          uptime: devices.uptime,
        })
        .from(devices);

      if (allDevices.length === 0) return;

      // Collect sequentially to avoid overwhelming switches
      for (const device of allDevices) {
        try {
          await collectDevice(device);
        } catch (err) {
          console.error(`[collector] Failed for ${device.ipAddress}:`, err);
        }
      }

      console.log(`[collector] Collected ${allDevices.length} device(s)`);
    } catch (err) {
      console.error("[collector] Tick error:", err);
    }
  };

  // Initial delay of 10s to let server settle, then periodic
  const timer = setTimeout(() => {
    tickFn();
    intervalHandle = setInterval(tickFn, currentIntervalSec * 1000);
    intervalHandle.unref();
  }, 10_000);
  timer.unref();

  console.log(`[collector] Auto-collection every ${currentIntervalSec}s`);
}
