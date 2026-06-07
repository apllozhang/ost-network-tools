# OST Network Tools — Proposal

## Problem

ALE network engineers currently rely on **CLI-only workflows** to deploy, configure, and troubleshoot OmniSwitch devices. This requires deep AOS expertise, is error-prone, and has no structured data output for analysis. Existing tools are fragmented across multiple repositories with overlapping capabilities and no unified interface.

## Solution

Build a **local web-based network management tool** (OST Network Tools) that provides a graphical interface for ALE OmniSwitch operations. The tool wraps five open-source ALE libraries into a unified TypeScript/React application with a Python backend for offline analysis.

```
┌──────────────────────────────────────────────────────────────┐
│                    OST Network Tools                          │
│                    localhost:3000                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  React + shadcn/ui (浏览器)                                   │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Dashboard │ 设备管理 │ 配置向导 │ PoE诊断 │ 日志分析 │   │
│  └────┬─────┴────┬─────┴────┬─────┴────┬─────┴────┬─────┘   │
│       │          │          │          │          │           │
│  ┌────┴──────────┴──────────┴──────────┴──────────┴─────┐    │
│  │              TypeScript Backend (Express + tRPC)       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │    │
│  │  │REST API  │ │SSH Svc   │ │TextFSM   │ │Device    │ │    │
│  │  │Client    │ │          │ │Parser    │ │Models    │ │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
│       │                                                      │
│  ┌────┴──────────────────────────────────────────────────┐    │
│  │              Python Backend (FastAPI)                   │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐               │    │
│  │  │tsbuddy   │ │Log       │ │Firmware  │               │    │
│  │  │Parser    │ │Analyzer  │ │Manager   │               │    │
│  │  └──────────┘ └──────────┘ └──────────┘               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              ALE OmniSwitch (AOS 8.x / 6.x)          │    │
│  │              REST API + SSH                            │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

## Target Users

ALE network engineers who:
- Can run CLI commands and have Python installed
- Want graphical visualization of switch state
- Need structured data export (CSV/JSON) for reporting
- Deploy and troubleshoot OmniSwitch in OT environments

## Scope

### In Scope

**Core Platform:**
- Local web server (Express + tRPC) on localhost
- REST API client for AOS 8.x switches (168 commands)
- SSH service for interactive sessions
- TextFSM-based CLI output parser (54 templates)
- Device model hierarchy (Switch → Chassis → Slot → Port)
- Python backend for offline analysis (tsbuddy)

**Feature Modules:**
- Dashboard — device overview, health status, alerts
- Device Manager — connect, search, select switches
- Configuration Wizard — 4-page guided setup
- PoE Diagnostics — status, power, faults, per-port control
- TDR Cable Test — cable health diagnostics
- VLAN Manager — create, delete, modify, member management
- SNMP Manager — communities, users, trap stations
- Traffic Analyzer — port/switch level traffic analysis
- Log Analyzer — tech_support.log parsing and visualization
- Firmware Manager — GA lookup, download, upgrade

**Advanced Features:**
- Declarative configuration engine (merged/replaced/deleted states)
- OSPFv2 configuration management
- BGP configuration management
- Static route management
- RADIUS server management
- Port security management

### Out of Scope (Future)

- Multi-switch concurrent management
- User authentication/authorization (single-user local tool)
- Cloud deployment
- Real-time streaming (SSE/WebSocket) for live switch monitoring
- SNMP polling/trap receiver (future enhancement)
- AOS 6.x support (templates exist but not prioritized)

## Sources

| Repository | License | Role in OST |
|-----------|---------|-------------|
| [OmniVista Smart Tool](https://github.com/ale-nsa-team/OmniVista-Smart-Tool) | MIT | Primary reference: 168 AOS commands, device models, UI patterns, REST API client, SSH service |
| [textfsm-aos](https://github.com/jefvantongerloo/textfsm-aos) | Apache 2.0 | CLI parsing engine: 54 TextFSM templates tested against 8 AOS versions |
| [ale.aos8](https://github.com/ale-nsa-team/ale.aos8) | GPLv3 | Declarative config engine: state management (merged/replaced/deleted), facts parsing, OSPF/BGP/RADIUS modules |
| [tsbuddy](https://github.com/bgbyte/tsbuddy) | MIT | Offline analysis: log parsing, CPU monitoring, SSH tech support collection, firmware management |
| [Aos8ApiBuilder](https://github.com/bgbyte/Aos8ApiBuilder) | Personal/Non-commercial | Reference only: REST API patterns, endpoint structure |

## Architecture

### Layer 1: REST API Client

Ported from OST C# (`Comm/RestApiClient.cs`). Handles authentication, request routing, and response parsing.

```
Authentication Flow:
  POST /auth/ → Bearer token → Auto-refresh on 401

Request Types:
  CLI:    GET /cli/aos?cmd={url_encoded_command}
  MIB:    GET /?domain=mib&{urn_query}
  MIB SET: POST /?domain=mib&{urn_query} (form data)

