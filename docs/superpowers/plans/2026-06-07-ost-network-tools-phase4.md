# OST Network Tools Phase 4: Polish & Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add dark/light theme, i18n, error handling improvements, and comprehensive testing to OST Network Tools.

**Architecture:** Phase 1-3 features are complete. Phase 4 focuses on polish, accessibility, and quality.

**Tech Stack:** TypeScript 5.x, React 19, Express 4, tRPC 11, shadcn/ui, Tailwind CSS 4, Vitest, react-i18next, zustand

---

## Task 1: Dark/Light Theme

**Files:**
- Create: `client/src/contexts/ThemeContext.tsx`
- Modify: `client/src/index.css`
- Modify: `client/src/App.tsx`
- Create: `client/src/components/layout/ThemeToggle.tsx`

- [ ] **Step 1: Create ThemeContext**

```tsx
// client/src/contexts/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as Theme) ?? "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
```

- [ ] **Step 2: Create ThemeToggle component**

```tsx
// client/src/components/layout/ThemeToggle.tsx
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="px-2 py-1 border rounded text-sm"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

- [ ] **Step 3: Update index.css with dark mode support**

```css
@import "tailwindcss";

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}
```

- [ ] **Step 4: Update App.tsx with ThemeProvider**

```tsx
import { ThemeProvider } from "@/contexts/ThemeContext";
// Wrap App with ThemeProvider
```

- [ ] **Step 5: Add ThemeToggle to Navbar**

```tsx
import ThemeToggle from "./ThemeToggle";
// Add <ThemeToggle /> to Navbar
```

- [ ] **Step 6: Run tests and type check**
- [ ] **Step 7: Commit**

---

## Task 2: i18n Setup

**Files:**
- Create: `client/src/i18n/index.ts`
- Create: `client/src/i18n/locales/en.json`
- Create: `client/src/i18n/locales/zh.json`
- Modify: `client/src/main.tsx`

- [ ] **Step 1: Create i18n configuration**

```typescript
// client/src/i18n/index.ts
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import zh from "./locales/zh.json";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, zh: { translation: zh } },
  lng: localStorage.getItem("language") ?? "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 2: Create English translations**

```json
// client/src/i18n/locales/en.json
{
  "app": { "title": "OST Network Tools" },
  "nav": {
    "dashboard": "Dashboard",
    "connect": "Connect",
    "poe": "PoE",
    "tdr": "TDR",
    "vlan": "VLAN",
    "snmp": "SNMP",
    "traffic": "Traffic",
    "log": "Log",
    "firmware": "Firmware",
    "search": "Search"
  },
  "connect": {
    "title": "Connect to Switch",
    "ip": "IP Address",
    "username": "Username",
    "password": "Password",
    "submit": "Connect",
    "connecting": "Connecting...",
    "success": "Connected to: {{name}}"
  },
  "dashboard": {
    "title": "Dashboard",
    "notConnected": "Not connected to any switch",
    "switchName": "Switch Name",
    "version": "Version",
    "upTime": "Up Time"
  }
}
```

- [ ] **Step 3: Create Chinese translations**

```json
// client/src/i18n/locales/zh.json
{
  "app": { "title": "OST 网络工具" },
  "nav": {
    "dashboard": "仪表盘",
    "connect": "连接",
    "poe": "PoE",
    "tdr": "TDR",
    "vlan": "VLAN",
    "snmp": "SNMP",
    "traffic": "流量",
    "log": "日志",
    "firmware": "固件",
    "search": "搜索"
  },
  "connect": {
    "title": "连接交换机",
    "ip": "IP 地址",
    "username": "用户名",
    "password": "密码",
    "submit": "连接",
    "connecting": "连接中...",
    "success": "已连接到: {{name}}"
  },
  "dashboard": {
    "title": "仪表盘",
    "notConnected": "未连接到任何交换机",
    "switchName": "交换机名称",
    "version": "版本",
    "upTime": "运行时间"
  }
}
```

- [ ] **Step 4: Update main.tsx to import i18n**

