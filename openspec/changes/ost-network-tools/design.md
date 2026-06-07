# OST Network Tools — Design

## Project Structure

```
OST/
├── client/                          # React frontend
│   └── src/
│       ├── App.tsx                  # Router (Wouter)
│       ├── pages/
│       │   ├── Dashboard.tsx        # Device overview
│       │   ├── DeviceManager.tsx    # Connect/search/select
│       │   ├── ConfigWizard.tsx     # 4-page stepper
│       │   ├── PoeDiagnostics.tsx   # PoE status/control
│       │   ├── TdrView.tsx          # Cable test results
│       │   ├── VlanManager.tsx      # VLAN CRUD
│       │   ├── SnmpManager.tsx      # SNMP CRUD
│       │   ├── TrafficAnalyzer.tsx  # Traffic charts
│       │   ├── LogAnalyzer.tsx      # Log upload/parse
│       │   └── FirmwareManager.tsx  # GA lookup/upgrade
│       ├── components/
│       │   ├── ui/                  # shadcn/ui components
│       │   ├── switch/              # Switch-specific components
│       │   │   ├── PortTable.tsx
│       │   │   ├── SlotSelector.tsx
│       │   │   ├── HealthCard.tsx
│       │   │   └── TemperatureChart.tsx
│       │   └── shared/
│       │       ├── DataTable.tsx    # Reusable sortable table
│       │       ├── CommandRunner.tsx # Ad-hoc CLI command
│       │       └── ExportButton.tsx # CSV/JSON export
│       ├── lib/
│       │   ├── trpc.ts              # tRPC client
│       │   └── utils.ts
│       └── hooks/
│           └── useSwitch.ts         # Current switch context
│
├── server/                          # Express + tRPC backend
│   ├── _core/
│   │   └── index.ts                 # Express entry, tRPC at /api/trpc
│   ├── routers/
│   │   ├── switch.ts                # connect, disconnect, list, select
│   │   ├── system.ts                # show system/chassis/cmm/health
│   │   ├── poe.ts                   # lanpower commands
│   │   ├── tdr.ts                   # TDR test/results
│   │   ├── vlan.ts                  # VLAN CRUD
│   │   ├── snmp.ts                  # SNMP CRUD
│   │   ├── interface.ts             # interface status/config
│   │   ├── traffic.ts               # traffic analysis
│   │   ├── config.ts                # config wizard commands
│   │   └── firmware.ts              # GA lookup/upgrade
│   ├── aos/                         # AOS integration layer
│   │   ├── rest-client.ts           # REST API client (from OST C#)
│   │   ├── ssh-client.ts            # SSH service (from OST C#)
│   │   ├── command-table.ts         # 168 commands with %_DATA_% substitution
│   │   ├── textfsm.ts               # TextFSM parser wrapper
│   │   ├── xml-parser.ts            # XML response parser
│   │   └── models/                  # Device models
│   │       ├── switch.ts
│   │       ├── chassis.ts
│   │       ├── slot.ts
│   │       ├── port.ts
│   │       ├── vlan.ts
│   │       ├── snmp.ts
│   │       ├── transceiver.ts
│   │       └── types.ts             # Enums and interfaces
│   └── config/
│       └── engine.ts                # Declarative config engine
│
├── python/                          # Python backend (FastAPI)
│   ├── main.py                      # FastAPI entry
│   ├── routers/
│   │   ├── parser.py                # TextFSM parsing endpoints
│   │   ├── log_analyzer.py          # tech_support.log parsing
│   │   └── firmware.py              # GA lookup/download
│   └── requirements.txt             # textfsm-aos, fastapi, uvicorn
│
├── shared/
│   └── const.ts                     # Permission matrix, shared types
│
├── textfsm_templates/               # Copied from textfsm-aos
│   ├── ale_aos8_*.textfsm           # 34 AOS8 templates
│   └── ale_aos6_*.textfsm           # 20 AOS6 templates
│
├── drizzle/
│   └── schema.ts                    # Optional: switch list, config history
│
├── openspec/                        # OpenSpec artifacts
│   └── changes/
│       └── ost-network-tools/
│           ├── proposal.md
│           ├── design.md
│           ├── specs/
│           └── tasks.md
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── drizzle.config.ts
└── CLAUDE.md
```

## Key Interfaces

### REST API Client

```typescript
// server/aos/rest-client.ts

interface AosRestClient {
  ip: string;
  connected: boolean;

  // Authentication
  login(username: string, password: string): Promise<void>;
  disconnect(): void;

  // Execute commands
  executeCli(command: string): Promise<string>;         // Raw CLI output
  executeMib(urn: string): Promise<Record<string, string>>;  // MIB query
  executeMibSet(urn: string, data: Record<string, string>): Promise<void>;

  // High-level operations
  runCommand(cmd: Command, ...data: string[]): Promise<AosResult>;
}

interface AosResult {
  success: boolean;
  output: string;
  parsed?: Record<string, string>[];
  error?: string;
  duration: number;
}
```

### TextFSM Parser

```typescript
// server/aos/textfsm.ts

interface TextFSMParser {
  // Parse CLI output using a template
  parse(platform: 'ale_aos6' | 'ale_aos8', command: string, rawOutput: string): Promise<Record<string, string>[]>;

  // List available templates
  listTemplates(platform?: string): string[];
}
```

### Command Table

