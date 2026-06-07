# OST Network Tools

Enterprise network operations platform for ALE OmniSwitch device management, network diagnostics, alert handling, and operational dashboards.

## Features

- **Dashboard** — KPI cards, health distribution, critical alert queue, trend charts
- **Device Management** — Multi-device CRUD, status monitoring, data collection
- **Alert Center** — Full alert lifecycle (trigger → acknowledge → process → close), state machine, timeline
- **Network Tools** — Ping, TCP Check, HTTP Check, DNS Lookup, Traceroute (save as monitor targets)
- **AOS Tools** — PoE diagnostics, TDR cable test, VLAN/SNMP management, traffic analysis, log parsing, firmware management
- **Audit Log** — All mutations logged (login, CRUD, alert actions)
- **Auth** — JWT cookie sessions, role-based access (admin/operator/viewer)
- **i18n** — English and Chinese translations

## Quick Start

### Prerequisites

- Node.js >= 22
- pnpm >= 10
- Python 3.8+
- MySQL 8

### Installation

```bash
# Clone
git clone https://github.com/apllozhang/ost-network-tools.git
cd ost-network-tools

# Create .env from template
cp .env.example .env
# Edit .env if needed (DATABASE_URL, JWT_SECRET, etc.)

# Install Node.js dependencies
pnpm install

# Install Python dependencies
cd python && pip install -r requirements.txt && cd ..

# Create database and push schema
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ost_network_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:push
```

### Running

```bash
# Terminal 1: Python backend (TextFSM + Network Tools)
cd python && python main.py

# Terminal 2: TypeScript backend + React frontend
pnpm dev
```

Or use the start script:

```bash
./start.sh
```

Open http://localhost:5173

**Default login:** admin / admin123

### Development

```bash
pnpm check        # TypeScript type check
pnpm test          # Run tests (36 tests)
pnpm db:push       # Push schema changes to database
pnpm format        # Format code with Prettier
pnpm lint          # Lint code
```

## Architecture

```
client/src/          React 19 frontend (Vite 7)
  components/ui/     shadcn/ui (Radix + Tailwind)
  components/layout/ AppShell, Sidebar, TopBar
  pages/             10+ page components
server/              Express 4 + tRPC 11 backend
  _core/             Entry, router, tRPC instance
  auth/              JWT + bcryptjs auth system
  aos/               AOS REST API client + command table
  routers/           11 tRPC routers
  audit/             Audit logging
python/              FastAPI backend
  services/          Network tools (Ping/TCP/HTTP/DNS/Traceroute)
  routers/           Tools + log analysis + firmware endpoints
drizzle/             MySQL schema (Drizzle ORM)
shared/              Shared types and constants
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Wouter 3, tRPC React Query 11 |
| UI | shadcn/ui (Radix), Tailwind CSS 4, TanStack Table, Recharts |
| Backend | Express 4, tRPC 11 |
| Network Tools | Python FastAPI (Ping/TCP/HTTP/DNS/Traceroute) |
| Parser | TextFSM (via Python) |
| Database | MySQL 8, Drizzle ORM |
| Auth | JWT (jose) + bcryptjs, httpOnly cookies |
| Testing | Vitest |
| i18n | react-i18next (en, zh) |

## License

Private project.
