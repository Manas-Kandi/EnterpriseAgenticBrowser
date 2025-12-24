# Enterprise Agentic Browser

An Electron-based agentic browser with:

- A local-first agent runtime (LangChain + tool registry)
- Secure secrets via OS keychain (Keytar)
- Session persistence (tabs, groups, chat history)
- Enterprise-ready controls (policy sync, audit + SIEM export, IdP login)

This repo currently includes a "personal" build mode and a "mock enterprise" environment (Mock SaaS) used for deterministic testing.

## Architecture (high level)

- **Renderer (React + Zustand)**
  - UI shell (`src/`)
  - Persisted non-sensitive state (tabs, groups, preferences)
  - Settings UI for LLM provider config
- **Main process (Electron + Node)**
  - Agent runtime (`electron/services/AgentService.ts`)
  - Tool execution + policy enforcement (`electron/services/ToolRegistry.ts`, `electron/services/PolicyService.ts`)
  - Secure storage (`electron/services/VaultService.ts`)
  - Encrypted auditing + SIEM shipper (`electron/services/AuditService.ts`)
  - Session persistence (encrypted chat history file)
  - Identity / OIDC PKCE login (`electron/services/IdentityService.ts`)

## Key features

### User-configurable LLM settings

- Configure provider/base URL/model in-app (Settings modal)
- API keys are stored in the system keychain (not in renderer storage)

### Robust browser automation

- `browser_observe` returns multiple selector candidates
- XPath selectors supported (`xpath=...`)

### Session persistence

- Tabs, tab groups, history, preferences are persisted via Zustand
- Chat history is stored encrypted on disk and restored on startup

### Remote policy synchronization

- Remote policy bundle can be fetched and cached locally
- Domain allow/block lists and risk overrides
- Developer override gated by keychain secret

### Shared skill library (cloud-backed)

- Storage abstraction for skill persistence
- Optional cloud sync for skill sharing across users

### Enterprise identity (OIDC)

- Authorization Code Flow + PKCE via dedicated login window
- Tokens stored in keychain

### Auditing + SIEM export

- Encrypted log storage in SQLite
- Hash chain integrity
- Optional encrypted HTTP shipper

## Getting started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Run (dev)

```bash
npm run dev
```

### Mock SaaS (for E2E)

Mock SaaS runs on `http://localhost:3000`.

```bash
npm install
npm run dev
```

Run those commands inside `mock-saas/`.

## Configuration

### LLM settings

In-app:

- Open the menu (top right)
- Settings
- Configure provider/base URL/model
- Paste API key (stored via Keytar)

### Remote policy sync

Optional env vars:

- `POLICY_REMOTE_URL` (remote policy JSON)
- `POLICY_DEV_OVERRIDE_SECRET` (seeds dev override token into keychain)

### Cloud skill library

Optional env vars:

- `SKILL_CLOUD_BASE_URL`
- `SKILL_CLOUD_API_KEY` (optional; otherwise Bearer token from OIDC)
- `SKILL_EMBEDDING_MODE=local|openai`

### OIDC identity (enterprise)

Env vars:

- `OIDC_ISSUER_URL`
- `OIDC_CLIENT_ID`
- `OIDC_REDIRECT_URI` (defaults to `enterprisebrowser://auth/callback`)
- `OIDC_SCOPE` (defaults to `openid profile email`)

### SIEM shipper

Optional env vars:

- `AUDIT_SHIPPER_URL`
- `AUDIT_SHIPPER_API_KEY`
- `AUDIT_SHIP_INTERVAL_MS`
- `AUDIT_RETENTION_DAYS`

## Testing

```bash
npm run test:unit
npm run test:e2e
```

E2E tests expect:

- App dev server on `http://localhost:5173`
- Mock SaaS on `http://localhost:3000`

## Docs

- Design system: `design.md`
- TOON summaries: `docs/toon-summary.md`
- Architecture diagrams: `docs/design.md`
