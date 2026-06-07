import { AosRestClient } from "./rest-client.js";

const TTL_MS = 30 * 60 * 1000; // 30 minutes
const EVICTION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface PoolEntry {
  client: AosRestClient;
  ip: string;
  lastActivity: Date;
}

const pool = new Map<string, PoolEntry>();

const timer = setInterval(evictStale, EVICTION_INTERVAL_MS);
timer.unref?.();

function evictStale(): void {
  const now = Date.now();
  for (const [deviceId, entry] of pool) {
    if (now - entry.lastActivity.getTime() > TTL_MS) {
      entry.client.disconnect();
      pool.delete(deviceId);
    }
  }
}

export function getClient(deviceId: string): AosRestClient | null {
  return pool.get(deviceId)?.client ?? null;
}

export function setClient(
  deviceId: string,
  client: AosRestClient,
): void {
  pool.set(deviceId, {
    client,
    ip: (client as unknown as { ip: string }).ip,
    lastActivity: new Date(),
  });
}

export function removeClient(deviceId: string): void {
  const entry = pool.get(deviceId);
  if (entry) {
    entry.client.disconnect();
    pool.delete(deviceId);
  }
}

export function hasClient(deviceId: string): boolean {
  return pool.has(deviceId);
}

export function listConnections(): Array<{
  deviceId: string;
  ip: string;
  connected: boolean;
  lastActivity: Date;
}> {
  return Array.from(pool.entries()).map(([deviceId, entry]) => ({
    deviceId,
    ip: entry.ip,
    connected: entry.client.connected,
    lastActivity: entry.lastActivity,
  }));
}

export function touchActivity(deviceId: string): void {
  const entry = pool.get(deviceId);
  if (entry) {
    entry.lastActivity = new Date();
  }
}
