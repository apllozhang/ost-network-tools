// Device model enums and value types

export enum PortStatus {
  Unknown = "unknown",
  Up = "up",
  Down = "down",
  Blocked = "blocked",
}

export enum PoeStatus {
  On = "on",
  Off = "off",
  Searching = "searching",
  Fault = "fault",
  Deny = "deny",
  NoPoe = "no-poe",
}

export enum ThresholdType {
  Unknown = "unknown",
  UnderThreshold = "under",
  NearThreshold = "near",
  OverThreshold = "over",
  Danger = "danger",
}

export enum SwitchStatus {
  Unknown = "unknown",
  Reachable = "reachable",
  Unreachable = "unreachable",
  LoginFail = "login-fail",
}

export interface ChassisSlotPort {
  chassis: number;
  slot: number;
  port: number;
}

/**
 * Parse a port name like "1/1/5" into { chassis: 1, slot: 1, port: 5 }.
 * Returns { chassis: 0, slot: 0, port: 0 } on invalid input.
 */
export function parseChassisSlotPort(name: string): ChassisSlotPort {
  const parts = name.split("/");
  if (parts.length === 3) {
    const c = Number(parts[0]);
    const s = Number(parts[1]);
    const p = Number(parts[2]);
    if (!isNaN(c) && !isNaN(s) && !isNaN(p)) {
      return { chassis: c, slot: s, port: p };
    }
  }
  return { chassis: 0, slot: 0, port: 0 };
}
