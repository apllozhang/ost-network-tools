# OST Network Tools Phase 3: Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add traffic analysis, log parsing, firmware management, and device search features to OST Network Tools.

**Architecture:** Phase 1-2 core engine + feature modules are complete. Phase 3 adds more advanced features following the same pattern: tRPC router → REST API commands → TextFSM parsing → React page.

**Tech Stack:** TypeScript 5.x, React 19, Express 4, tRPC 11, shadcn/ui, Tailwind CSS 4, Vitest, Python 3 (textfsm-aos, FastAPI, tsbuddy)

---

## Task 1: Traffic Analyzer

**Files:**
- Create: `server/routers/traffic.ts`
- Create: `client/src/pages/TrafficAnalyzer.tsx`
- Modify: `server/_core/router.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create Traffic tRPC router**

```typescript
// server/routers/traffic.ts
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";

export const trafficRouter = router({
  getInterfaceStats: publicProcedure
    .input(z.object({ port: z.string() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const raw = await client.executeCli(`show interfaces port ${input.port}`);
        return await parser.parse("ale_aos8", "show interfaces", raw);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  getAllInterfaces: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show interfaces");
      return await parser.parse("ale_aos8", "show interfaces", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  getMacTable: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show mac-learning domain vlan");
      return await parser.parse("ale_aos8", "show mac-learning", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  getArpTable: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show arp");
      return await parser.parse("ale_aos8", "show arp", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),
});
```

- [ ] **Step 2: Create Traffic Analyzer page**

```tsx
// client/src/pages/TrafficAnalyzer.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function TrafficAnalyzer() {
  const [activeTab, setActiveTab] = useState<"interfaces" | "mac" | "arp">("interfaces");
  const interfaces = trpc.traffic.getAllInterfaces.useQuery(undefined, { enabled: activeTab === "interfaces" });
  const macTable = trpc.traffic.getMacTable.useQuery(undefined, { enabled: activeTab === "mac" });
  const arpTable = trpc.traffic.getArpTable.useQuery(undefined, { enabled: activeTab === "arp" });

  const tabs = [
    { key: "interfaces" as const, label: "Interfaces" },
    { key: "mac" as const, label: "MAC Table" },
    { key: "arp" as const, label: "ARP Table" },
  ];

  const activeData = activeTab === "interfaces" ? interfaces : activeTab === "mac" ? macTable : arpTable;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Traffic Analyzer</h1>
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-2 ${activeTab === tab.key ? "border-b-2 border-blue-600 font-semibold" : ""}`}>{tab.label}</button>
        ))}
      </div>
      {activeData.isLoading && <p>Loading...</p>}
      {activeData.data && activeData.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(activeData.data[0]!).map((key) => (
                  <th key={key} className="border p-2 text-left">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeData.data.map((row: Record<string, string>, i: number) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border p-2">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeData.data && activeData.data.length === 0 && <p className="text-gray-500">No data available</p>}
    </div>
  );
}
```

- [ ] **Step 3: Register router + add route**
- [ ] **Step 4: Run tests and type check**
- [ ] **Step 5: Commit**

---

## Task 2: Log Analyzer

**Files:**
- Create: `python/routers/log_analyzer.py`
- Create: `server/routers/log.ts`
- Create: `client/src/pages/LogAnalyzer.tsx`
- Modify: `python/main.py`
- Modify: `server/_core/router.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add log analysis endpoint to Python backend**

```python
# python/routers/log_analyzer.py
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

class LogParseRequest(BaseModel):
    section: str  # e.g., "show temperature", "show health"
    raw_output: str

@router.post("/api/log/parse")
def parse_log_section(req: LogParseRequest):
    """Parse a specific section from tech_support.log output"""
    try:
        from textfsm_aos.parser import parse
        # Try AOS8 first, fallback to AOS6
        try:
            result = parse("ale_aos8", req.section, req.raw_output)
        except Exception:
            result = parse("ale_aos6", req.section, req.raw_output)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}

@router.post("/api/log/sections")
def extract_sections(raw_output: str):
    """Extract available sections from a tech_support.log file"""
    import re
    sections = []
    lines = raw_output.split("\n")
    for i, line in enumerate(lines):
        # Match AOS CLI command headers like "show system" or "show vlan"
        match = re.match(r"^(show\s+\S+.*|no\s+show\s+\S+.*)$", line.strip())
        if match:
            sections.append({"line": i, "command": match.group(1).strip()})
    return {"success": True, "sections": sections}
```

- [ ] **Step 2: Update Python main.py to include log router**

```python
# Add to python/main.py
from routers.log_analyzer import router as log_router
app.include_router(log_router)
```

- [ ] **Step 3: Create TypeScript log router**

```typescript
// server/routers/log.ts
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { TRPCError } from "@trpc/server";

const PYTHON_BACKEND = `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`;

export const logRouter = router({
  parseSection: publicProcedure
    .input(z.object({ section: z.string(), rawOutput: z.string() }))
    .query(async ({ input }) => {
      try {
        const resp = await fetch(`${PYTHON_BACKEND}/api/log/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section: input.section, raw_output: input.rawOutput }),
        });
        const data = await resp.json() as { success: boolean; data: Record<string, string>[] };
        return data.data;
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  extractSections: publicProcedure
    .input(z.object({ rawOutput: z.string() }))
    .query(async ({ input }) => {
      try {
        const resp = await fetch(`${PYTHON_BACKEND}/api/log/sections`, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: input.rawOutput,
        });
        const data = await resp.json() as { success: boolean; sections: { line: number; command: string }[] };
        return data.sections;
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 4: Create Log Analyzer page**

```tsx
// client/src/pages/LogAnalyzer.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const SECTIONS = [
  "show system",
  "show chassis",
  "show health",
  "show temperature",
  "show vlan",
  "show interfaces",
  "show mac-learning",
  "show arp",
];

export default function LogAnalyzer() {
  const [rawOutput, setRawOutput] = useState("");
  const [selectedSection, setSelectedSection] = useState("show system");
  const parseSection = trpc.log.parseSection.useQuery(
    { section: selectedSection, rawOutput },
    { enabled: false }
  );

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Log Analyzer</h1>
      <p className="text-gray-500">Paste tech_support.log content below, then select a section to parse.</p>
      <textarea
        value={rawOutput}
        onChange={(e) => setRawOutput(e.target.value)}
        placeholder="Paste tech_support.log content here..."
        className="w-full h-48 p-2 border rounded font-mono text-sm"
      />
      <div className="flex gap-2 items-center">
        <select value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)} className="border rounded p-1">
          {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => parseSection.refetch()} disabled={!rawOutput} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">Parse</button>
      </div>
      {parseSection.isLoading && <p>Parsing...</p>}
      {parseSection.data && parseSection.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(parseSection.data[0]!).map((key) => (
                  <th key={key} className="border p-2 text-left">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parseSection.data.map((row: Record<string, string>, i: number) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border p-2">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {parseSection.data && parseSection.data.length === 0 && <p className="text-gray-500">No data parsed for this section</p>}
    </div>
  );
}
```

- [ ] **Step 5: Register router + add route**
- [ ] **Step 6: Run tests and type check**
- [ ] **Step 7: Commit**

---

## Task 3: Firmware Manager

**Files:**
- Create: `python/routers/firmware.py`
- Create: `server/routers/firmware.ts`
- Create: `client/src/pages/FirmwareManager.tsx`
- Modify: `python/main.py`
- Modify: `server/_core/router.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Add firmware endpoint to Python backend**

```python
# python/routers/firmware.py
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

@router.get("/api/firmware/ga")
def get_ga_version(model: str = ""):
    """Get GA version for a switch model"""
    try:
        import json, os
        ga_file = os.path.join(os.path.dirname(__file__), "..", "textfsm_templates", "ga_latest.json")
        if os.path.exists(ga_file):
            with open(ga_file) as f:
                data = json.load(f)
            if model and model in data:
                return {"success": True, "model": model, "ga_version": data[model]}
            return {"success": True, "models": list(data.keys())}
        return {"success": False, "error": "GA data not available"}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

- [ ] **Step 2: Create TypeScript firmware router**

```typescript
// server/routers/firmware.ts
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient } from "../aos/store.js";
import { TRPCError } from "@trpc/server";

const PYTHON_BACKEND = `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`;

export const firmwareRouter = router({
  getCurrentVersion: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show microcode");
      return raw;
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  getChassisInfo: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show chassis");
      return raw;
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  getGaVersion: publicProcedure
    .input(z.object({ model: z.string() }))
    .query(async ({ input }) => {
      try {
        const resp = await fetch(`${PYTHON_BACKEND}/api/firmware/ga?model=${encodeURIComponent(input.model)}`);
        return await resp.json() as { success: boolean; ga_version?: string; models?: string[] };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 3: Create Firmware Manager page**

```tsx
// client/src/pages/FirmwareManager.tsx
import { trpc } from "@/lib/trpc";

export default function FirmwareManager() {
  const version = trpc.firmware.getCurrentVersion.useQuery();
  const chassis = trpc.firmware.getChassisInfo.useQuery();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Firmware Manager</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Current Version</h2>
        {version.isLoading && <p>Loading...</p>}
        {version.data && (
          <pre className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap">{version.data}</pre>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Chassis Information</h2>
        {chassis.isLoading && <p>Loading...</p>}
        {chassis.data && (
          <pre className="bg-gray-50 p-4 rounded text-sm font-mono whitespace-pre-wrap">{chassis.data}</pre>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register router + add route**
- [ ] **Step 5: Run tests and type check**
- [ ] **Step 6: Commit**

---

## Task 4: Device Search

**Files:**
- Create: `server/routers/search.ts`
- Create: `client/src/pages/DeviceSearch.tsx`
- Modify: `server/_core/router.ts`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create Search tRPC router**

```typescript
// server/routers/search.ts
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";

export const searchRouter = router({
  searchByMac: publicProcedure
    .input(z.object({ mac: z.string() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        // Search MAC learning table
        const raw = await client.executeCli("show mac-learning domain vlan");
        const macTable = await parser.parse("ale_aos8", "show mac-learning", raw);
        const results = macTable.filter((row: Record<string, string>) => {
          const rowMac = Object.values(row).join(" ").toLowerCase();
          return rowMac.includes(input.mac.toLowerCase());
        });
        return results;
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  searchByIp: publicProcedure
    .input(z.object({ ip: z.string() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const raw = await client.executeCli("show arp");
        const arpTable = await parser.parse("ale_aos8", "show arp", raw);
        const results = arpTable.filter((row: Record<string, string>) => {
          const rowIp = Object.values(row).join(" ").toLowerCase();
          return rowIp.includes(input.ip.toLowerCase());
        });
        return results;
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  searchByPort: publicProcedure
    .input(z.object({ port: z.string() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const raw = await client.executeCli(`show mac-learning port ${input.port}`);
        return await parser.parse("ale_aos8", "show mac-learning", raw);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 2: Create Device Search page**

```tsx
// client/src/pages/DeviceSearch.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function DeviceSearch() {
  const [searchType, setSearchType] = useState<"mac" | "ip" | "port">("mac");
  const [query, setQuery] = useState("");

  const macSearch = trpc.search.searchByMac.useQuery({ mac: query }, { enabled: searchType === "mac" && query.length > 0 });
  const ipSearch = trpc.search.searchByIp.useQuery({ ip: query }, { enabled: searchType === "ip" && query.length > 0 });
  const portSearch = trpc.search.searchByPort.useQuery({ port: query }, { enabled: searchType === "port" && query.length > 0 });

  const activeResults = searchType === "mac" ? macSearch : searchType === "ip" ? ipSearch : portSearch;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Device Search</h1>
      <div className="flex gap-2">
        <select value={searchType} onChange={(e) => { setSearchType(e.target.value as typeof searchType); setQuery(""); }} className="border rounded p-1">
          <option value="mac">MAC Address</option>
          <option value="ip">IP Address</option>
          <option value="port">Port</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchType === "mac" ? "aa:bb:cc" : searchType === "ip" ? "192.168.1" : "1/1/1"}
          className="border rounded p-1 flex-1"
        />
      </div>
      {activeResults.isLoading && <p>Searching...</p>}
      {activeResults.data && activeResults.data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                {Object.keys(activeResults.data[0]!).map((key) => (
                  <th key={key} className="border p-2 text-left">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeResults.data.map((row: Record<string, string>, i: number) => (
                <tr key={i}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} className="border p-2">{val}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {activeResults.data && activeResults.data.length === 0 && query && <p className="text-gray-500">No results found</p>}
    </div>
  );
}
```

- [ ] **Step 3: Register router + add route**
- [ ] **Step 4: Run tests and type check**
- [ ] **Step 5: Commit**

---

## Task 5: Navigation Update + E2E Verification

- [ ] **Step 1: Update Navbar with new links**

```tsx
// client/src/components/layout/Navbar.tsx
const links = [
  { href: "/", label: "Dashboard" },
  { href: "/connect", label: "Connect" },
  { href: "/poe", label: "PoE" },
  { href: "/tdr", label: "TDR" },
  { href: "/vlan", label: "VLAN" },
  { href: "/snmp", label: "SNMP" },
  { href: "/traffic", label: "Traffic" },
  { href: "/log", label: "Log" },
  { href: "/firmware", label: "Firmware" },
  { href: "/search", label: "Search" },
];
```

- [ ] **Step 2: Update App.tsx with all new routes**
- [ ] **Step 3: Run full test suite**
- [ ] **Step 4: Run type check and lint**
- [ ] **Step 5: Final commit**
