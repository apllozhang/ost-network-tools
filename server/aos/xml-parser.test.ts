import { describe, it, expect } from "vitest";
import { parseAosXml, parseAosError } from "./xml-parser.js";

describe("parseAosXml", () => {
  it("parses auth response with token", () => {
    const xml = `<nodes><result><data><token>abc123</token></data></result></nodes>`;
    const result = parseAosXml(xml);
    expect(result.token).toBe("abc123");
  });
  it("parses CLI response with output", () => {
    const xml = `<nodes><result><data><output>System: OS6860</output></data></result></nodes>`;
    const result = parseAosXml(xml);
    expect(result.output).toBe("System: OS6860");
  });
  it("parses MIB response with indexed values", () => {
    const xml = `<nodes><result><data><mibObject0>sysName</mibObject0><mibObject1>Switch1</mibObject1></data></result></nodes>`;
    const result = parseAosXml(xml);
    expect(result.mibObject0).toBe("sysName");
    expect(result.mibObject1).toBe("Switch1");
  });
  it("returns empty object on invalid XML", () => {
    const result = parseAosXml("not xml");
    expect(result).toEqual({});
  });
});

describe("parseAosError", () => {
  it("parses error response", () => {
    const xml = `<nodes><result><error>Invalid command</error><node>1</node><diag>500</diag></result></nodes>`;
    const error = parseAosError(xml);
    expect(error).toEqual({ error: "Invalid command", node: "1", diag: "500" });
  });
  it("returns null when no error", () => {
    const xml = `<nodes><result><data><token>abc</token></data></result></nodes>`;
    const error = parseAosError(xml);
    expect(error).toBeNull();
  });
});
