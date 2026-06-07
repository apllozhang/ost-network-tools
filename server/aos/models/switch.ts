// Device model interfaces — Switch → Chassis → Slot → Port hierarchy

import type {
  PortStatus,
  PoeStatus,
  ThresholdType,
  SwitchStatus,
} from "./types.js";

/** Top-level switch model */
export interface SwitchModel {
  name: string;
  ipAddress: string;
  version: string;
  status: SwitchStatus;
  upTime: string;
  chassisList: ChassisModel[];
}

/** Chassis (physical box) within a switch */
export interface ChassisModel {
  number: number;
  model: string;
  serialNumber: string;
  macAddress: string;
  temperature: TemperatureInfo[];
  fpga: string;
  cpld: string;
  uboot: string;
  onie: string;
  cpu: string;
  freeFlash: string;
  slots: SlotModel[];
  powerSupplies: PowerSupplyModel[];
}

/** Temperature reading with classification */
export interface TemperatureInfo {
  current: number;
  threshold: number;
  danger: number;
  status: ThresholdType;
}

/** Slot (line card / module) within a chassis */
export interface SlotModel {
  number: number;
  name: string;
  model: string;
  nbPorts: number;
  poe: PoeSlotInfo;
  ports: PortModel[];
  transceivers: TransceiverModel[];
}

/** PoE power info at slot level */
export interface PoeSlotInfo {
  power: number;
  budget: number;
  threshold: number;
  status: ThresholdType;
}

/** Single network port */
export interface PortModel {
  number: number;
  name: string;
  alias: string;
  status: PortStatus;
  isEnabled: boolean;
  poe: PoePortInfo;
  macList: string[];
  ipAddress: string;
  linkAggId: number;
  detail: PortDetail;
}

/** PoE info at port level */
export interface PoePortInfo {
  status: PoeStatus;
  power: number;
  maxPower: number;
  classInfo: string;
  priority: string;
}

/** Physical layer detail for a port */
export interface PortDetail {
  type: string;
  interfaceType: string;
  bandwidth: string;
  duplex: string;
  linkQuality: string;
}

/** Pluggable transceiver (SFP/QSFP) */
export interface TransceiverModel {
  chassis: number;
  slot: number;
  number: number;
  modelName: string;
  serialNumber: string;
  adminStatus: string;
  operStatus: string;
}

/** Power supply unit */
export interface PowerSupplyModel {
  id: number;
  name: string;
  model: string;
  status: string;
  powerProvision: string;
}