Response: XML (application/vnd.alcatellucentaos+xml)
  Success: /nodes/result/data/*
  Error:   /nodes/result/error
```

**Key patterns to preserve:**
- Token-based auth with auto-reconnect
- Retry logic (3 attempts, 3s delay)
- `%_DATA_%` placeholder substitution in command table
- Dual transport: REST API for queries, SSH for interactive sessions

### Layer 2: TextFSM Parser Engine

Replace OST C#'s `CliParseUtils` with TextFSM templates from textfsm-aos.

```
Decision: Use Python textfsm library via subprocess
  ┌─────────────────────────────────────────────┐
  │  Option A: Python subprocess (推荐)          │
  │  ├── 直接调用 textfsm-aos 的 Python 解析器   │
  │  ├── 54 个模板原样使用，不需要移植            │
  │  ├── 已测试 8 个 AOS 版本                    │
  │  └── 性能: 单次解析 < 100ms                  │
  │                                             │
  │  Option B: TypeScript TextFSM 引擎           │
  │  ├── 移植 textfsm 引擎到 TypeScript          │
  │  ├── 模板格式需要转换                        │
  │  └── 风险: 解析行为可能与 Python 版本不一致   │
  └─────────────────────────────────────────────┘
```

**Template coverage (54 templates):**

| Category | Templates | Commands |
|----------|-----------|----------|
| System | 6 | show system, chassis, cmm, hardware-info, microcode, running-directory |
| Health | 2 | show health, history |
| Interfaces | 5 | show interfaces, interfaces status, ip interface, ip routes, ip router database |
| Switching | 6 | show vlan, vlan members, mac-learning, linkagg, linkagg port, spantree ports |
| PoE | 1 | (via REST API + OST C# parsing) |
| LLDP | 1 | show lldp remote-system |
| SNMP | 3 | show snmp community-map, station, user |
| Security | 4 | show port-security brief, unp user, unp user details, 802.1x |
| QoS | 2 | show qos port, qos log |
| Services | 3 | show service, service spb, ntp server status |
| Transceivers | 1 | show transceivers |
| Logging | 3 | show command-log, log events, arp |
| AOS6 | 20 | (parallel templates for AOS6 compatibility) |

### Layer 3: Device Models

Ported from OST C# (`Device/` directory). TypeScript interfaces + classes.

```
SwitchModel (root)
  ├── Name, IpAddress, NetMask, Login, Password
  ├── Status, Version, UpTime, SyncStatus
  ├── ChassisList: ChassisModel[]
  │   ├── Number, Model, SerialNumber, MacAddress
  │   ├── Temperature: { Current, Threshold, Danger, Status }
  │   ├── Fpga, Cpld, Uboot, Onie, Cpu
  │   ├── Slots: SlotModel[]
  │   │   ├── Number, Name, Model, NbPorts
  │   │   ├── PoE: { Power, Budget, Threshold, Status }
  │   │   ├── Transceivers: TransceiverModel[]
  │   │   └── Ports: PortModel[]
  │   │       ├── Number, Name, Alias, Status, IsEnabled
  │   │       ├── PoE: { Status, Power, MaxPower, Class, Priority }
  │   │       ├── Network: { MacList, IpAddress, LinkAggId }
  │   │       ├── Endpoint: EndPointDeviceModel (LLDP)
  │   │       └── Detail: { Type, Bandwidth, Duplex, LinkQuality }
  │   └── PowerSupplies: PowerSupplyModel[]
  └── Config: { Vlans, Snmp, Ntp, Dns, Dhcp, Routes }
```

### Layer 4: Declarative Configuration Engine

Inspired by ale.aos8's state management pattern.

```
States:
  merged    → Add missing config, don't touch existing
  replaced  → Replace specified config to match desired state
  deleted   → Remove specified config
  rendered  → Generate commands without executing
  gathered  → Collect current state only

Flow:
  Current State (gathered via TextFSM) 
       ↓
  Diff Engine (current vs desired)
       ↓
  Command Generator (minimal command set)
       ↓
  Executor (REST API or SSH)
```

### Layer 5: React UI

| Page | Components | Data Source |
|------|-----------|-------------|
| Dashboard | Health cards, temperature chart, port status grid | REST API + TextFSM |
| Device Manager | Connect form, switch list, slot/port selector | REST API |
| Config Wizard | 4-page stepper (System → Servers → Features → SNMP) | REST API + Diff Engine |
| PoE Diagnostics | Per-port PoE table, power budget chart, fault alerts | REST API |
| TDR View | Cable test results, pair status, length display | REST API |
| VLAN Manager | VLAN table, member management, create/delete dialogs | TextFSM + REST API |
| SNMP Manager | Community/User/Station CRUD tables | TextFSM + REST API |
| Traffic Analyzer | Port traffic charts, LLDP device table, export | REST API + TextFSM |
| Log Analyzer | File upload, section selector, parsed table, search | tsbuddy (Python) |
| Firmware Manager | GA version lookup, download progress, upgrade wizard | tsbuddy (Python) |

## Implementation Phases

### Phase 1: Core Engine (Week 1-2)

**Goal:** Connect to a switch, run commands, parse output, display data.

| Task | Description | Verify |
|------|-------------|--------|
| 1.1 | REST API Client — auth, CLI/MIB requests, XML parsing, retry | Connect to switch, run `show system`, get parsed response |
| 1.2 | Command Table — port 168 commands from OST C# `RestUrl.cs` | All commands routable with `%_DATA_%` substitution |
| 1.3 | TextFSM Integration — Python subprocess wrapper for textfsm-aos | Parse `show system` output, get structured JSON |
| 1.4 | Device Models — TypeScript interfaces for Switch/Chassis/Slot/Port | Build model tree from `show chassis` + `show slot` output |
| 1.5 | tRPC Router — `switch.connect`, `switch.execute`, `switch.parse` | Frontend can connect and display system info |
| 1.6 | Basic React UI — Connect page + System info display | Enter IP/user/pass → see switch name/version/uptime |

### Phase 2: Feature Modules (Week 3-4)

**Goal:** PoE, TDR, VLAN, SNMP management with full CRUD.

| Task | Description | Verify |
|------|-------------|--------|
| 2.1 | PoE Module — port power status, enable/disable, priority, budget | Display PoE table, toggle port power |
| 2.2 | TDR Module — run test, display results, clear stats | Run TDR on port, see pair states/lengths |
| 2.3 | VLAN Module — list, create, delete, member management | Create VLAN 100, add port 1/1/1 as untagged |
| 2.4 | SNMP Module — community/user/station CRUD | Add SNMP community, verify on switch |
| 2.5 | Config Wizard — 4-page stepper with diff-and-apply | Change hostname via wizard, verify on switch |
| 2.6 | SSH Service — interactive shell for commands not available via REST | Run `show tech-support` via SSH |

### Phase 3: Advanced Features (Week 5-6)

**Goal:** Traffic analysis, log parsing, firmware management, declarative config.

| Task | Description | Verify |
|------|-------------|--------|
| 3.1 | Traffic Analyzer — multi-sample collection, rate calculation, CSV export | Collect 5-min traffic, export to CSV |
| 3.2 | Log Analyzer — upload tech_support.log, section parsing, search/filter | Upload file, parse temperature section |
| 3.3 | Firmware Manager — GA lookup, download, SFTP upload, upgrade | Look up GA for OS6860, download firmware |
| 3.4 | Declarative Config Engine — merged/replaced/deleted states | Apply VLAN config in `merged` mode |
| 3.5 | OSPF/BGP/Static Routes — ale.aos8 modules integrated | Configure OSPF area via UI |
| 3.6 | Device Search — IP/MAC/name/vendor search across ports | Search for MAC, find port 1/1/5 |

### Phase 4: Polish & Testing (Week 7-8)

**Goal:** Production-ready tool with comprehensive tests.

| Task | Description | Verify |
|------|-------------|--------|
| 4.1 | Dark/Light theme (from OST C# `ThemeType`) | Toggle theme, all pages render correctly |
| 4.2 | i18n — react-i18next, zh/en locales | Switch language, all text updates |
| 4.3 | Error handling — connection failures, timeouts, command errors | Disconnect switch mid-session, graceful error |
| 4.4 | Tests — Vitest for backend, component tests for frontend | `pnpm test` passes |
| 4.5 | Documentation — README, setup guide, command reference | New user can install and connect in 5 minutes |
| 4.6 | Package — single `pnpm start` command to run everything | `pnpm start` → opens browser at localhost:3000 |

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | React + shadcn/ui | Modern, accessible component library |
| Backend framework | Express + tRPC | Type-safe end-to-end API |
| CLI parsing | TextFSM via Python subprocess | 54 battle-tested templates, no need to rewrite regex |
| SSH library | ssh2 (Node.js) | Most mature Node.js SSH library |
| XML parsing | fast-xml-parser | AOS REST API returns XML, not JSON |
| Python backend | FastAPI (for tsbuddy) | Clean REST API, async support, auto-docs |
| State management | Zustand | Lightweight, fits single-user local tool |
| Database | SQLite (optional) | Store switch list, config history, analysis results |
| Charting | Recharts | Aligned with existing projects |

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| CLI output varies across AOS versions | High | TextFSM templates tested against 8 versions; fallback to raw text display |
| SSH prompt detection is fragile | High | Use OST C#'s proven prompt detection logic; add timeout/retry |
| Python subprocess adds complexity | Medium | Thin wrapper only; tsbuddy stays as-is, no forking |
| TextFSM template maintenance | Medium | Upstream textfsm-aos is active (15 stars); contribute fixes back |
| REST API XML parsing edge cases | Medium | Use fast-xml-parser with strict mode; test against real switches |

## Success Criteria

1. **Connect** — Enter switch IP/credentials, see device info in < 5 seconds
2. **Diagnose** — View PoE status, TDR results, health metrics in one dashboard
3. **Configure** — Change VLAN/SNMP/system settings via wizard, verify on switch
4. **Analyze** — Upload tech_support.log, see parsed sections with search/filter
5. **Export** — Download any data as CSV/JSON for reporting
