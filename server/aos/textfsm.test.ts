import { describe, it, expect } from "vitest";
import { TextFSMParser } from "./textfsm.js";

describe("TextFSMParser", () => {
  it("parses show system output", async () => {
    const parser = new TextFSMParser("http://localhost:8001");
    const raw = `System:\n  Description:   OmniSwitch 6860,\n  Name:          Switch1,\n  Location:      Building A,\n  Contact:       admin@example.com,\n  Up Time:       10 days,\nFlash Space:\n  Available (bytes): 12345678,\n  Comments :         ok\n  Primary CMM:`;
    const result = await parser.parse("ale_aos8", "show system", raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Switch1");
    expect(result[0]!.location).toBe("Building A");
  });

  it("returns empty array on parse failure", async () => {
    const parser = new TextFSMParser("http://localhost:9999");
    const result = await parser.parse("ale_aos8", "show system", "bad");
    expect(result).toEqual([]);
  });
});
