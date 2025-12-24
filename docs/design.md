# Architecture Overview

This document describes the core runtime architecture and the enterprise subsystems introduced as part of the v1.0 hardening.

## Process model

```mermaid
flowchart LR
  subgraph Renderer[Renderer (React)]
    UI[UI Components]
    Store[Zustand Store]
  end

  subgraph Main[Electron Main Process]
    Agent[AgentService]
    Tools[ToolRegistry]
    Policy[PolicyService]
    Vault[VaultService (Keytar)]
    Audit[AuditService (SQLite + crypto)]
    Identity[IdentityService (OIDC)]
    Knowledge[TaskKnowledgeService]
    WebAPI[WebAPIService]
  end

  UI -->|IPC via preload| Main
  Store --> UI

  Agent --> Tools
  Tools --> Policy
  Tools --> Audit
  Tools --> Vault

  Knowledge --> WebAPI
  WebAPI --> Identity
  Identity --> Vault
  Audit --> Vault
```

## Identity (OIDC Authorization Code + PKCE)

**Primary files**:

- `electron/services/IdentityService.ts`
- `electron/main.ts` (IPC)
- `electron/preload.ts` (window.identity)

```mermaid
sequenceDiagram
  participant R as Renderer
  participant P as Preload
  participant M as Main
  participant I as IdentityService
  participant W as Login BrowserWindow
  participant IdP as IdP (OIDC)
  participant V as VaultService

  R->>P: window.identity.login()
  P->>M: ipc invoke identity:login
  M->>I: loginWithPopup()
  I->>W: load authorization URL (PKCE)
  W->>IdP: /authorize
  IdP-->>W: redirect to redirect_uri with code
  I->>IdP: POST /token (code_verifier)
  IdP-->>I: tokens
  I->>IdP: GET /userinfo (optional)
  I->>V: store tokens + profile
  M-->>R: profile
```

## Remote policy synchronization

**Primary files**:

- `electron/services/PolicyService.ts`
- `electron/main.ts` (IPC + startup init)

```mermaid
sequenceDiagram
  participant Main
  participant Policy
  participant Remote as Remote Policy Endpoint

  Main->>Policy: init() (load cached first)
  Policy->>Policy: loadCachedRemotePolicy()
  Policy->>Remote: fetchRemotePolicies(url)
  Remote-->>Policy: policy bundle JSON
  Policy->>Policy: validate + apply risk overrides
  Policy->>Policy: save cache
```

### Developer override

`PolicyService.setDeveloperOverride(enabled, token)` checks a Keytar secret (`policy_dev_override_secret`) and allows temporarily bypassing policy decisions.

## Skill sharing (cloud-backed library)

**Primary files**:

- `electron/services/TaskKnowledgeService.ts`
- `electron/services/WebAPIService.ts`

```mermaid
sequenceDiagram
  participant TK as TaskKnowledgeService
  participant Local as LocalJsonSkillStorage
  participant Cloud as CloudSkillStorage
  participant API as WebAPIService

  TK->>Local: getAllSync() (fast startup)
  TK->>Local: getAll() (async normalize)
  TK->>Cloud: getAll() (optional)
  Cloud->>API: GET /skills
  TK->>TK: merge local + remote
  TK->>Local: putAll(merged)
  TK->>Cloud: putAll(merged)
  Cloud->>API: POST /skills/bulk
```

## Auditing and SIEM export

**Primary files**:

- `electron/services/AuditService.ts`
- `electron/main.ts` (periodic ship + rotate)

### Integrity (hash chain)

Each row includes `prev_hash` and `hash`, forming a tamper-evident chain.

### Shipping

When `AUDIT_SHIPPER_URL` is configured:

- Pending logs (where `shipped_at IS NULL`) are batched
- Decrypted payload is re-encrypted with a separate shipper key (`audit_shipper_key`)
- Batches are POSTed to the endpoint

### Retention

Rotation deletes shipped logs older than `AUDIT_RETENTION_DAYS`.
