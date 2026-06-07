# OST Network Tools — Tasks

## Phase 1: Core Engine

### 1.1 Project Scaffold

- [ ] Initialize pnpm project with TypeScript strict mode
- [ ] Setup Vite + React 19 + Wouter 3 + Tailwind CSS 4 + shadcn/ui
- [ ] Setup Express 4 + tRPC 11 server entry (`server/_core/index.ts`)
- [ ] Setup Vitest configuration
- [ ] Setup ESLint + Prettier
- [ ] Create `shared/const.ts` with path aliases
- [ ] Create `.env.example` with required variables
- verify: `pnpm dev` starts server, `pnpm check` passes, `pnpm test` passes

### 1.2 REST API Client

- [ ] Create `server/aos/rest-client.ts` — HTTP client with token auth
- [ ] Implement `login()` — POST /auth/, extract token from XML
- [ ] Implement `executeCli(command)` — GET /cli/aos?cmd=...
- [ ] Implement `executeMib(urn)` — GET /?domain=mib&...
- [ ] Implement `executeMibSet(urn, data)` — POST /?domain=mib&...
- [ ] Implement auto-reconnect on 401 (close client, re-login, retry)
- [ ] Implement retry logic (3 attempts, 3s delay)
- [ ] Create `server/aos/xml-parser.ts` — fast-xml-parser wrapper
- [ ] Create custom error classes: `SwitchConnectionFailure`, `SwitchAuthenticationFailure`, `SwitchCommandError`
- verify: Connect to real switch, run `show system`, get parsed XML response

### 1.3 Command Table

- [ ] Create `server/aos/command-table.ts` — all 168 commands from OST C#
- [ ] Define `Command` enum type
- [ ] Implement `buildCommand(cmd, ...data)` — `%_DATA_%` substitution
- [ ] Create MIB request table mapping (DNS, DHCP, NTP, debug levels)
- verify: `buildCommand('POWER_UP_PORT', '1/1/2')` returns `'lanpower port 1/1/2 admin-state enable'`

### 1.4 TextFSM Integration

- [ ] Copy 54 TextFSM templates from textfsm-aos to `textfsm_templates/`
- [ ] Install Python dependencies: `textfsm-aos`, `textfsm`, `fastapi`, `uvicorn`
- [ ] Create `python/main.py` — FastAPI server with `/api/parse` endpoint
- [ ] Create `server/aos/textfsm.ts` — subprocess wrapper calling Python parser
- [ ] Test parsing: `show system`, `show health`, `show vlan`, `show interfaces`
- verify: `textfsm.parse('ale_aos8', 'show system', rawOutput)` returns structured JSON

### 1.5 Device Models

- [ ] Create `server/aos/models/types.ts` — enums (PoeStatus, PortStatus, ThresholdType, etc.)
- [ ] Create `server/aos/models/switch.ts` — SwitchModel interface
- [ ] Create `server/aos/models/chassis.ts` — ChassisModel + TemperatureInfo
- [ ] Create `server/aos/models/slot.ts` — SlotModel + PoeSlotInfo
- [ ] Create `server/aos/models/port.ts` — PortModel + PoePortInfo + PortDetail
- [ ] Create `server/aos/models/vlan.ts` — VlanModel
- [ ] Create `server/aos/models/snmp.ts` — SnmpModel + SnmpUser/Community/Station
- [ ] Create `server/aos/models/transceiver.ts` — TransceiverModel
- [ ] Create `server/aos/model-builder.ts` — build model tree from parsed CLI output
- verify: Connect to switch, build full SwitchModel with chassis/slot/port hierarchy

### 1.6 tRPC Router — Basic

- [ ] Create `server/routers/switch.ts` — connect, disconnect, getInfo
- [ ] Create `server/routers/system.ts` — showSystem, showChassis, showHealth, showTemperature
- [ ] Create tRPC context with current AosRestClient instance
- [ ] Create `client/src/lib/trpc.ts` — tRPC React Query client
- verify: Frontend can call `switch.connect` and display system info

### 1.7 Basic React UI

- [ ] Create `client/src/App.tsx` — Wouter routes
- [ ] Create `client/src/pages/Dashboard.tsx` — system info cards
- [ ] Create `client/src/components/switch/HealthCard.tsx` — CPU/memory display
- [ ] Create `client/src/components/switch/TemperatureChart.tsx` — Recharts temp display
- [ ] Create `client/src/pages/DeviceManager.tsx` — connect form
- verify: Enter IP/user/pass → see switch name, version, uptime, CPU, temperature

---

## Phase 2: Feature Modules

### 2.1 PoE Module

- [ ] Create `server/routers/poe.ts` — show, enable, disable, priority, budget
- [ ] Create `client/src/pages/PoeDiagnostics.tsx` — port table with PoE status
- [ ] Implement per-port PoE controls (enable/disable, priority toggle)
- [ ] Implement power budget chart (used vs available)
- verify: Display PoE table, toggle port power, see budget update

### 2.2 TDR Module

- [ ] Create `server/routers/tdr.ts` — runTest, getResults, clearStats
- [ ] Create `client/src/pages/TdrView.tsx` — pair states, lengths, result
- [ ] Implement progress indicator for TDR test (takes ~10s per port)
- verify: Run TDR on port, see 4-pair state/length/result

### 2.3 VLAN Module

