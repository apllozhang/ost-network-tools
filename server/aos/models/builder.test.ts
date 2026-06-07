import { describe, it, expect } from "vitest";
import {
  buildSwitchFromSystem,
  buildChassisFromChassis,
  buildTemperatureFromParsed,
} from "./builder.js";
import { SwitchStatus, ThresholdType } from "./types.js";

describe("buildSwitchFromSystem", () => {
  it("builds a switch model from valid parsed data", () => {
    const parsed: Record<string, string>[] = [
      {
        NAME: "Switch1",
        VERSION: "8.7.123",
        UPTIME: "10 days 3 hours",
      },
    ];

    const sw = buildSwitchFromSystem(parsed, "192.168.1.1");
    expect(sw.name).toBe("Switch1");
    expect(sw.ipAddress).toBe("192.168.1.1");
    expect(sw.version).toBe("8.7.123");
    expect(sw.upTime).toBe("10 days 3 hours");
    expect(sw.status).toBe(SwitchStatus.Reachable);
    expect(sw.chassisList).toEqual([]);
  });

  it("returns defaults when parsed data is empty", () => {
    const sw = buildSwitchFromSystem([], "10.0.0.1");
    expect(sw.name).toBe("");
    expect(sw.ipAddress).toBe("10.0.0.1");
    expect(sw.version).toBe("");
    expect(sw.status).toBe(SwitchStatus.Unknown);
    expect(sw.upTime).toBe("");
    expect(sw.chassisList).toEqual([]);
  });

  it("handles alternative field names", () => {
    const parsed: Record<string, string>[] = [
      {
        SYSTEM_NAME: "AltSwitch",
        DESCRIPTION: "AOS 8.7R2",
        UP_TIME: "5 hours",
      },
    ];

    const sw = buildSwitchFromSystem(parsed, "10.0.0.2");
    expect(sw.name).toBe("AltSwitch");
    expect(sw.version).toBe("AOS 8.7R2");
    expect(sw.upTime).toBe("5 hours");
  });
});

describe("buildChassisFromChassis", () => {
  it("builds chassis models from valid parsed data", () => {
    const parsed: Record<string, string>[] = [
      {
        CHASSIS_NUM: "1",
        MODEL: "OS6860-48",
        SERIAL_NUMBER: "ABC123456",
        MAC_ADDRESS: "00:1a:2b:3c:4d:5e",
        FPGA: "v2.1",
        CPLD: "v1.0",
        CPU: "ARM",
        FREE_FLASH: "123456789",
      },
    ];

    const chassis = buildChassisFromChassis(parsed);
    expect(chassis).toHaveLength(1);
    expect(chassis[0]!.number).toBe(1);
    expect(chassis[0]!.model).toBe("OS6860-48");
    expect(chassis[0]!.serialNumber).toBe("ABC123456");
    expect(chassis[0]!.macAddress).toBe("00:1a:2b:3c:4d:5e");
    expect(chassis[0]!.fpga).toBe("v2.1");
    expect(chassis[0]!.cpld).toBe("v1.0");
    expect(chassis[0]!.cpu).toBe("ARM");
    expect(chassis[0]!.freeFlash).toBe("123456789");
    expect(chassis[0]!.slots).toEqual([]);
    expect(chassis[0]!.powerSupplies).toEqual([]);
  });

  it("returns empty array when parsed data is empty", () => {
    expect(buildChassisFromChassis([])).toEqual([]);
  });

  it("handles multiple chassis", () => {
    const parsed: Record<string, string>[] = [
      { CHASSIS_NUM: "1", MODEL: "OS6860-48" },
      { CHASSIS_NUM: "2", MODEL: "OS6860-24" },
    ];

    const chassis = buildChassisFromChassis(parsed);
    expect(chassis).toHaveLength(2);
    expect(chassis[0]!.number).toBe(1);
    expect(chassis[1]!.number).toBe(2);
  });
});

describe("buildTemperatureFromParsed", () => {
  it("classifies temperature readings correctly", () => {
    const parsed: Record<string, string>[] = [
      { CURRENT: "45", THRESHOLD: "65", DANGER: "80" },
      { CURRENT: "66", THRESHOLD: "65", DANGER: "80" },
      { CURRENT: "80", THRESHOLD: "65", DANGER: "80" },
      { CURRENT: "56", THRESHOLD: "65", DANGER: "80" },
    ];

    const temps = buildTemperatureFromParsed(parsed);
    expect(temps).toHaveLength(4);
    expect(temps[0]!.status).toBe(ThresholdType.UnderThreshold);
    expect(temps[1]!.status).toBe(ThresholdType.OverThreshold);
    expect(temps[2]!.status).toBe(ThresholdType.Danger);
    expect(temps[3]!.status).toBe(ThresholdType.NearThreshold);
  });

  it("returns empty array when parsed data is empty", () => {
    expect(buildTemperatureFromParsed([])).toEqual([]);
  });
});
