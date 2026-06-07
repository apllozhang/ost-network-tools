# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OST Network Tools — enterprise network operations platform for managing ALE (Alcatel-Lucent Enterprise) OmniSwitch devices. Features: device CRUD, alert lifecycle, PoE diagnostics, TDR cable testing, VLAN/SNMP/traffic management, network diagnostic tools.

## Behavioral Guidelines

### 1. Think Before Coding

- State assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.

### 2. Simplicity First

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
- Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Transform tasks into verifiable goals:
- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a test that reproduces it, then make it pass
- "Refactor X" → ensure tests pass before and after

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

## Memory Auto-Save

After each task, check if anything is worth remembering for future sessions:

**Save when:**
- You learned something non-obvious about the user (role, preference, workflow)
- An architecture decision was made that isn't obvious from the code
- User corrected your approach — save the correction with reasoning
- You discovered an external resource or reference worth bookmarking

**Don't save:**
- What's already in this CLAUDE.md or code comments
- Transient debugging context
- Information that only matters this conversation

**How:** Write to memory dir, then add one-liner to MEMORY.md index. Use frontmatter (`name`, `description`, `metadata.type`). Link related memories with `[[name]]`.

## Non-Negotiable Rules

1. **Client ≠ Server** — `client/` MUST NOT import from `server/`. Shared logic → `@shared/`.
2. **tRPC only** — frontend data fetching via `@/lib/trpc` React Query hooks. No `fetch`/`axios`.
3. **i18n all text** — use `react-i18next` `useTranslation()`. Never hardcode user-facing strings.
4. **Tailwind only** — no new CSS files unless explicitly requested.
5. **No `any`** — `strict: true` + ESLint `no-explicit-any: error`.

## Tech Stack

| Layer | Tech |
|-------|------|
| Language | TypeScript 5.x (strict, ES modules) |
| Frontend | React 19, Vite 7, Wouter 3, tRPC React Query 11 |
| UI | shadcn/ui (Radix), Tailwind CSS 4 |
| Backend | Express 4, tRPC 11 |
| Database | MySQL 8, Drizzle ORM, mysql2 |
| Auth | JWT (jose) + bcryptjs, cookie sessions |
| Testing | Vitest |
| Package Manager | pnpm 10 |

## Setup

```bash
git clone https://github.com/apllozhang/ost-network-tools.git
cd ost-network-tools
cp .env.example .env
pnpm install
cd python && pip install -r requirements.txt && cd ..
mysql -u root -e "CREATE DATABASE IF NOT EXISTS ost_network_tools CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
pnpm db:push
# Terminal 1: cd python && python main.py
# Terminal 2: pnpm dev
```

## Commands

```bash
pnpm dev          # Dev server (TS on :3000, Python on :8001)
pnpm build        # Production build (vite + esbuild)
pnpm check        # tsc --noEmit
pnpm test         # vitest
pnpm lint         # eslint
pnpm format       # Prettier all files
pnpm db:push      # Drizzle schema push
```

Single test: `pnpm vitest run <path-to-test>.test.ts`

## Architecture

- **Server entry**: `server/_core/index.ts` — Express + tRPC at `/api/trpc`
- **tRPC hierarchy**: `publicProcedure` → `protectedProcedure` → `adminProcedure` → `superAdminProcedure` + `permissionProcedure(perm)`
- **Frontend**: React + Wouter routing in `client/src/App.tsx`
- **Schema**: `drizzle/schema.ts`, migrations in `drizzle/` (10 tables: users, sites, devices, monitorTargets, probeResults, deviceMetrics, alerts, alertTimeline, events, auditLogs)
- **Shared**: Permission matrix in `shared/const.ts`
- **Path aliases**: `@/*` → `client/src/*`, `@shared/*` → `shared/*`

## Dual-Server Architecture

Two servers run simultaneously:
1. **TypeScript** (Express + tRPC) on port 3000 — API + Vite dev frontend
2. **Python** (FastAPI + Uvicorn) on port 8001 — TextFSM parsing + network diagnostics

Use `start.sh` to launch both. The TS server proxies TextFSM/diagnostic requests to Python via `server/aos/textfsm.ts` and `server/routers/tools.ts`.

Python source: `python/` (routers, services, 40+ TextFSM templates for AOS6/AOS8 CLI output).

## Key Patterns

- **Alert state machine** (`server/alerts/state-machine.ts`): 7 states (triggered → unconfirmed → confirmed → processing → recovered → closed, plus silenced). Invalid transitions throw.
- **Audit logging** (`server/audit/logger.ts`): fire-and-forget on every mutation. Never breaks main operation.
- **AOS REST client** (`server/aos/rest-client.ts`): HTTPS + token auth, 3 retries with 3s delay, connection pool with 30-min TTL.

## Skill Routing

| Phase | Tool | When |
|-------|------|------|
| Decision | gstack | `/browse` `/qa` `/investigate` |
| Proposal | opsx | `/opsx:explore` → `/opsx:propose` → `/opsx:apply` |
| Execution | superpowers | `/brainstorming` → `/writing-plans` → `/TDD` |

Simple bugfix → skip OpenSpec, go straight to `/systematic-debugging`.

## Environment

- Windows 10, bash — Unix shell syntax, forward slashes
- Node >= 22, pnpm >= 10
- Copy `.env.example` to `.env` — required vars: `DATABASE_URL`, `JWT_SECRET`, `PORT`, `PYTHON_BACKEND_PORT`

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore
- Author a backlog-ready spec/issue → invoke /spec
