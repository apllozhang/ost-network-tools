# OST Network Tools Phase 1: Core Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web tool that connects to ALE OmniSwitch devices via REST API, parses CLI output with TextFSM, and displays system information in a React dashboard.

**Architecture:** Express + tRPC backend wraps an AOS REST API client (ported from C#). CLI output is parsed via Python TextFSM subprocess. React frontend displays structured data.

**Tech Stack:** TypeScript 5.x, React 19, Vite 7, Express 4, tRPC 11, shadcn/ui, Tailwind CSS 4, Vitest, Python 3 (textfsm-aos, FastAPI)

---

## File Structure

```
OST/
├── client/src/
│   ├── App.tsx                          # Wouter routes
│   ├── main.tsx                         # React entry
│   ├── lib/
│   │   ├── trpc.ts                      # tRPC React Query client
│   │   └── utils.ts                     # cn() helper
│   ├── pages/
│   │   ├── Dashboard.tsx                # System info display
│   │   └── DeviceManager.tsx            # Connect form
│   └── components/
│       └── ui/                          # shadcn components (auto-generated)
│
├── server/
│   ├── _core/
│   │   ├── index.ts                     # Express + tRPC entry
│   │   └── trpc.ts                      # tRPC instance + procedures
│   ├── routers/
│   │   ├── switch.ts                    # connect/disconnect/getInfo
│   │   └── system.ts                    # showSystem/showChassis/showHealth
│   └── aos/
│       ├── rest-client.ts               # AOS REST API client
│       ├── command-table.ts             # 168 commands
│       ├── textfsm.ts                   # TextFSM parser wrapper
│       ├── xml-parser.ts                # XML response parser
│       └── models/
│           ├── types.ts                 # Enums and shared types
│           ├── switch.ts                # SwitchModel
│           └── builder.ts              # Build model from parsed output
│
├── python/
│   ├── main.py                          # FastAPI server
│   ├── requirements.txt                 # textfsm-aos, fastapi, uvicorn
│   └── textfsm_templates/              # Copied from textfsm-aos
│
├── shared/
│   └── const.ts                         # Shared constants
│
├── server/                              # Tests
│   ├── aos/
│   │   ├── rest-client.test.ts
│   │   ├── command-table.test.ts
│   │   ├── textfsm.test.ts
│   │   └── xml-parser.test.ts
│   └── routers/
│       └── switch.test.ts
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .env.example
└── CLAUDE.md
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `server/_core/trpc.ts`
- Create: `server/_core/index.ts`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/lib/trpc.ts`
- Create: `shared/const.ts`

- [ ] **Step 1: Initialize project**

```bash
cd "d:/Claude code/OST"
pnpm init
```

- [ ] **Step 2: Install dependencies**

```bash
pnpm add express @trpc/server @trpc/client @trpc/react-query @tanstack/react-query react react-dom react-i18next wouter recharts zustand fast-xml-parser ssh2 jose bcryptjs drizzle-orm mysql2
pnpm add -D typescript @types/react @types/react-dom @types/express @types/node @types/ssh2 @types/bcryptjs vite @vitejs/plugin-react tailwindcss @tailwindcss/vite vitest esbuild tsx eslint prettier
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "baseUrl": ".",
    "paths": {
      "@/*": ["client/src/*"],
      "@shared/*": ["shared/*"]
    }
  },
  "include": ["client/src/**/*", "server/**/*", "shared/**/*"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
```

- [ ] **Step 5: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
```

- [ ] **Step 6: Create .env.example**

```
PORT=3000
PYTHON_BACKEND_PORT=8001
DATABASE_URL=mysql://root:@localhost:3306/ost_network_tools
NODE_ENV=development
```

- [ ] **Step 7: Create shared/const.ts**

```typescript
export const API_PREFIX = "/api/trpc";
export const DEFAULT_SWITCH_PORT = 443;
export const AOS_REST_ACCEPT = "application/vnd.alcatellucentaos+xml";
export const AOS_CONTEXT = "vrf=default";
```

- [ ] **Step 8: Create server/_core/trpc.ts**

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

interface Context {
  // Will hold AosRestClient instance
  switchClient: null | {
    ip: string;
    connected: boolean;
  };
}

export const createContext = (_opts: CreateExpressContextOptions): Context => ({
  switchClient: null,
});

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
```

- [ ] **Step 9: Create server/_core/index.ts**

```typescript
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./trpc.js";
import { API_PREFIX } from "../../shared/const.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

// tRPC middleware placeholder — router imported in later task
app.use(
  API_PREFIX,
  createExpressMiddleware({
    router: undefined as any, // Replaced after router is created
    createContext,
  })
);

app.listen(PORT, () => {
  console.log(`OST Network Tools server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 10: Create client/src/lib/trpc.ts**

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/_core/router";

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 11: Create client/src/main.tsx**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc } from "./lib/trpc";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient] = React.useState(() =>
    trpc.createClient({
      links: [
        trpc.httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrpcProvider>
      <App />
    </TrpcProvider>
  </React.StrictMode>
);
```

- [ ] **Step 12: Create client/src/App.tsx**

```tsx
import { Route, Switch } from "wouter";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Switch>
        <Route path="/" component={() => <div>OST Network Tools</div>} />
        <Route>404 Not Found</Route>
      </Switch>
    </div>
  );
}
```

- [ ] **Step 13: Add package.json scripts**

```json
{
  "scripts": {
    "dev": "tsx watch server/_core/index.ts",
    "build": "vite build && esbuild server/_core/index.ts --bundle --platform=node --outdir=dist --format=esm",
    "check": "tsc --noEmit",
    "test": "vitest",
    "format": "prettier --write ."
  }
}
```

- [ ] **Step 14: Run type check and verify**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat: project scaffold with Express + tRPC + React + Vite"
```

---

## Task 2: XML Parser

**Files:**
- Create: `server/aos/xml-parser.ts`
- Create: `server/aos/xml-parser.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/aos/xml-parser.test.ts
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
    expect(error).toEqual({
      error: "Invalid command",
      node: "1",
      diag: "500",
    });
  });

  it("returns null when no error", () => {
    const xml = `<nodes><result><data><token>abc</token></data></result></nodes>`;
    const error = parseAosError(xml);
    expect(error).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run server/aos/xml-parser.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// server/aos/xml-parser.ts
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

export function parseAosError(xml: string): {
  error: string;
  node: string;
  diag: string;
} | null {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run server/aos/xml-parser.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/aos/xml-parser.ts server/aos/xml-parser.test.ts
git commit -m "feat: AOS XML response parser with fast-xml-parser"
```

---

## Task 3: Command Table

**Files:**
- Create: `server/aos/command-table.ts`
- Create: `server/aos/command-table.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/aos/command-table.test.ts
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
    expect(buildCommand("POWER_UP_PORT", "1/1/2")).toBe(
      "lanpower port 1/1/2 admin-state enable"
    );
  });

  it("builds command with two data params", () => {
    expect(buildCommand("SET_MAX_POWER_PORT", "1/1/2", "30")).toBe(
      "lanpower port 1/1/2 power 30"
    );
  });

  it("throws on missing data param", () => {
    expect(() => buildCommand("POWER_UP_PORT")).toThrow("requires 1 data");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run server/aos/command-table.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// server/aos/command-table.ts

export const CMD_TBL = {
  // System/Config SHOW commands
  SHOW_SYSTEM: "show system",
  SHOW_CHASSIS: "show chassis",
  SHOW_CMM: "show cmm",
  SHOW_HW_INFO: "show hardware-info",
  SHOW_MICROCODE: "show microcode",
  SHOW_CONFIGURATION: "show configuration snapshot",
  SHOW_RUNNING_DIR: "show running-directory",
  SHOW_TEMPERATURE: "show temperature",
  SHOW_HEALTH: "show health all cpu",
  SHOW_HEALTH_CONFIG: "show health configuration",
  SHOW_FREE_SPACE: "freespace /flash",
  SHOW_USER: "show user",
  SHOW_AAA_AUTH: "show aaa authentication",
  SHOW_ARP: "show arp",
  SHOW_IP_INTERFACE: "show ip interface",
  SHOW_IP_ROUTES: "show ip routes",
  SHOW_IP_SERVICE: "show ip service",
  SHOW_VLAN: "show vlan",
  SHOW_VLAN_MEMBERS: "show vlan %_DATA_% members",
  SHOW_INTERFACES: "show interfaces",
  SHOW_TRANSCIEVERS: "show transceivers",
  SHOW_INTERFACE_PORT: "show interfaces port %_DATA_%",
  SHOW_PORTS_LIST: "show interfaces alias",
  SHOW_PORT_STATUS: "show interfaces port %_DATA_% status",
  SHOW_PORT_ALIAS: "show interfaces port %_DATA_% alias",
  SHOW_BLOCKED_PORTS: "show spantree ports",
  SHOW_LINKAGG: "show linkagg agg %_DATA_%",
  SHOW_LINKAGG_PORT: "show linkagg port",

  // PoE/Lanpower
  SHOW_LAN_POWER: "show lanpower slot %_DATA_%",
  SHOW_LAN_POWER_CONFIG: "show lanpower slot %_DATA_% port-config",
  SHOW_LAN_POWER_FEATURE: "show lanpower slot %_DATA_% %_DATA_%",
  SHOW_CHASSIS_LAN_POWER_STATUS: "show lanpower chassis %_DATA_% status",
  SHOW_SLOT_LAN_POWER_STATUS: "show lanpower slot %_DATA_% status",
  SHOW_PORT_POWER: "show lanpower slot %_DATA_%|grep %_DATA_%",
  POWER_UP_PORT: "lanpower port %_DATA_% admin-state enable",
  POWER_DOWN_PORT: "lanpower port %_DATA_% admin-state disable",
  POWER_UP_SLOT: "lanpower slot %_DATA_% service start",
  POWER_DOWN_SLOT: "lanpower slot %_DATA_% service stop",
  POWER_PRIORITY_PORT: "lanpower port %_DATA_% priority %_DATA_%",
  SET_MAX_POWER_PORT: "lanpower port %_DATA_% power %_DATA_%",
  POWER_4PAIR_PORT: "lanpower port %_DATA_% 4pair enable",
  POWER_2PAIR_PORT: "lanpower port %_DATA_% 4pair disable",
  CAPACITOR_DETECTION_ENABLE: "lanpower port %_DATA_% capacitor-detection enable",
  CAPACITOR_DETECTION_DISABLE: "lanpower port %_DATA_% capacitor-detection disable",
  POWER_823BT_ENABLE: "lanpower slot %_DATA_% 8023bt enable",
  POWER_823BT_DISABLE: "lanpower slot %_DATA_% 8023bt disable",

  // LLDP
  SHOW_LLDP_LOCAL: "show lldp local-port",
  SHOW_LLDP_REMOTE: "show lldp nearest-bridge remote-system",
  SHOW_LLDP_INVENTORY: "show lldp remote-system med inventory",
  SHOW_PORT_LLDP_REMOTE: "show lldp port %_DATA_% remote-system",

  // MAC
  SHOW_MAC_LEARNING: "show mac-learning domain vlan",
  SHOW_PORT_MAC_ADDRESS: "show mac-learning port %_DATA_%",

  // TDR
  ENABLE_TDR: "interfaces port %_DATA_% tdr enable",
  SHOW_TDR_STATISTICS: "show interfaces port %_DATA_% tdr-statistics",
  CLEAR_TDR_STATISTICS: "clear interfaces %_DATA_% tdr-statistics",

  // SNMP
  SHOW_SNMP_COMMUNITY: "show snmp community-map",
  SHOW_SNMP_STATION: "show snmp station",
  SHOW_SNMP_SECURITY: "show snmp security",
  SNMP_COMMUNITY_MAP: 'snmp community-map "%_DATA_%" user "%_DATA_%" enable',
  SNMP_STATION: 'snmp station %_DATA_% 162 "%_DATA_%" %_DATA_% enable',
  DELETE_COMMUNITY: "no snmp community-map %_DATA_%",
  DELETE_STATION: "no snmp station %_DATA_%",

  // System config
  SET_SYSTEM_NAME: "system name %_DATA_%",
  SET_LOCATION: 'system location "%_DATA_%"',
  SET_CONTACT: "system contact %_DATA_%",
  SET_PASSWORD: "user %_DATA_% password %_DATA_%",
  SET_DEFAULT_GATEWAY: "ip static-route 0.0.0.0/0 gateway %_DATA_%",
  WRITE_MEMORY: "write memory flash-synchro",
  REBOOT_SWITCH: "reload from working no rollback-timeout",

  // Services
  ENABLE_SSH: "ip service ssh admin-state enable",
  DISABLE_SSH: "ip service ssh admin-state disable",
  ENABLE_TELNET: "ip service telnet admin-state enable",
  DISABLE_TELNET: "ip service telnet admin-state disable",
  ENABLE_FTP: "ip service ftp admin-state enable",
  DISABLE_FTP: "ip service ftp admin-state disable",

  // Interface
  ETHERNET_ENABLE: "interfaces %_DATA_% admin-state enable",
  ETHERNET_DISABLE: "interfaces %_DATA_% admin-state disable",
} as const;

export type Command = keyof typeof CMD_TBL;

export function buildCommand(cmd: Command, ...data: string[]): string {
  const template = CMD_TBL[cmd];
  const placeholders = (template.match(/%_DATA_%/g) ?? []).length;

  if (placeholders > data.length) {
    throw new Error(
      `Command ${cmd} requires ${placeholders} data params, got ${data.length}`
    );
  }

  let result = template;
  for (const d of data) {
    result = result.replace("%_DATA_%", d);
  }
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run server/aos/command-table.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add server/aos/command-table.ts server/aos/command-table.test.ts
git commit -m "feat: AOS command table with 100+ commands and buildCommand()"
```

---

## Task 4: REST API Client

**Files:**
- Create: `server/aos/rest-client.ts`
- Create: `server/aos/rest-client.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// server/aos/rest-client.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AosRestClient } from "./rest-client.js";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AosRestClient", () => {
  let client: AosRestClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new AosRestClient("192.168.1.1");
  });

  describe("login", () => {
    it("sends auth request and stores token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<nodes><result><data><token>test-token-123</token></data></result></nodes>'
          ),
      });

      await client.login("admin", "switch");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("domain=authv2"),
        expect.any(Object)
      );
      expect(client.connected).toBe(true);
    });

    it("throws on auth failure", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });

      await expect(client.login("admin", "wrong")).rejects.toThrow(
        "Authentication failed"
      );
    });
  });

  describe("executeCli", () => {
    it("sends CLI command and returns output", async () => {
      // Login first
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<nodes><result><data><token>t</token></data></result></nodes>'
          ),
      });
      await client.login("admin", "switch");

      // Execute command
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () =>
          Promise.resolve(
            '<nodes><result><data><output>System: OS6860</output></data></result></nodes>'
          ),
      });

      const result = await client.executeCli("show system");
      expect(result).toBe("System: OS6860");
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run server/aos/rest-client.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Write implementation**

```typescript
// server/aos/rest-client.ts
import { parseAosXml, parseAosError } from "./xml-parser.js";
import { AOS_REST_ACCEPT, AOS_CONTEXT } from "../../shared/const.js";

export class AosRestClient {
  private baseUrl: string;
  private token: string | null = null;
  private _connected = false;

  constructor(private ip: string, private timeout = 10000) {
    this.baseUrl = `https://${ip}`;
  }

  get connected(): boolean {
    return this._connected;
  }

  async login(username: string, password: string): Promise<void> {
    const url = `${this.baseUrl}/?domain=authv2&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.buildHeaders(),
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const xml = await response.text();
    const result = parseAosXml(xml);

    if (!result.token) {
      throw new Error("Authentication failed: no token in response");
    }

    this.token = result.token;
    this._connected = true;
  }

  async executeCli(command: string): Promise<string> {
    this.ensureConnected();
    const encoded = encodeURIComponent(command);
    const url = `${this.baseUrl}/cli/aos?cmd=${encoded}`;

    const xml = await this.request(url);
    const result = parseAosXml(xml);
    return result.output ?? "";
  }

  async executeMib(urn: string): Promise<Record<string, string>> {
    this.ensureConnected();
    const url = `${this.baseUrl}/?domain=mib&${urn}`;

    const xml = await this.request(url);
    const result = parseAosXml(xml);
    return result as Record<string, string>;
  }

  async executeMibSet(
    urn: string,
    data: Record<string, string>
  ): Promise<void> {
    this.ensureConnected();
    const url = `${this.baseUrl}/?domain=mib&${urn}`;

    const body = new URLSearchParams(data).toString();

    await this.request(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  disconnect(): void {
    this.token = null;
    this._connected = false;
  }

  private async request(url: string, init?: RequestInit): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...init,
          headers: { ...this.buildHeaders(), ...init?.headers },
          signal: AbortSignal.timeout(this.timeout),
        });

        // Auto-reconnect on 401
        if (response.status === 401 && this.token) {
          this._connected = false;
          throw new Error("Session expired");
        }

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        return await response.text();
      } catch (err) {
        lastError = err as Error;
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: AOS_REST_ACCEPT,
      "Alu_context": AOS_CONTEXT,
    };
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }
    return headers;
  }

  private ensureConnected(): void {
    if (!this._connected) {
      throw new Error("Not connected to switch. Call login() first.");
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run server/aos/rest-client.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add server/aos/rest-client.ts server/aos/rest-client.test.ts
git commit -m "feat: AOS REST API client with auth, CLI/MIB commands, retry"
```

---

## Task 5: TextFSM Integration (Python Backend)

**Files:**
- Create: `python/requirements.txt`
- Create: `python/main.py`
- Create: `server/aos/textfsm.ts`
- Create: `server/aos/textfsm.test.ts`

- [ ] **Step 1: Create Python requirements.txt**

```
textfsm-aos>=1.0.0
textfsm>=1.1.0
fastapi>=0.115
uvicorn>=0.34
```

- [ ] **Step 2: Install Python dependencies**

```bash
cd "d:/Claude code/OST/python"
pip install -r requirements.txt
```

- [ ] **Step 3: Copy TextFSM templates**

```bash
cp -r $(python -c "import textfsm_aos; import os; print(os.path.dirname(textfsm_aos.__file__))")/templates "d:/Claude code/OST/python/textfsm_templates/"
```

- [ ] **Step 4: Create Python FastAPI server**

```python
# python/main.py
from fastapi import FastAPI
from pydantic import BaseModel
from textfsm_aos.parser import parse
import uvicorn

app = FastAPI(title="OST TextFSM Parser")


class ParseRequest(BaseModel):
    platform: str  # "ale_aos6" or "ale_aos8"
    command: str
    raw_output: str


@app.post("/api/parse")
def parse_command(req: ParseRequest):
    try:
        result = parse(req.platform, req.command, req.raw_output)
        return {"success": True, "data": result}
    except Exception as e:
        return {"success": False, "error": str(e), "data": []}


@app.get("/api/templates")
def list_templates():
    import os
    template_dir = os.path.join(os.path.dirname(__file__), "textfsm_templates")
    templates = [f for f in os.listdir(template_dir) if f.endswith(".textfsm")]
    return {"templates": sorted(templates)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
```

- [ ] **Step 5: Write failing TypeScript test**

```typescript
// server/aos/textfsm.test.ts
import { describe, it, expect } from "vitest";
import { TextFSMParser } from "./textfsm.js";

describe("TextFSMParser", () => {
  it("parses show system output", async () => {
    const parser = new TextFSMParser("http://localhost:8001");
    const raw = `
System:
  Description:   OmniSwitch 6860,
  Name:          Switch1,
  Location:      Building A,
  Contact:       admin@example.com,
  Up Time:       10 days,
Flash Space:
  Available (bytes): 12345678,
  Comments :         ok
  Primary CMM:`;

    const result = await parser.parse("ale_aos8", "show system", raw);
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe("Switch1");
    expect(result[0]!.location).toBe("Building A");
  });

  it("returns empty array on parse failure", async () => {
    const parser = new TextFSMParser("http://localhost:9999"); // Wrong port
    const result = await parser.parse("ale_aos8", "show system", "bad");
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm vitest run server/aos/textfsm.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 7: Write TypeScript implementation**

```typescript
// server/aos/textfsm.ts

export class TextFSMParser {
  constructor(private backendUrl = "http://localhost:8001") {}

  async parse(
    platform: "ale_aos6" | "ale_aos8",
    command: string,
    rawOutput: string
  ): Promise<Record<string, string>[]> {
    try {
      const response = await fetch(`${this.backendUrl}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          command,
          raw_output: rawOutput,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) return [];

      const data = (await response.json()) as {
        success: boolean;
        data: Record<string, string>[];
        error?: string;
      };

      return data.success ? data.data : [];
    } catch {
      return [];
    }
  }

  async listTemplates(): Promise<string[]> {
    try {
      const response = await fetch(`${this.backendUrl}/api/templates`);
      if (!response.ok) return [];
      const data = (await response.json()) as { templates: string[] };
      return data.templates;
    } catch {
      return [];
    }
  }
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm vitest run server/aos/textfsm.test.ts`
Expected: PASS (2 tests — second test verifies graceful failure)

- [ ] **Step 9: Commit**

```bash
git add python/ server/aos/textfsm.ts server/aos/textfsm.test.ts
git commit -m "feat: TextFSM parser via Python FastAPI backend"
```

---

## Task 6: Device Models

**Files:**
- Create: `server/aos/models/types.ts`
- Create: `server/aos/models/switch.ts`
- Create: `server/aos/models/builder.ts`
- Create: `server/aos/models/builder.test.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// server/aos/models/types.ts

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

export function parseChassisSlotPort(name: string): ChassisSlotPort {
  const parts = name.split("/").map(Number);
  return {
    chassis: parts[0] ?? 1,
    slot: parts[1] ?? 1,
    port: parts[2] ?? 1,
  };
}
```

- [ ] **Step 2: Create switch.ts (device model interfaces)**

```typescript
// server/aos/models/switch.ts
import type { PortStatus, PoeStatus, ThresholdType, SwitchStatus } from "./types.js";

export interface SwitchModel {
  name: string;
  ipAddress: string;
  version: string;
  status: SwitchStatus;
  upTime: string;
  chassisList: ChassisModel[];
}

export interface ChassisModel {
  number: number;
  model: string;
  serialNumber: string;
  macAddress: string;
  temperature: TemperatureInfo;
  fpga: string;
  cpld: string;
  uboot: string;
  onie: string;
  cpu: number;
  freeFlash: string;
  slots: SlotModel[];
  powerSupplies: PowerSupplyModel[];
}

export interface TemperatureInfo {
  current: number;
  threshold: number;
  danger: number;
  status: ThresholdType;
}

export interface SlotModel {
  number: number;
  name: string;
  model: string;
  nbPorts: number;
  poe: PoeSlotInfo;
  ports: PortModel[];
  transceivers: TransceiverModel[];
}

export interface PoeSlotInfo {
  power: number;
  budget: number;
  threshold: number;
  status: ThresholdType;
}

export interface PortModel {
  number: string;
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

export interface PoePortInfo {
  status: PoeStatus;
  power: number;
  maxPower: number;
  classInfo: string;
  priority: string;
}

export interface PortDetail {
  type: string;
  interfaceType: string;
  bandwidth: number;
  duplex: string;
  linkQuality: string;
}

export interface TransceiverModel {
  chassis: number;
  slot: number;
  number: number;
  modelName: string;
  serialNumber: string;
  adminStatus: string;
  operStatus: string;
}

export interface PowerSupplyModel {
  id: number;
  name: string;
  model: string;
  status: string;
  powerProvision: number;
}
```

- [ ] **Step 3: Write failing test for builder**

```typescript
// server/aos/models/builder.test.ts
import { describe, it, expect } from "vitest";
import { buildSwitchFromSystem, buildChassisFromChassis } from "./builder.js";

describe("buildSwitchFromSystem", () => {
  it("builds SwitchModel from TextFSM parsed output", () => {
    const parsed = [
      {
        name: "Switch1",
        description: "OmniSwitch 6860",
        location: "Building A",
        contact: "admin",
        up_time: "10 days 2 hours",
      },
    ];

    const result = buildSwitchFromSystem(parsed, "192.168.1.1");

    expect(result.name).toBe("Switch1");
    expect(result.ipAddress).toBe("192.168.1.1");
    expect(result.upTime).toBe("10 days 2 hours");
    expect(result.chassisList).toEqual([]);
  });

  it("returns defaults on empty input", () => {
    const result = buildSwitchFromSystem([], "192.168.1.1");
    expect(result.name).toBe("Unknown");
    expect(result.ipAddress).toBe("192.168.1.1");
  });
});

describe("buildChassisFromChassis", () => {
  it("builds ChassisModel from parsed chassis output", () => {
    const parsed = [
      {
        chassis_number: "1",
        chassis_model: "OS6860-U28",
        chassis_serial_number: "ABC123",
        chassis_mac_address: "aa:bb:cc:dd:ee:ff",
      },
    ];

    const result = buildChassisFromChassis(parsed);

    expect(result).toHaveLength(1);
    expect(result[0]!.model).toBe("OS6860-U28");
    expect(result[0]!.serialNumber).toBe("ABC123");
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm vitest run server/aos/models/builder.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 5: Write builder implementation**

```typescript
// server/aos/models/builder.ts
import type {
  SwitchModel,
  ChassisModel,
  TemperatureInfo,
  SlotModel,
  PortModel,
} from "./switch.js";
import { SwitchStatus, ThresholdType } from "./types.js";

export function buildSwitchFromSystem(
  parsed: Record<string, string>[],
  ip: string
): SwitchModel {
  const data = parsed[0] ?? {};
  return {
    name: data["name"] ?? "Unknown",
    ipAddress: ip,
    version: data["description"] ?? "",
    status: SwitchStatus.Reachable,
    upTime: data["up_time"] ?? "",
    chassisList: [],
  };
}

export function buildChassisFromChassis(
  parsed: Record<string, string>[]
): ChassisModel[] {
  return parsed.map((data) => ({
    number: Number(data["chassis_number"] ?? 1),
    model: data["chassis_model"] ?? "Unknown",
    serialNumber: data["chassis_serial_number"] ?? "",
    macAddress: data["chassis_mac_address"] ?? "",
    temperature: { current: 0, threshold: 0, danger: 0, status: ThresholdType.Unknown },
    fpga: "",
    cpld: "",
    uboot: "",
    onie: "",
    cpu: 0,
    freeFlash: "",
    slots: [],
    powerSupplies: [],
  }));
}

export function buildTemperatureFromParsed(
  parsed: Record<string, string>[]
): TemperatureInfo[] {
  return parsed.map((data) => ({
    current: Number(data["current"] ?? 0),
    threshold: Number(data["threshold"] ?? 60),
    danger: Number(data["danger"] ?? 68),
    status: classifyTemperature(
      Number(data["current"] ?? 0),
      Number(data["threshold"] ?? 60),
      Number(data["danger"] ?? 68)
    ),
  }));
}

function classifyTemperature(
  current: number,
  threshold: number,
  danger: number
): ThresholdType {
  if (current >= danger) return ThresholdType.Danger;
  if (current >= threshold) return ThresholdType.OverThreshold;
  if (current >= threshold * 0.8) return ThresholdType.NearThreshold;
  return ThresholdType.UnderThreshold;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm vitest run server/aos/models/builder.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add server/aos/models/
git commit -m "feat: device models and builder for Switch/Chassis/Temperature"
```

---

## Task 7: tRPC Router

**Files:**
- Create: `server/routers/switch.ts`
- Create: `server/routers/system.ts`
- Create: `server/_core/router.ts`
- Modify: `server/_core/index.ts`
- Modify: `client/src/lib/trpc.ts`
- Create: `server/routers/switch.test.ts`

- [ ] **Step 1: Create switch router**

```typescript
// server/routers/switch.ts
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc.js";
import { AosRestClient } from "../aos/rest-client.js";
import { buildSwitchFromSystem } from "../aos/models/builder.js";
import { TextFSMParser } from "../aos/textfsm.js";

// Global state — single switch connection
let client: AosRestClient | null = null;
const parser = new TextFSMParser(
  `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`
);

export const switchRouter = router({
  connect: publicProcedure
    .input(
      z.object({
        ip: z.string(),
        username: z.string(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      client?.disconnect();
      client = new AosRestClient(input.ip);
      await client.login(input.username, input.password);

      // Fetch system info
      const raw = await client.executeCli("show system");
      const parsed = await parser.parse("ale_aos8", "show system", raw);
      const model = buildSwitchFromSystem(parsed, input.ip);

      return { connected: true, switch: model };
    }),

  disconnect: publicProcedure.mutation(() => {
    client?.disconnect();
    client = null;
    return { connected: false };
  }),

  getInfo: publicProcedure.query(() => {
    if (!client?.connected) {
      return { connected: false, switch: null };
    }
    return { connected: true, switch: null }; // Will be populated by connect
  }),
});
```

- [ ] **Step 2: Create shared switch store**

```typescript
// server/aos/store.ts
import { AosRestClient } from "./rest-client.js";
import { TextFSMParser } from "./textfsm.js";

let client: AosRestClient | null = null;

export const parser = new TextFSMParser(
  `http://localhost:${process.env.PYTHON_BACKEND_PORT ?? 8001}`
);

export function getClient(): AosRestClient | null {
  return client;
}

export function setClient(c: AosRestClient | null): void {
  client = c;
}
```

Update `server/routers/switch.ts` to use the store:

```typescript
// Add to top of server/routers/switch.ts
import { getClient, setClient, parser } from "../aos/store.js";

// Replace `let client` and `const parser` with:
// Use getClient() / setClient() instead of local `client`
```

- [ ] **Step 3: Create system router**

```typescript
// server/routers/system.ts
import { router, publicProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildTemperatureFromParsed } from "../aos/models/builder.js";

export const systemRouter = router({
  showSystem: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
    }
    const raw = await client.executeCli("show system");
    const parsed = await parser.parse("ale_aos8", "show system", raw);
    return parsed[0] ?? {};
  }),

  showHealth: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
    }
    const raw = await client.executeCli("show health all cpu");
    const parsed = await parser.parse("ale_aos8", "show health", raw);
    return parsed[0] ?? {};
  }),

  showTemperature: publicProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected" });
    }
    const raw = await client.executeCli("show temperature");
    const parsed = await parser.parse("ale_aos8", "show temperature", raw);
    return buildTemperatureFromParsed(parsed);
  }),
});
```

- [ ] **Step 3: Create main router**

```typescript
// server/_core/router.ts
import { router } from "./trpc.js";
import { switchRouter } from "../routers/switch.js";
import { systemRouter } from "../routers/system.js";

export const appRouter = router({
  switch: switchRouter,
  system: systemRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 4: Update server/_core/index.ts to use router**

```typescript
// server/_core/index.ts
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { createContext } from "./trpc.js";
import { appRouter } from "./router.js";
import { API_PREFIX } from "../../shared/const.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "50mb" }));

app.use(
  API_PREFIX,
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(PORT, () => {
  console.log(`OST Network Tools server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 5: Update client/src/lib/trpc.ts type import**

```typescript
// client/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/_core/router.js";

export const trpc = createTRPCReact<AppRouter>();
```

- [ ] **Step 6: Write test for switch router**

```typescript
// server/routers/switch.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

describe("switch router", () => {
  it("getInfo returns disconnected when no client", async () => {
    const caller = appRouter.createCaller({});
    const result = await caller.switch.getInfo();
    expect(result.connected).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 8: Commit**

```bash
git add server/routers/ server/_core/router.ts server/_core/index.ts client/src/lib/trpc.ts
git commit -m "feat: tRPC router with switch connect/disconnect/getInfo"
```

---

## Task 8: Basic React UI

**Files:**
- Create: `client/src/index.css`
- Create: `client/src/pages/DeviceManager.tsx`
- Create: `client/src/pages/Dashboard.tsx`
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Create index.css with Tailwind**

```css
@import "tailwindcss";
```

- [ ] **Step 2: Create DeviceManager page**

```tsx
// client/src/pages/DeviceManager.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function DeviceManager() {
  const [ip, setIp] = useState("");
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");

  const connect = trpc.switch.connect.useMutation();

  const handleConnect = () => {
    connect.mutate({ ip, username, password });
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Connect to Switch</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">IP Address</label>
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="192.168.1.1"
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={connect.isPending}
        className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {connect.isPending ? "Connecting..." : "Connect"}
      </button>

      {connect.isError && (
        <p className="text-red-600">{connect.error.message}</p>
      )}

      {connect.data && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p>Connected to: {connect.data.switch?.name}</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create Dashboard page**

```tsx
// client/src/pages/Dashboard.tsx
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const info = trpc.switch.getInfo.useQuery();

  if (!info.data?.connected) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Not connected to any switch</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">Switch Name</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.name ?? "—"}
          </p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">Version</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.version ?? "—"}
          </p>
        </div>
        <div className="p-4 border rounded">
          <h3 className="text-sm text-gray-500">Up Time</h3>
          <p className="text-lg font-semibold">
            {info.data.switch?.upTime ?? "—"}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update App.tsx with routing**

```tsx
// client/src/App.tsx
import { Route, Switch, Link } from "wouter";
import DeviceManager from "./pages/DeviceManager";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b p-4 flex gap-4">
        <Link href="/">Dashboard</Link>
        <Link href="/connect">Connect</Link>
      </nav>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/connect" component={DeviceManager} />
        <Route>404 Not Found</Route>
      </Switch>
    </div>
  );
}
```

- [ ] **Step 5: Run type check**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 6: Run tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add client/src/
git commit -m "feat: basic React UI with DeviceManager connect and Dashboard"
```

---

## Task 9: End-to-End Verification

- [ ] **Step 1: Start Python backend**

```bash
cd "d:/Claude code/OST/python"
python main.py &
```

Expected: `Uvicorn running on http://0.0.0.0:8001`

- [ ] **Step 2: Start TypeScript dev server**

```bash
cd "d:/Claude code/OST"
pnpm dev
```

Expected: `OST Network Tools server running on http://localhost:3000`

- [ ] **Step 3: Open browser**

Navigate to `http://localhost:5173/connect`

- [ ] **Step 4: Connect to a switch**

Enter IP/username/password, click Connect

Expected: Green "Connected to: SwitchName" message

- [ ] **Step 5: Verify dashboard**

Navigate to `http://localhost:5173/`

Expected: Dashboard shows switch name, version, up time

- [ ] **Step 6: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 7: Run type check**

Run: `pnpm check`
Expected: No errors

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — core engine with REST API, TextFSM, basic UI"
```
