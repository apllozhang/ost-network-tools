# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

OST — Enterprise network operations platform for ALE OmniSwitch device management, diagnostics, and monitoring.

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

## Commands

```bash
pnpm dev          # Dev server
pnpm build        # Production build (vite + esbuild)
pnpm check        # tsc --noEmit
pnpm test         # vitest
pnpm format       # Prettier all files
pnpm db:push      # Drizzle schema push
```

Single test: `pnpm vitest run <path-to-test>.test.ts`

## Architecture

- **Server entry**: `server/_core/index.ts` — Express + tRPC at `/api/trpc`
- **tRPC hierarchy**: `publicProcedure` → `protectedProcedure` → `adminProcedure` → `superAdminProcedure` + `permissionProcedure(perm)`
- **Frontend**: React + Wouter routing in `client/src/App.tsx`
- **Schema**: `drizzle/schema.ts`, migrations in `drizzle/`
- **Shared**: Permission matrix in `shared/const.ts`
- **Path aliases**: `@/*` → `client/src/*`, `@shared/*` → `shared/*`

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
