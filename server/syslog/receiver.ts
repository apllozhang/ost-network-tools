// Syslog UDP receiver — listens for BSD syslog (RFC 3164) messages from AOS switches,
// parses them, writes events, and auto-creates/deduplicates alerts.

import dgram from "node:dgram";
import { db } from "../db/index.js";
import { devices, events, alerts } from "../../drizzle/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ── Types ──────────────────────────────────────────────────────────────

type AppSeverity = "critical" | "major" | "minor" | "warning" | "info";

interface ParsedSyslog {
  facility: number;
  syslogSeverity: number;
  severity: AppSeverity;
  hostname: string;
  tag: string;
  message: string;
  raw: string;
}

// ── Parser ─────────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<number, AppSeverity> = {
  0: "critical", // emergency
  1: "critical", // alert
  2: "critical", // critical
  3: "major",    // error
  4: "warning",  // warning
  5: "info",     // notice
  6: "info",     // informational
  7: "info",     // debug
};

// <PRI>TIMESTAMP HOSTNAME TAG: MESSAGE
const SYSLOG_RE = /^<(\d{1,3})>(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(\S+)\s+(\w+):\s*(.*)/;

function parseSyslog(raw: string): ParsedSyslog | null {
  const line = raw.trim();
  const m = line.match(SYSLOG_RE);
  if (!m) return null;

  const priority = parseInt(m[1]!, 10);
  const syslogSeverity = priority % 8;
  const facility = Math.floor(priority / 8);

  return {
    facility,
    syslogSeverity,
    severity: SEVERITY_MAP[syslogSeverity] ?? "info",
    hostname: m[3]!,
    tag: m[4]!,
    message: m[5] ?? "",
    raw: line,
  };
}

// ── Severity helpers ───────────────────────────────────────────────────

const SEVERITY_ORDER: AppSeverity[] = ["critical", "major", "minor", "warning", "info"];

function higherSeverity(a: AppSeverity, b: AppSeverity): AppSeverity {
  return SEVERITY_ORDER.indexOf(a) <= SEVERITY_ORDER.indexOf(b) ? a : b;
}

// ── Message handler ────────────────────────────────────────────────────

async function handleSyslogMessage(msg: Buffer, sourceIp: string): Promise<void> {
  const parsed = parseSyslog(msg.toString("utf-8"));
  if (!parsed) {
    console.debug(`[syslog] Unparseable message from ${sourceIp}: ${msg.toString("utf-8").slice(0, 80)}`);
    return;
  }

  // Look up device by source IP
  let device: { id: string; name: string; siteId: string | null } | null = null;
  try {
    const [found] = await db
      .select({ id: devices.id, name: devices.name, siteId: devices.siteId })
      .from(devices)
      .where(eq(devices.ipAddress, sourceIp))
      .limit(1);
    device = found ?? null;
  } catch {
    // DB unavailable — skip
  }

  // Write event
  const eventId = uuidv4();
  let alertId: string | null = null;

  try {
    await db.insert(events).values({
      id: eventId,
      eventType: "syslog_received",
      severity: parsed.severity,
      deviceId: device?.id ?? null,
      message: `${parsed.tag}: ${parsed.message}`,
      metadata: {
        sourceIp,
        facility: parsed.facility,
        syslogSeverity: parsed.syslogSeverity,
        tag: parsed.tag,
        hostname: parsed.hostname,
        raw: parsed.raw,
      },
    });
  } catch (err) {
    console.error("[syslog] Failed to write event:", err);
    return;
  }

  // Create/deduplicate alert for severity >= warning
  if (parsed.severity !== "info" && device) {
    try {
      alertId = await upsertAlert(parsed, device);
      if (alertId) {
        await db.update(events).set({ alertId }).where(eq(events.id, eventId));
      }
    } catch (err) {
      console.error("[syslog] Failed to upsert alert:", err);
    }
  }
}

// ── Alert upsert ───────────────────────────────────────────────────────

async function upsertAlert(
  parsed: ParsedSyslog,
  device: { id: string; name: string; siteId: string | null },
): Promise<string | null> {
  const alertName = `Syslog: ${parsed.tag}`;

  // Find existing non-closed alert with same name + device
  const [existing] = await db
    .select({ id: alerts.id, severity: alerts.severity, repeatCount: alerts.repeatCount })
    .from(alerts)
    .where(
      and(
        eq(alerts.name, alertName),
        eq(alerts.deviceId, device.id),
        sql`${alerts.status} NOT IN ('closed')`,
      ),
    )
    .limit(1);

  if (existing) {
    // Update existing: increment repeat count, update lastSeen, escalate severity
    const newSeverity = higherSeverity(parsed.severity, existing.severity as AppSeverity);
    await db
      .update(alerts)
      .set({
        repeatCount: sql`${alerts.repeatCount} + 1`,
        lastSeenAt: new Date(),
        severity: newSeverity,
        description: parsed.message.slice(0, 1000),
      })
      .where(eq(alerts.id, existing.id));
    return existing.id;
  }

  // Create new alert
  const id = uuidv4();
  await db.insert(alerts).values({
    id,
    name: alertName,
    description: parsed.message.slice(0, 1000),
    severity: parsed.severity,
    status: "triggered",
    deviceId: device.id,
    siteId: device.siteId,
    repeatCount: 1,
  });
  return id;
}

// ── UDP Socket ─────────────────────────────────────────────────────────

export function startSyslogReceiver(): void {
  const port = parseInt(process.env.SYSLOG_PORT ?? "514", 10);
  const socket = dgram.createSocket("udp4");

  socket.on("message", (msg: Buffer, rinfo: dgram.RemoteInfo) => {
    handleSyslogMessage(msg, rinfo.address).catch((err) => {
      console.error("[syslog] Error processing message:", err);
    });
  });

  socket.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EACCES" || err.code === "EADDRINUSE") {
      console.warn(`[syslog] Cannot bind to UDP port ${port}: ${err.message}`);
      console.warn("[syslog] Syslog receiver disabled. Set SYSLOG_PORT to an available port.");
    } else {
      console.error(`[syslog] Socket error: ${err.message}`);
    }
    socket.close();
  });

  socket.bind(port, () => {
    console.log(`[syslog] Listening for syslog messages on UDP port ${port}`);
  });
}
