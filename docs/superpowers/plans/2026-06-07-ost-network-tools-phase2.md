# OST Network Tools Phase 2: Feature Modules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add PoE diagnostics, TDR cable testing, VLAN management, and SNMP management features to OST Network Tools.

**Architecture:** Each feature module follows the same pattern: tRPC router → REST API commands → TextFSM parsing → React page. Phase 1 core engine is already complete.

**Tech Stack:** TypeScript 5.x, React 19, Express 4, tRPC 11, shadcn/ui, Tailwind CSS 4, Vitest, Python 3 (textfsm-aos, FastAPI)

---

## Task 1: PoE Module

**Files:**
- Create: `server/routers/poe.ts`
- Create: `client/src/pages/PoeDiagnostics.tsx`
- Modify: `server/_core/router.ts`

- [ ] **Step 1: Create PoE tRPC router**

```typescript
// server/routers/poe.ts
import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildCommand } from "../aos/command-table.js";

export const poeRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ slot: z.number() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SHOW_LAN_POWER", String(input.slot));
        const raw = await client.executeCli(cmd);
        return await parser.parse("ale_aos8", "show lanpower slot", raw);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  enablePort: protectedProcedure
    .input(z.object({ port: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("POWER_UP_PORT", input.port);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  disablePort: protectedProcedure
    .input(z.object({ port: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("POWER_DOWN_PORT", input.port);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  setPriority: protectedProcedure
    .input(z.object({ port: z.string(), priority: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("POWER_PRIORITY_PORT", input.port, input.priority);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  setMaxPower: protectedProcedure
    .input(z.object({ port: z.string(), power: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SET_MAX_POWER_PORT", input.port, input.power);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 2: Register PoE router**

Add to `server/_core/router.ts`:
```typescript
import { poeRouter } from "../routers/poe.js";
// Add to appRouter: poe: poeRouter,
```

- [ ] **Step 3: Create PoE Diagnostics page**

```tsx
// client/src/pages/PoeDiagnostics.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function PoeDiagnostics() {
  const [slot, setSlot] = useState(1);
  const status = trpc.poe.getStatus.useQuery({ slot });
  const enablePort = trpc.poe.enablePort.useMutation();
  const disablePort = trpc.poe.disablePort.useMutation();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">PoE Diagnostics</h1>
      <div className="flex gap-2 items-center">
        <label>Slot:</label>
        <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} className="border rounded p-1">
          <option value={1}>1</option>
          <option value={2}>2</option>
        </select>
        <button onClick={() => status.refetch()} className="px-3 py-1 bg-blue-600 text-white rounded">Refresh</button>
      </div>
      {status.isLoading && <p>Loading...</p>}
      {status.data && (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Port</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Power (W)</th>
              <th className="border p-2">Class</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {status.data.map((row: Record<string, string>, i: number) => (
              <tr key={i}>
                <td className="border p-2">{row["port"] ?? row["PORT"] ?? `Port ${i + 1}`}</td>
                <td className="border p-2">{row["status"] ?? row["STATUS"] ?? "—"}</td>
                <td className="border p-2">{row["power"] ?? row["POWER"] ?? "—"}</td>
                <td className="border p-2">{row["class"] ?? row["CLASS"] ?? "—"}</td>
                <td className="border p-2 flex gap-1">
                  <button onClick={() => enablePort.mutate({ port: row["port"] ?? `${slot}/1/${i + 1}` })} className="px-2 py-1 bg-green-600 text-white rounded text-sm">ON</button>
                  <button onClick={() => disablePort.mutate({ port: row["port"] ?? `${slot}/1/${i + 1}` })} className="px-2 py-1 bg-red-600 text-white rounded text-sm">OFF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Add route to App.tsx**

```tsx
<Route path="/poe" component={PoeDiagnostics} />
```

- [ ] **Step 5: Run tests and type check**

Run: `pnpm check && pnpm test`

- [ ] **Step 6: Commit**

---

## Task 2: TDR Module

**Files:**
- Create: `server/routers/tdr.ts`
- Create: `client/src/pages/TdrView.tsx`
- Modify: `server/_core/router.ts`

- [ ] **Step 1: Create TDR tRPC router**

```typescript
// server/routers/tdr.ts
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildCommand } from "../aos/command-table.js";

export const tdrRouter = router({
  runTest: protectedProcedure
    .input(z.object({ port: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("ENABLE_TDR", input.port);
        await client.executeCli(cmd);
        // Wait for TDR to complete (~10s)
        await new Promise((r) => setTimeout(r, 10000));
        const resultCmd = buildCommand("SHOW_TDR_STATISTICS", input.port);
        const raw = await client.executeCli(resultCmd);
        const parsed = await parser.parse("ale_aos8", "show interfaces", raw);
        return { port: input.port, results: parsed };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  getResults: protectedProcedure
    .input(z.object({ port: z.string() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SHOW_TDR_STATISTICS", input.port);
        const raw = await client.executeCli(cmd);
        const parsed = await parser.parse("ale_aos8", "show interfaces", raw);
        return { port: input.port, results: parsed };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  clearStats: protectedProcedure
    .input(z.object({ port: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("CLEAR_TDR_STATISTICS", input.port);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 2: Register TDR router + create page**

Create `client/src/pages/TdrView.tsx`:
```tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function TdrView() {
  const [port, setPort] = useState("1/1/1");
  const runTest = trpc.tdr.runTest.useMutation();
  const clearStats = trpc.tdr.clearStats.useMutation();

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">TDR Cable Test</h1>
      <div className="flex gap-2 items-center">
        <label>Port:</label>
        <input value={port} onChange={(e) => setPort(e.target.value)} className="border rounded p-1" placeholder="1/1/1" />
        <button onClick={() => runTest.mutate({ port })} disabled={runTest.isPending} className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50">
          {runTest.isPending ? "Testing..." : "Run TDR Test"}
        </button>
        <button onClick={() => clearStats.mutate({ port })} className="px-3 py-1 bg-gray-600 text-white rounded">Clear</button>
      </div>
      {runTest.data && (
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Results for {runTest.data.port}</h3>
          <pre className="mt-2 bg-gray-50 p-2 text-sm">{JSON.stringify(runTest.data.results, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tests and type check**
- [ ] **Step 4: Commit**

---

## Task 3: VLAN Module

**Files:**
- Create: `server/routers/vlan.ts`
- Create: `client/src/pages/VlanManager.tsx`
- Modify: `server/_core/router.ts`

- [ ] **Step 1: Create VLAN tRPC router**

```typescript
// server/routers/vlan.ts
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildCommand } from "../aos/command-table.js";

export const vlanRouter = router({
  list: protectedProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show vlan");
      return await parser.parse("ale_aos8", "show vlan", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  getMembers: protectedProcedure
    .input(z.object({ vlanId: z.number() }))
    .query(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SHOW_VLAN_MEMBERS", String(input.vlanId));
        const raw = await client.executeCli(cmd);
        return await parser.parse("ale_aos8", "show vlan members", raw);
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  create: protectedProcedure
    .input(z.object({ vlanId: z.number(), name: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        await client.executeCli(`vlan ${input.vlanId} name "${input.name}" admin-state enable`);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ vlanId: z.number() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        await client.executeCli(`no vlan ${input.vlanId}`);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  addMember: protectedProcedure
    .input(z.object({ vlanId: z.number(), port: z.string(), mode: z.enum(["tagged", "untagged"]) }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        await client.executeCli(`vlan ${input.vlanId} members port ${input.port} ${input.mode}`);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 2: Create VLAN Manager page**

```tsx
// client/src/pages/VlanManager.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function VlanManager() {
  const vlans = trpc.vlan.list.useQuery();
  const create = trpc.vlan.create.useMutation({ onSuccess: () => vlans.refetch() });
  const deleteVlan = trpc.vlan.delete.useMutation({ onSuccess: () => vlans.refetch() });
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">VLAN Manager</h1>
      <div className="flex gap-2">
        <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="VLAN ID" className="border rounded p-1 w-24" />
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="border rounded p-1" />
        <button onClick={() => { create.mutate({ vlanId: Number(newId), name: newName }); setNewId(""); setNewName(""); }} className="px-3 py-1 bg-green-600 text-white rounded">Create</button>
      </div>
      {vlans.isLoading && <p>Loading...</p>}
      {vlans.data && (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">VLAN ID</th>
              <th className="border p-2">Name</th>
              <th className="border p-2">Admin</th>
              <th className="border p-2">Oper</th>
              <th className="border p-2">MTU</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vlans.data.map((v: Record<string, string>, i: number) => (
              <tr key={i}>
                <td className="border p-2">{v["vlannumber"] ?? v["vlan_id"] ?? "—"}</td>
                <td className="border p-2">{v["vlandescription"] ?? v["name"] ?? "—"}</td>
                <td className="border p-2">{v["vlanadmstatus"] ?? v["admin"] ?? "—"}</td>
                <td className="border p-2">{v["vlanoperstatus"] ?? v["operational_state"] ?? "—"}</td>
                <td className="border p-2">{v["vlanmtu"] ?? v["mtu"] ?? "—"}</td>
                <td className="border p-2">
                  <button onClick={() => deleteVlan.mutate({ vlanId: Number(v["vlannumber"] ?? v["vlan_id"]) })} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tests and type check**
- [ ] **Step 4: Commit**

---

## Task 4: SNMP Module

**Files:**
- Create: `server/routers/snmp.ts`
- Create: `client/src/pages/SnmpManager.tsx`
- Modify: `server/_core/router.ts`

- [ ] **Step 1: Create SNMP tRPC router**

```typescript
// server/routers/snmp.ts
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.js";
import { getClient, parser } from "../aos/store.js";
import { TRPCError } from "@trpc/server";
import { buildCommand } from "../aos/command-table.js";

export const snmpRouter = router({
  listCommunities: protectedProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show snmp community-map");
      return await parser.parse("ale_aos8", "show snmp community-map", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  listStations: protectedProcedure.query(async () => {
    const client = getClient();
    if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
    try {
      const raw = await client.executeCli("show snmp station");
      return await parser.parse("ale_aos8", "show snmp station", raw);
    } catch (err) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
    }
  }),

  addCommunity: protectedProcedure
    .input(z.object({ name: z.string(), user: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SNMP_COMMUNITY_MAP", input.name, input.user);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  deleteCommunity: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("DELETE_COMMUNITY", input.name);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  addStation: protectedProcedure
    .input(z.object({ ip: z.string(), version: z.string(), user: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("SNMP_STATION", input.ip, input.version, input.user);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),

  deleteStation: protectedProcedure
    .input(z.object({ ip: z.string() }))
    .mutation(async ({ input }) => {
      const client = getClient();
      if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED" });
      try {
        const cmd = buildCommand("DELETE_STATION", input.ip);
        await client.executeCli(cmd);
        return { success: true };
      } catch (err) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `${err}` });
      }
    }),
});
```

- [ ] **Step 2: Create SNMP Manager page**

```tsx
// client/src/pages/SnmpManager.tsx
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export default function SnmpManager() {
  const communities = trpc.snmp.listCommunities.useQuery();
  const stations = trpc.snmp.listStations.useQuery();
  const addCommunity = trpc.snmp.addCommunity.useMutation({ onSuccess: () => communities.refetch() });
  const deleteCommunity = trpc.snmp.deleteCommunity.useMutation({ onSuccess: () => communities.refetch() });
  const addStation = trpc.snmp.addStation.useMutation({ onSuccess: () => stations.refetch() });
  const deleteStation = trpc.snmp.deleteStation.useMutation({ onSuccess: () => stations.refetch() });

  const [commName, setCommName] = useState("");
  const [commUser, setCommUser] = useState("");
  const [staIp, setStaIp] = useState("");
  const [staVersion, setStaVersion] = useState("v2c");
  const [staUser, setStaUser] = useState("");

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">SNMP Manager</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Communities</h2>
        <div className="flex gap-2">
          <input value={commName} onChange={(e) => setCommName(e.target.value)} placeholder="Community name" className="border rounded p-1" />
          <input value={commUser} onChange={(e) => setCommUser(e.target.value)} placeholder="User" className="border rounded p-1" />
          <button onClick={() => { addCommunity.mutate({ name: commName, user: commUser }); setCommName(""); setCommUser(""); }} className="px-3 py-1 bg-green-600 text-white rounded">Add</button>
        </div>
        {communities.data && (
          <table className="w-full border-collapse border">
            <thead><tr className="bg-gray-100"><th className="border p-2">Name</th><th className="border p-2">User</th><th className="border p-2">Status</th><th className="border p-2">Actions</th></tr></thead>
            <tbody>
              {communities.data.map((c: Record<string, string>, i: number) => (
                <tr key={i}>
                  <td className="border p-2">{c["community_name"] ?? c["name"] ?? "—"}</td>
                  <td className="border p-2">{c["user_name"] ?? c["user"] ?? "—"}</td>
                  <td className="border p-2">{c["status"] ?? "—"}</td>
                  <td className="border p-2"><button onClick={() => deleteCommunity.mutate({ name: c["community_name"] ?? c["name"] ?? "" })} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Trap Stations</h2>
        <div className="flex gap-2">
          <input value={staIp} onChange={(e) => setStaIp(e.target.value)} placeholder="IP" className="border rounded p-1" />
          <select value={staVersion} onChange={(e) => setStaVersion(e.target.value)} className="border rounded p-1"><option value="v1">v1</option><option value="v2c">v2c</option><option value="v3">v3</option></select>
          <input value={staUser} onChange={(e) => setStaUser(e.target.value)} placeholder="User" className="border rounded p-1" />
          <button onClick={() => { addStation.mutate({ ip: staIp, version: staVersion, user: staUser }); setStaIp(""); setStaUser(""); }} className="px-3 py-1 bg-green-600 text-white rounded">Add</button>
        </div>
        {stations.data && (
          <table className="w-full border-collapse border">
            <thead><tr className="bg-gray-100"><th className="border p-2">IP</th><th className="border p-2">Port</th><th className="border p-2">Version</th><th className="border p-2">User</th><th className="border p-2">Actions</th></tr></thead>
            <tbody>
              {stations.data.map((s: Record<string, string>, i: number) => (
                <tr key={i}>
                  <td className="border p-2">{s["ip_address"] ?? s["ip"] ?? "—"}</td>
                  <td className="border p-2">{s["port"] ?? "162"}</td>
                  <td className="border p-2">{s["version"] ?? "—"}</td>
                  <td className="border p-2">{s["user_name"] ?? s["user"] ?? "—"}</td>
                  <td className="border p-2"><button onClick={() => deleteStation.mutate({ ip: s["ip_address"] ?? s["ip"] ?? "" })} className="px-2 py-1 bg-red-600 text-white rounded text-sm">Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Run tests and type check**
- [ ] **Step 4: Commit**

---

## Task 5: Navigation & Layout

**Files:**
- Modify: `client/src/App.tsx`
- Create: `client/src/components/layout/Navbar.tsx`

- [ ] **Step 1: Create Navbar component**

```tsx
// client/src/components/layout/Navbar.tsx
import { Link, useLocation } from "wouter";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/connect", label: "Connect" },
  { href: "/poe", label: "PoE" },
  { href: "/tdr", label: "TDR" },
  { href: "/vlan", label: "VLAN" },
  { href: "/snmp", label: "SNMP" },
];

export default function Navbar() {
  const [location] = useLocation();
  return (
    <nav className="border-b p-4 flex gap-4">
      {links.map((link) => (
        <Link key={link.href} href={link.href} className={location === link.href ? "font-bold" : ""}>{link.label}</Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Update App.tsx to use Navbar**

```tsx
import { Route, Switch } from "wouter";
import Navbar from "./components/layout/Navbar";
import Dashboard from "./pages/Dashboard";
import DeviceManager from "./pages/DeviceManager";
import PoeDiagnostics from "./pages/PoeDiagnostics";
import TdrView from "./pages/TdrView";
import VlanManager from "./pages/VlanManager";
import SnmpManager from "./pages/SnmpManager";

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/connect" component={DeviceManager} />
        <Route path="/poe" component={PoeDiagnostics} />
        <Route path="/tdr" component={TdrView} />
        <Route path="/vlan" component={VlanManager} />
        <Route path="/snmp" component={SnmpManager} />
        <Route>404 Not Found</Route>
      </Switch>
    </div>
  );
}
```

- [ ] **Step 3: Run tests and type check**
- [ ] **Step 4: Commit**

---

## Task 6: E2E Verification

- [ ] **Step 1: Run full test suite**
- [ ] **Step 2: Run type check**
- [ ] **Step 3: Run lint**
- [ ] **Step 4: Verify all pages render (dev server)**
- [ ] **Step 5: Final commit**
