import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  decimal,
  json,
  mysqlEnum,
  boolean,
  datetime,
  index,
} from "drizzle-orm/mysql-core";

// ── Users ────────────────────────────────────────────────────────
export const users = mysqlTable(
  "users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 128 }).notNull(),
    email: varchar("email", { length: 255 }),
    role: mysqlEnum("role", ["admin", "operator", "viewer"])
      .notNull()
      .default("viewer"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: datetime("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [index("idx_users_username").on(table.username)],
);

// ── Sites ────────────────────────────────────────────────────────
export const sites = mysqlTable("sites", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 128 }).notNull().unique(),
  description: text("description"),
  address: varchar("address", { length: 255 }),
  contact: varchar("contact", { length: 128 }),
  parentId: varchar("parent_id", { length: 36 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// ── Devices ──────────────────────────────────────────────────────
export const devices = mysqlTable(
  "devices",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 128 }).notNull(),
    ipAddress: varchar("ip_address", { length: 45 }).notNull(),
    macAddress: varchar("mac_address", { length: 17 }),
    siteId: varchar("site_id", { length: 36 }),
    deviceType: mysqlEnum("device_type", [
      "switch",
      "router",
      "firewall",
      "ap",
      "server",
      "other",
    ])
      .notNull()
      .default("switch"),
    vendor: varchar("vendor", { length: 64 }),
    model: varchar("model", { length: 128 }),
    osVersion: varchar("os_version", { length: 64 }),
    serialNumber: varchar("serial_number", { length: 64 }),
    role: varchar("role", { length: 64 }),
    status: mysqlEnum("status", [
      "unknown",
      "healthy",
      "warning",
      "critical",
      "maintenance",
      "offline",
    ])
      .notNull()
      .default("unknown"),
    responsibleUserId: varchar("responsible_user_id", { length: 36 }),
    tags: json("tags").$type<string[]>(),
    credentialsEncrypted: text("credentials_encrypted"),
    lastCollectionAt: datetime("last_collection_at"),
    lastResponseMs: int("last_response_ms"),
    uptime: varchar("uptime", { length: 64 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_devices_ip").on(table.ipAddress),
    index("idx_devices_site").on(table.siteId),
    index("idx_devices_status").on(table.status),
  ],
);

// ── Monitor Targets ──────────────────────────────────────────────
export const monitorTargets = mysqlTable(
  "monitor_targets",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    deviceId: varchar("device_id", { length: 36 }).notNull(),
    targetType: mysqlEnum("target_type", [
      "ping",
      "tcp",
      "http",
      "dns",
      "snmp",
    ]).notNull(),
    target: varchar("target", { length: 255 }).notNull(),
    port: int("port"),
    intervalSeconds: int("interval_seconds").notNull().default(60),
    timeoutMs: int("timeout_ms").notNull().default(3000),
    enabled: boolean("enabled").notNull().default(true),
    threshold: json("threshold").$type<{
      latencyMs?: number;
      packetLossRate?: number;
      failCount?: number;
    }>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_monitor_device").on(table.deviceId),
    index("idx_monitor_type").on(table.targetType),
  ],
);

// ── Probe Results ────────────────────────────────────────────────
export const probeResults = mysqlTable(
  "probe_results",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    monitorId: varchar("monitor_id", { length: 36 }).notNull(),
    deviceId: varchar("device_id", { length: 36 }).notNull(),
    success: boolean("success").notNull(),
    latencyMs: decimal("latency_ms", { precision: 8, scale: 2 }),
    packetLossRate: decimal("packet_loss_rate", { precision: 5, scale: 4 }),
    jitterMs: decimal("jitter_ms", { precision: 8, scale: 2 }),
    tcpConnectMs: decimal("tcp_connect_ms", { precision: 8, scale: 2 }),
    httpResponseMs: decimal("http_response_ms", { precision: 8, scale: 2 }),
    httpStatusCode: int("http_status_code"),
    errorMessage: text("error_message"),
    rawOutput: text("raw_output"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_probe_monitor").on(table.monitorId),
    index("idx_probe_device").on(table.deviceId),
    index("idx_probe_time").on(table.createdAt),
  ],
);

// ── Device Metrics (time-series, append-only) ────────────────────
export const deviceMetrics = mysqlTable(
  "device_metrics",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    deviceId: varchar("device_id", { length: 36 }).notNull(),
    cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
    memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
    temperature: decimal("temperature", { precision: 5, scale: 1 }),
    interfaceErrors: int("interface_errors").default(0),
    onlinePorts: int("online_ports").default(0),
    totalPorts: int("total_ports").default(0),
    collectedAt: timestamp("collected_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_metrics_device").on(table.deviceId),
    index("idx_metrics_time").on(table.collectedAt),
  ],
);

