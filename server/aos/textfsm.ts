export class TextFSMParser {
  constructor(private backendUrl = "http://localhost:8001") {}

  async parse(platform: "ale_aos6" | "ale_aos8", command: string, rawOutput: string): Promise<Record<string, string>[]> {
    try {
      const response = await fetch(`${this.backendUrl}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, command, raw_output: rawOutput }),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) return [];
      const data = await response.json() as { success: boolean; data: Record<string, string>[]; error?: string };
      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  async listTemplates(): Promise<string[]> {
    try {
      const response = await fetch(`${this.backendUrl}/api/templates`);
      if (!response.ok) return [];
      const data = await response.json() as { templates: string[] };
      return data.templates;
    } catch {
      return [];
    }
  }
}
