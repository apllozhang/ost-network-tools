import type { SwitchModel } from "./models/switch.js";

interface CacheEntry {
  model: SwitchModel;
  updatedAt: Date;
}

const cache = new Map<string, CacheEntry>();

export function getModel(deviceId: string): SwitchModel | null {
  return cache.get(deviceId)?.model ?? null;
}

export function setModel(deviceId: string, model: SwitchModel): void {
  cache.set(deviceId, { model, updatedAt: new Date() });
}

export function removeModel(deviceId: string): void {
  cache.delete(deviceId);
}

export function clearAll(): void {
  cache.clear();
}
