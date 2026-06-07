import { describe, it, expect } from "vitest";
import { buildCommand, CMD_TBL } from "./command-table.js";

describe("CMD_TBL", () => {
  it("contains SHOW_SYSTEM command", () => {
    expect(CMD_TBL.SHOW_SYSTEM).toBe("show system");
  });
  it("contains POWER_UP_PORT with placeholder", () => {
    expect(CMD_TBL.POWER_UP_PORT).toContain("%_DATA_%");
  });
  it("has at least 100 commands", () => {
    expect(Object.keys(CMD_TBL).length).toBeGreaterThanOrEqual(100);
  });
});

describe("buildCommand", () => {
  it("builds command without data", () => {
    expect(buildCommand("SHOW_SYSTEM")).toBe("show system");
  });
  it("builds command with one data param", () => {
    expect(buildCommand("POWER_UP_PORT", "1/1/2")).toBe("lanpower port 1/1/2 admin-state enable");
  });
  it("builds command with two data params", () => {
    expect(buildCommand("SET_MAX_POWER_PORT", "1/1/2", "30")).toBe("lanpower port 1/1/2 power 30");
  });
  it("throws on missing data param", () => {
    expect(() => buildCommand("POWER_UP_PORT")).toThrow("requires 1 data");
  });
});