```typescript
// server/aos/command-table.ts

type Command =
  | 'SHOW_SYSTEM' | 'SHOW_CHASSIS' | 'SHOW_CMM' | 'SHOW_HW_INFO'
  | 'SHOW_TEMPERATURE' | 'SHOW_HEALTH' | 'SHOW_VLAN' | 'SHOW_INTERFACES'
  | 'SHOW_LAN_POWER' | 'SHOW_TDR_STATISTICS' | 'SHOW_SNMP_COMMUNITY'
  | 'POWER_UP_PORT' | 'POWER_DOWN_PORT' | 'ENABLE_TDR' | 'WRITE_MEMORY'
  // ... 168 total

const CMD_TBL: Record<Command, string> = {
  SHOW_SYSTEM: 'show system',
  SHOW_CHASSIS: 'show chassis',
  POWER_UP_PORT: 'lanpower port %_DATA_% admin-state enable',
  // ...
};

function buildCommand(cmd: Command, ...data: string[]): string {
  let result = CMD_TBL[cmd];
  for (const d of data) {
    result = result.replace('%_DATA_%', d);
  }
  return result;
}
```

### Device Models

```typescript
// server/aos/models/switch.ts

interface SwitchModel {
  name: string;
  ipAddress: string;
  netMask: string;
  version: string;
  status: 'unknown' | 'reachable' | 'unreachable' | 'login-fail';
  upTime: string;
  syncStatus: 'synchronized' | 'not-synchronized' | 'unknown';
  chassisList: ChassisModel[];
}

interface ChassisModel {
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

interface SlotModel {
  number: number;
  name: string;
  model: string;
  nbPorts: number;
  poe: PoeSlotInfo;
  ports: PortModel[];
  transceivers: TransceiverModel[];
}

interface PortModel {
  number: string;          // "1/1/1"
  name: string;
  alias: string;
  status: 'up' | 'down' | 'blocked' | 'unknown';
  isEnabled: boolean;
  poe: PoePortInfo;
  macList: string[];
  ipAddress: string;
  linkAggId: number;
  endpoint: EndPointDeviceModel;
  detail: PortDetail;
}

interface PortDetail {
  type: string;            // "Gigabit Ethernet"
  interfaceType: string;   // "Copper" | "Fiber"
  bandwidth: number;
  duplex: string;
  linkQuality: string;
  autoNegotiation: string;
}
```

### Declarative Config Engine

```typescript
// server/config/engine.ts

type ConfigState = 'merged' | 'replaced' | 'deleted' | 'rendered' | 'gathered';

interface ConfigEngine {
  // Gather current state
  gatherVlans(client: AosRestClient): Promise<VlanConfig[]>;
  gatherInterfaces(client: AosRestClient): Promise<InterfaceConfig[]>;

  // Compute diff
  diffVlans(current: VlanConfig[], desired: VlanConfig[]): CommandRequest[];

  // Apply changes
  apply(client: AosRestClient, commands: CommandRequest[]): Promise<ApplyResult>;
}

interface CommandRequest {
  command: string;
  description: string;
  reversible: boolean;
  reverseCommand?: string;
}

interface ApplyResult {
  success: boolean;
  applied: number;
  failed: number;
  commands: string[];
  errors: string[];
}
```

## Data Flow Examples

### Example 1: Connect and Display System Info

```
User enters IP/user/pass in DeviceManager.tsx
  ↓
tRPC: switch.connect({ ip, username, password })
  ↓
server/routers/switch.ts
  ↓
AosRestClient.login() → POST /auth/ → Bearer token
  ↓
AosRestClient.executeCli('show system')
  ↓
TextFSMParser.parse('ale_aos8', 'show system', rawOutput)
  ↓
Returns: { name, description, location, contact, upTime, ... }
  ↓
Build SwitchModel from parsed data
  ↓
Return to frontend → Dashboard.tsx renders
```

### Example 2: PoE Port Control

```
User clicks "Enable PoE" on port 1/1/2 in PoeDiagnostics.tsx
  ↓
tRPC: poe.enablePort({ port: '1/1/2' })
  ↓
server/routers/poe.ts
  ↓
buildCommand('POWER_UP_PORT', '1/1/2')
  → 'lanpower port 1/1/2 admin-state enable'
  ↓
AosRestClient.executeCli(command)
  ↓
Verify: executeCli('show lanpower slot 1') → parse → check port status
  ↓
Return result to frontend
```

### Example 3: Log Analysis

```
User uploads tech_support.log in LogAnalyzer.tsx
  ↓
tRPC: log.upload({ file: base64Content })
  ↓
server/routers/log.ts → forwards to Python backend
  ↓
POST http://localhost:8001/api/parse-log
  ↓
Python FastAPI → tsbuddy.parse_temperature(file_text)
  ↓
Returns structured temperature data
  ↓
Frontend renders table + charts
```

## Dependencies

### TypeScript (package.json)

```json
{
  "dependencies": {
    "@trpc/server": "^11",
    "@trpc/client": "^11",
    "@trpc/react-query": "^11",
    "@tanstack/react-query": "^5",
    "express": "^4",
    "react": "^19",
    "react-dom": "^19",
    "react-i18next": "^15",
    "wouter": "^3",
    "recharts": "^2",
    "ssh2": "^1",
    "fast-xml-parser": "^4",
    "zustand": "^5",
    "drizzle-orm": "^0.44",
    "mysql2": "^3",
    "jose": "^6",
    "bcryptjs": "^2"
  },
  "devDependencies": {
    "@types/react": "^19",
    "@types/ssh2": "^1",
    "typescript": "^5.9",
    "vite": "^7",
    "vitest": "^3",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4",
    "esbuild": "^25"
  }
}
```

### Python (requirements.txt)

```
textfsm-aos>=1.0.0
textfsm>=1.1.0
fastapi>=0.115
uvicorn>=0.34
tsbuddy>=0.1.0
```

## Environment Variables

```
# .env
DATABASE_URL=mysql://root:@localhost:3306/ost_network_tools
PORT=3000
PYTHON_BACKEND_PORT=8001
NODE_ENV=development
```
