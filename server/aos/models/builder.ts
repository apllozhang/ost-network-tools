// Builder functions — convert TextFSM parsed output into typed model objects

import type {
  SwitchModel,
  ChassisModel,
  TemperatureInfo,
} from "./switch.js";

import {
  ThresholdType,
  SwitchStatus,
} from "./types.js";

// ── helpers ──────────────────────────────────────────────────────────────

function str(row: Record<string, string> | undefined, key: string): string {
  return (row?.[key] ?? "").trim();
}

function num(row: Record<string, string> | undefined, key: string): number {
  const v = Number(str(row, key));
  return isNaN(v) ? 0 : v;
}

/** Classify a temperature reading into a ThresholdType */
function classifyTemperature(current: number, threshold: number, danger: number): ThresholdType {
  if (current <= 0 && threshold <= 0 && danger <= 0) return ThresholdType.Unknown;
  if (danger > 0 && current >= danger) return ThresholdType.Danger;
  if (threshold > 0 && current >= threshold) return ThresholdType.OverThreshold;
  if (threshold > 0 && current >= threshold * 0.85) return ThresholdType.NearThreshold;
  if (threshold > 0 && current < threshold) return ThresholdType.UnderThreshold;
  return ThresholdType.Unknown;
}

// ── default factories ────────────────────────────────────────────────────

function defaultSwitchModel(ip: string): SwitchModel {
  return {
    name: "",
    ipAddress: ip,
    version: "",
    status: SwitchStatus.Unknown,
    upTime: "",
    chassisList: [],
  };
}

function defaultChassisModel(): ChassisModel {
  return {
    number: 0,
    model: "",
    serialNumber: "",
    macAddress: "",
    temperature: [],
    fpga: "",
    cpld: "",
    uboot: "",
    onie: "",
    cpu: "",
    freeFlash: "",
    slots: [],
    powerSupplies: [],
  };
}

function defaultTemperatureInfo(): TemperatureInfo {
  return {
    current: 0,
    threshold: 0,
    danger: 0,
    status: ThresholdType.Unknown,
  };
}

// ── builders ─────────────────────────────────────────────────────────────

/**
 * Build a SwitchModel from TextFSM-parsed "show system" output.
 * `parsed` is the array returned by TextFSMParser.parse().
 * `ip` is the switch management IP address.
 */
export function buildSwitchFromSystem(
  parsed: Record<string, string>[],
  ip: string,
): SwitchModel {
  if (!parsed.length) return defaultSwitchModel(ip);

  const row = parsed[0]!;
  const sw = defaultSwitchModel(ip);

  sw.name = str(row, "NAME") || str(row, "SYSTEM_NAME");
  sw.version = str(row, "VERSION") || str(row, "DESCRIPTION");
  sw.upTime = str(row, "UPTIME") || str(row, "UP_TIME");
  sw.status = SwitchStatus.Reachable;

  return sw;
}

/**
 * Build ChassisModel[] from TextFSM-parsed "show chassis" output.
 * Each element in `parsed` represents one chassis row.
 */
export function buildChassisFromChassis(
  parsed: Record<string, string>[],
): ChassisModel[] {
  if (!parsed.length) return [];

  // TextFSM "show chassis" typically produces one row per chassis
  return parsed.map((row) => {
    const ch = defaultChassisModel();
    ch.number = num(row, "CHASSIS_NUM") || num(row, "CHASSIS");
    ch.model = str(row, "MODEL") || str(row, "CHASSIS_MODEL");
    ch.serialNumber = str(row, "SERIAL_NUMBER") || str(row, "SERIAL");
    ch.macAddress = str(row, "MAC_ADDRESS") || str(row, "MAC");
    ch.fpga = str(row, "FPGA");
    ch.cpld = str(row, "CPLD");
    ch.uboot = str(row, "UBOOT") || str(row, "U_BOOT");
    ch.onie = str(row, "ONIE");
    ch.cpu = str(row, "CPU");
    ch.freeFlash = str(row, "FREE_FLASH") || str(row, "FLASH_FREE");
    return ch;
  });
}

/**
 * Build TemperatureInfo[] from TextFSM-parsed "show temperature" output.
 * Classifies each reading into a ThresholdType.
 */
export function buildTemperatureFromParsed(
  parsed: Record<string, string>[],
): TemperatureInfo[] {
  if (!parsed.length) return [];

  return parsed.map((row) => {
    const info = defaultTemperatureInfo();
    info.current = num(row, "CURRENT") || num(row, "TEMP");
    info.threshold = num(row, "THRESHOLD") || num(row, "WARNING");
    info.danger = num(row, "DANGER") || num(row, "CRITICAL");
    info.status = classifyTemperature(info.current, info.threshold, info.danger);
    return info;
  });
}
