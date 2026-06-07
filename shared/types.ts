// Pagination types
export interface PaginationInput {
  page?: number; // 1-based, default 1
  pageSize?: number; // default 50
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Sorting
export type SortDirection = "asc" | "desc";

export interface SortInput {
  field: string;
  direction: SortDirection;
}

// Filtering
export interface DeviceFilterInput {
  status?: string;
  siteId?: string;
  deviceType?: string;
  vendor?: string;
  search?: string;
  tags?: string[];
}

export interface AlertFilterInput {
  severity?: string;
  status?: string;
  siteId?: string;
  deviceId?: string;
  search?: string;
}

export interface AuditFilterInput {
  userId?: string;
  action?: string;
  objectType?: string;
}

export interface EventFilterInput {
  eventType?: string;
  severity?: string;
  deviceId?: string;
}

// Status types
export type DeviceStatus =
  | "unknown"
  | "healthy"
  | "warning"
  | "critical"
  | "maintenance"
  | "offline";

export type AlertSeverity = "critical" | "major" | "minor" | "warning" | "info";

export type AlertStatus =
  | "triggered"
  | "unconfirmed"
  | "confirmed"
  | "processing"
  | "recovered"
  | "closed"
  | "silenced";

export type DeviceType = "switch" | "router" | "firewall" | "ap" | "server" | "other";

export type MonitorType = "ping" | "tcp" | "http" | "dns" | "snmp";

export type UserRole = "admin" | "operator" | "viewer";