```tsx
import "./i18n";
```

- [ ] **Step 5: Update key pages to use translations**

Update DeviceManager.tsx and Dashboard.tsx to use `useTranslation()`.

- [ ] **Step 6: Run tests and type check**
- [ ] **Step 7: Commit**

---

## Task 3: Error Handling Improvements

**Files:**
- Modify: `server/routers/system.ts`
- Modify: `server/routers/poe.ts`
- Modify: `server/routers/tdr.ts`
- Modify: `server/routers/vlan.ts`
- Modify: `server/routers/snmp.ts`
- Modify: `server/routers/traffic.ts`
- Modify: `server/routers/search.ts`

- [ ] **Step 1: Add consistent error handling to all routers**

Ensure all routers have:
1. Connected state check at the start of each procedure
2. Try/catch around all client.executeCli() calls
3. Meaningful TRPCError messages with operation context

Pattern:
```typescript
someQuery: publicProcedure.query(async () => {
  const client = getClient();
  if (!client?.connected) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not connected to switch" });
  try {
    // ... operation
  } catch (err) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Failed to [operation]: ${err}` });
  }
}),
```

- [ ] **Step 2: Run tests**
- [ ] **Step 3: Commit**

---

## Task 4: Testing

**Files:**
- Create: `server/routers/poe.test.ts`
- Create: `server/routers/vlan.test.ts`
- Create: `server/routers/traffic.test.ts`

- [ ] **Step 1: Create PoE router tests**

```typescript
// server/routers/poe.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

describe("poe router", () => {
  it("getStatus throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.poe.getStatus({ slot: 1 })).rejects.toThrow("Not connected");
  });
});
```

- [ ] **Step 2: Create VLAN router tests**

```typescript
// server/routers/vlan.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

describe("vlan router", () => {
  it("list throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.vlan.list()).rejects.toThrow("Not connected");
  });
});
```

- [ ] **Step 3: Create Traffic router tests**

```typescript
// server/routers/traffic.test.ts
import { describe, it, expect } from "vitest";
import { appRouter } from "../_core/router.js";

describe("traffic router", () => {
  it("getAllInterfaces throws UNAUTHORIZED when not connected", async () => {
    const caller = appRouter.createCaller({});
    await expect(caller.traffic.getAllInterfaces()).rejects.toThrow("Not connected");
  });
});
```

- [ ] **Step 4: Run tests**
- [ ] **Step 5: Commit**

---

## Task 5: Documentation & Packaging

**Files:**
- Create: `README.md`
- Create: `Makefile` or `start.sh`

- [ ] **Step 1: Create README.md**

```markdown
# OST Network Tools

Local web-based tool for ALE OmniSwitch device management.

## Quick Start

### Prerequisites
- Node.js >= 22
- pnpm >= 10
- Python 3.8+

### Install
```bash
pnpm install
cd python && pip install -r requirements.txt
```

### Run
```bash
# Terminal 1: Python backend
cd python && python main.py

# Terminal 2: TypeScript backend + frontend
pnpm dev
```

Open http://localhost:5173

### Features
- **Dashboard** — Device overview
- **Connect** — Switch connection
- **PoE** — PoE diagnostics
- **TDR** — Cable testing
- **VLAN** — VLAN management
- **SNMP** — SNMP management
- **Traffic** — Traffic analysis
- **Log** — Log parsing
- **Firmware** — Firmware management
- **Search** — Device search
```

- [ ] **Step 2: Create start script**

```bash
#!/bin/bash
# start.sh
echo "Starting OST Network Tools..."
echo "Starting Python backend on port 8001..."
cd python && python main.py &
PYTHON_PID=$!
echo "Starting TypeScript dev server..."
cd .. && pnpm dev &
TS_PID=$!
echo "Python backend PID: $PYTHON_PID"
echo "TypeScript server PID: $TS_PID"
echo "Open http://localhost:5173"
wait
```

- [ ] **Step 3: Run final verification**
- [ ] **Step 4: Commit**
