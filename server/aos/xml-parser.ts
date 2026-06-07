import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  parseAttributeValue: true,
  trimValues: true,
});

interface AosXmlResult {
  token?: string;
  output?: string;
  error?: string;
  node?: string;
  diag?: string;
  [key: string]: string | undefined;
}

export function parseAosXml(xml: string): AosXmlResult {
  try {
    const parsed = parser.parse(xml);
    const data = parsed?.nodes?.result?.data;
    if (!data || typeof data !== "object") return {};
    return data as AosXmlResult;
  } catch {
    return {};
  }
}

export function parseAosError(xml: string): { error: string; node: string; diag: string } | null {
  try {
    const parsed = parser.parse(xml);
    const result = parsed?.nodes?.result;
    if (!result?.error) return null;
    return {
      error: String(result.error),
      node: String(result.node ?? ""),
      diag: String(result.diag ?? ""),
    };
  } catch {
    return null;
  }
}