- [ ] Create `server/routers/vlan.ts` — list, create, delete, addMember, removeMember
- [ ] Create `client/src/pages/VlanManager.tsx` — VLAN table with CRUD
- [ ] Implement VLAN member management (tagged/untagged port selection)
- [ ] Use TextFSM templates: `show vlan`, `show vlan members`
- verify: Create VLAN 100, add port 1/1/1 as untagged, verify on switch

### 2.4 SNMP Module

- [ ] Create `server/routers/snmp.ts` — community/user/station CRUD
- [ ] Create `client/src/pages/SnmpManager.tsx` — 3 tables (communities, users, stations)
- [ ] Implement add/delete dialogs for each entity type
- [ ] Use TextFSM templates: `show snmp community-map`, `show snmp station`, `show user`
- verify: Add SNMP community, verify with `show snmp community-map`

### 2.5 Config Wizard

- [ ] Create `client/src/pages/ConfigWizard.tsx` — 4-page stepper
- [ ] Page 1: System settings (IP, netmask, name, contact, location)
- [ ] Page 2: Servers (gateway, DNS, NTP, timezone)
- [ ] Page 3: Features (SSH, multicast, DHCP relay)
- [ ] Page 4: SNMP (communities, users, stations)
- [ ] Implement diff engine: current vs desired → command list
- [ ] Implement apply: execute commands, show results
- verify: Change hostname via wizard, verify on switch

### 2.6 SSH Service

- [ ] Create `server/aos/ssh-client.ts` — ssh2-based interactive shell
- [ ] Implement shell session with prompt detection
- [ ] Implement `sendCommand(cmd)` — send command, wait for prompt, return output
- [ ] Implement `sendLinuxCommand(cmd)` — escape to Linux shell via `su`
- verify: Run `show tech-support` via SSH, get output

---

## Phase 3: Advanced Features

### 3.1 Traffic Analyzer

- [ ] Create `server/routers/traffic.ts` — startCollection, getResults, exportCsv
- [ ] Create `client/src/pages/TrafficAnalyzer.tsx` — charts + tables
- [ ] Implement multi-sample collection (configurable duration/interval)
- [ ] Implement rate calculation (bytes/sec, packets/sec)
- [ ] Implement CSV export
- verify: Collect 5-min traffic, see port throughput charts

### 3.2 Log Analyzer

- [ ] Create `python/routers/log_analyzer.py` — tsbuddy integration
- [ ] Create `server/routers/log.ts` — upload, parse, search
- [ ] Create `client/src/pages/LogAnalyzer.tsx` — file upload + section browser
- [ ] Implement section selector (show temperature, show health, etc.)
- [ ] Implement search/filter across parsed sections
- verify: Upload tech_support.log, browse parsed sections

### 3.3 Firmware Manager

- [ ] Create `python/routers/firmware.py` — tsbuddy GA lookup + download
- [ ] Create `server/routers/firmware.ts` — lookup, download, upgrade
- [ ] Create `client/src/pages/FirmwareManager.tsx` — version info + upgrade wizard
- verify: Look up GA for OS6860, see version history

### 3.4 Declarative Config Engine

- [ ] Create `server/config/engine.ts` — gather, diff, apply
- [ ] Implement VLAN declarative config (merged/replaced/deleted)
- [ ] Implement Interface declarative config
- [ ] Implement rendered mode (generate commands without executing)
- verify: Apply VLAN config in `merged` mode, only missing VLANs created

### 3.5 OSPF/BGP/Static Routes

- [ ] Port ale.aos8 OSPF facts parser to TypeScript
- [ ] Port ale.aos8 BGP facts parser to TypeScript
- [ ] Port ale.aos8 static routes facts parser to TypeScript
- [ ] Create tRPC routers for each
- [ ] Create React pages for each
- verify: Configure OSPF area via UI, verify on switch

### 3.6 Device Search

- [ ] Create `server/routers/search.ts` — search by IP/MAC/name/vendor
- [ ] Create `client/src/components/shared/DeviceSearch.tsx`
- [ ] Implement MAC vendor lookup (oui.csv from OST C#)
- [ ] Implement cross-port search (scan all ports for MAC/IP)
- verify: Search for MAC address, find port 1/1/5

---

## Phase 4: Polish & Testing

### 4.1 Theme & i18n

- [ ] Implement dark/light theme toggle (from OST C# ThemeType)
- [ ] Setup react-i18next with zh/en locales
- [ ] Translate all user-facing strings
- verify: Toggle theme, switch language, all pages render correctly

### 4.2 Error Handling

- [ ] Implement connection failure recovery
- [ ] Implement timeout handling (configurable per command)
- [ ] Implement command error display with AOS error codes
- [ ] Add loading states and progress indicators
- verify: Disconnect switch mid-session, graceful error message

### 4.3 Testing

- [ ] Unit tests for REST API client (mock HTTP)
- [ ] Unit tests for TextFSM parser (sample outputs)
- [ ] Unit tests for device model builder
- [ ] Unit tests for config engine diff logic
- [ ] Component tests for key React pages
- verify: `pnpm test` passes

### 4.4 Documentation & Packaging

- [ ] Write README.md with setup guide
- [ ] Write command reference
- [ ] Create `pnpm start` script (starts both TS and Python backends)
- [ ] Create `.env.example` with all required variables
- verify: New user can install and connect in 5 minutes