// ── Alerts ───────────────────────────────────────────────────────
export const alerts = mysqlTable(
  "alerts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    severity: mysqlEnum("severity", [
      "critical",
      "major",
      "minor",
      "warning",
      "info",
    ]).notNull(),
    status: mysqlEnum("status", [
      "triggered",
      "unconfirmed",
      "confirmed",
      "processing",
      "recovered",
      "closed",
      "silenced",
    ])
      .notNull()
      .default("triggered"),
    deviceId: varchar("device_id", { length: 36 }),
    monitorId: varchar("monitor_id", { length: 36 }),
    objectType: varchar("object_type", { length: 64 }),
    objectId: varchar("object_id", { length: 128 }),
    siteId: varchar("site_id", { length: 36 }),
    businessImpact: mysqlEnum("business_impact", ["high", "medium", "low"]),
    firstSeenAt: timestamp("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    recoveredAt: datetime("recovered_at"),
    closedAt: datetime("closed_at"),
    repeatCount: int("repeat_count").notNull().default(1),
    responsibleUserId: varchar("responsible_user_id", { length: 36 }),
    ticketUrl: varchar("ticket_url", { length: 512 }),
    silencedUntil: datetime("silenced_until"),
    tags: json("tags").$type<string[]>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index("idx_alerts_device").on(table.deviceId),
    index("idx_alerts_severity").on(table.severity),
    index("idx_alerts_status").on(table.status),
    index("idx_alerts_site").on(table.siteId),
  ],
);

// ── Alert Timeline ───────────────────────────────────────────────
export const alertTimeline = mysqlTable(
  "alert_timeline",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    alertId: varchar("alert_id", { length: 36 }).notNull(),
    event: mysqlEnum("event", [
      "triggered",
      "acknowledged",
      "confirmed",
      "processing",
      "silenced",
      "notified",
      "recovered",
      "closed",
      "comment_added",
      "assigned",
    ]).notNull(),
    userId: varchar("user_id", { length: 36 }),
    comment: text("comment"),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("idx_timeline_alert").on(table.alertId)],
);

// ── Events ───────────────────────────────────────────────────────
export const events = mysqlTable(
  "events",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    eventType: mysqlEnum("event_type", [
      "probe_success",
      "probe_failed",
      "alert_triggered",
      "alert_acknowledged",
      "alert_recovered",
      "alert_closed",
      "device_created",
      "device_updated",
      "device_deleted",
      "maintenance_started",
      "maintenance_ended",
      "system",
    ]).notNull(),
    severity: mysqlEnum("severity", [
      "critical",
      "major",
      "minor",
      "warning",
      "info",
    ])
      .notNull()
      .default("info"),
    deviceId: varchar("device_id", { length: 36 }),
    alertId: varchar("alert_id", { length: 36 }),
    monitorId: varchar("monitor_id", { length: 36 }),
    message: text("message").notNull(),
    operator: varchar("operator", { length: 128 }),
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_events_device").on(table.deviceId),
    index("idx_events_type").on(table.eventType),
    index("idx_events_time").on(table.createdAt),
  ],
);

// ── Audit Logs ───────────────────────────────────────────────────
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 }).notNull(),
    username: varchar("username", { length: 64 }).notNull(),
    action: varchar("action", { length: 64 }).notNull(),
    objectType: varchar("object_type", { length: 64 }).notNull(),
    objectId: varchar("object_id", { length: 128 }),
    beforeValue: json("before_value").$type<Record<string, unknown>>(),
    afterValue: json("after_value").$type<Record<string, unknown>>(),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_user").on(table.userId),
    index("idx_audit_object").on(table.objectType),
    index("idx_audit_time").on(table.createdAt),
  ],
);
