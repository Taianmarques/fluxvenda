# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev           # start dev server
npm run build         # production build
npm run lint          # ESLint
npm run db:generate   # regenerate Prisma client after schema changes
npm run db:migrate    # create + run migration (dev only)
npm run db:push       # push schema without migration file (prototyping)
npm run db:studio     # Prisma Studio GUI
npm run db:seed       # seed database
```

After any `prisma/schema.prisma` change, run `db:generate` before building — the client lives at `app/generated/prisma/client`, not `node_modules/@prisma/client`.

## Architecture

### Project identity
FluxVenda — B2B SaaS combining a sales training platform (diagnostics, gamification, trails, objection simulator, script generator, playbook) with a WhatsApp AI agent CRM (booking, commerce, debt collection, outbound prospecting), targeting Brazilian SMBs.

### Two AI providers with separate responsibilities
- **Anthropic / Claude** (`lib/anthropic.ts`, model `claude-sonnet-4-6`): educational modules — diagnostic analysis, objection coaching, script generation, 90-day plan.
- **OpenAI / GPT-4o-mini** (`lib/openai.ts`): WhatsApp agent subsystem — system prompt synthesis (`generateSystemPrompt` in `lib/agent-engine.ts`) and audio transcription (Whisper-1 via `transcribeAudio`).

### Next.js 16 specifics
- **Middleware is called `proxy.ts`** (root level), not `middleware.ts`. Clerk auth + role-based route protection lives there.
- `params` in route handlers and page components is a `Promise<{...}>` — always `await params` before destructuring.
- `NEXT_PUBLIC_*` vars are baked into the client bundle at build time; they cannot be injected at runtime in Docker — pass them as Docker `ARG`s before `npm run build`.

### Database
Two separate `DATABASE_URL` / `DIRECT_URL` are required:
- `DATABASE_URL` → Supabase PgBouncer pooler (used by app at runtime via `lib/prisma.ts` with `@prisma/adapter-pg`).
- `DIRECT_URL` → direct Supabase connection (used exclusively by Prisma CLI via `prisma.config.ts`; migrations will fail against PgBouncer transaction mode).

### Clerk auth + roles
Role comes from `sessionClaims.publicMetadata.role` (JWT). Roles: `VENDEDOR | FUNCIONARIO | GESTOR | ADMIN`. Database role changes don't take effect until the user's Clerk session refreshes.

### WhatsApp multi-tenancy
Two tiers of UazAPI credentials:
1. **Platform-level** (`UAZAPI_TOKEN` env) — used for onboarding messages via `sendWhatsAppText`.
2. **Per-team** (`AgentConfig.uazapiInstance` / `AgentConfig.uazapiToken`) — used for all CRM/agent traffic via `sendWhatsAppTextAsTeam` / `sendMediaAsTeam`.

### Cron routes
`/api/cron/followup`, `/api/cron/cobranca`, `/api/cron/prospeccao` — public routes (no Clerk) protected by `Authorization: Bearer <CRON_SECRET>`. Must be called by an external scheduler.

### Key lib files
| File | Purpose |
|---|---|
| `lib/team.ts` | Multi-agent access control: `listMyAgentConfigs`, `getAgentConfigWithRole`, `getAgentConfigAsManager`, `userBelongsToAgentConfig` |
| `lib/agent-engine.ts` | WhatsApp agent brain: `generateSystemPrompt`, `transcribeAudio`, tool definitions (SCHEDULING_TOOLS, COMMERCE_TOOLS, BILLING_TOOLS, PROSPECTING_TOOLS) |
| `lib/whatsapp.ts` | UazAPI wrappers for sending text, media, and audio |
| `lib/asaas.ts` | Raw-fetch Asaas integration (Pix, boleto, credit card, installments) — no official SDK |
| `lib/scheduling.ts` | `getAvailableSlots` + `formatSlotsForAgent` — appointment availability from rules + booked slots |
| `lib/google-maps-scraper.ts` | Playwright Chromium headless scraper for outbound leads (requires `npx playwright install chromium --with-deps` on the server) |
| `lib/segments.ts` | `SEGMENTS` / `SUBSEGMENTS` taxonomy — 9 segments with 8 sub-segments each |
| `lib/agent-wizard-questions.ts` | Sector-specific question definitions for the new-agent setup wizard |
| `instrumentation.ts` | Pins `process.env.TZ = "America/Sao_Paulo"` on server start — all date logic runs in Brasília time |

### Agent config scope
`AgentConfig` is scoped per WhatsApp number (not per team). A team can have multiple simultaneous agents. Use `lib/team.ts` helpers — never query `AgentConfig` by `teamId` alone.

### WhatsApp webhook debounce
`app/api/webhooks/whatsapp/route.ts` saves each incoming message, sleeps `MESSAGE_DEBOUNCE_MS` (default 8000 ms), then checks if a newer message arrived before processing — this batches rapid multi-part messages before sending to the AI.

### Product images
Stored as base64 in `Product.imagemBase64` (`@db.Text`). No blob storage service exists in the stack.

### Env vars (authoritative list is `setup.sh`)
`.env.example` is incomplete — `OPENAI_API_KEY`, `UAZAPI_ADMIN_TOKEN`, and `CRON_SECRET` are missing from it. Use `setup.sh` as the source of truth for required env vars.
