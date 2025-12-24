# Implementation Roadmap: Enterprise Agentic Browser

This document outlines a comprehensive 10-step plan to evolve the Enterprise Agentic Browser from a functional prototype into a robust, enterprise-ready Operating System for SaaS.

Each task is designed to be executed sequentially or in parallel by an agentic developer.

---

## Task 1: Generalize Browser Automation Selectors
**Goal**: Move beyond `data-testid` reliance to support "wild" web applications (Salesforce, HubSpot, etc.) by implementing semantic and robust selector generation.

**Target Files**:
- `electron/integrations/BrowserAutomationService.ts`
- `electron/services/AgentService.ts`

**Subtasks**:
- [ ] **Analyze Current Selector Logic**: Review `bestSelector` function in `electron/integrations/BrowserAutomationService.ts` to identify current limitations.
- [ ] **Implement Semantic Attribute Scoring**: Modify the selector generation strategy to prioritize `aria-label`, `name`, `placeholder`, and `role` attributes over generic classes.
- [ ] **Add XPath Support**: Extend `BrowserAutomationService.ts` to generate and consume robust XPath expressions for elements lacking unique CSS attributes.
- [ ] **Enhance `browser_observe` Tool**: Update the `browser_observe` tool output to include multiple selector candidates (CSS, XPath, Text) for each interactive element to give the LLM options.
- [ ] **Test against Generic Sites**: Create a test case navigating a non-controlled public site (e.g., HackerNews or Wikipedia) to verify selector robustness.

## Task 2: Implement User-Configurable LLM Settings
**Goal**: Remove hardcoded API configurations and allow users to bring their own keys (BYOK) or connect to local models (Ollama/LM Studio).

**Target Files**:
- `src/lib/store.ts`
- `electron/services/AgentService.ts`
- `src/components/browser/BrowserChrome.tsx`
- `src/components/settings/SettingsModal.tsx` (New)

**Subtasks**:
- [ ] **Create Settings Store**: Update `src/lib/store.ts` to include a `SettingsSlice` for storing LLM provider config (Base URL, Model Name, API Key).
- [ ] **Build Settings UI**: Create `src/components/settings/SettingsModal.tsx` with a form to manage these settings securely.
- [ ] **Secure Key Storage**: Update `electron/services/VaultService.ts` to store API keys in the system keychain instead of `localStorage`.
- [ ] **Update Agent Service**: Modify `electron/services/AgentService.ts` to read configuration from the `VaultService` and `SettingsStore` during initialization instead of environment variables.
- [ ] **Add Model Switching Logic**: Implement dynamic model switching in `AgentService.ts` to support different providers (OpenAI, Anthropic, Local) at runtime.

## Task 3: Enable Session Persistence
**Goal**: Ensure that tab groups, chat history, and browser state survive application restarts.

**Target Files**:
- `src/lib/store.ts`
- `electron/main.ts`
- `electron/preload.ts`

**Subtasks**:
- [ ] **Add Persistence Middleware**: Refactor `src/lib/store.ts` to use `zustand/middleware/persist` for non-sensitive state (Tab Groups, UI Preferences).
- [ ] **Implement File-System Storage**: In `electron/main.ts`, implement a secure file-based storage mechanism (JSON or SQLite) for heavier state like Chat History.
- [ ] **Hydrate State on Startup**: Add logic in `src/App.tsx` to read the persisted state on mount and restore the previous session.
- [ ] **Persist Chat History**: Update `src/components/layout/Sidebar.tsx` to load previous conversation history from the persistent store.

## Task 4: Remote Policy Synchronization
**Goal**: Allow IT administrators to enforce policies remotely, moving beyond the hardcoded local rules.

**Target Files**:
- `electron/services/PolicyService.ts`
- `electron/main.ts`

**Subtasks**:
- [ ] **Define Policy Schema**: Create a JSON schema for Policy Rules (Risk Levels, Domain Allow/Block lists) in `electron/services/PolicyService.ts`.
- [ ] **Implement Sync Method**: Add a `fetchRemotePolicies(url: string)` method to `PolicyService.ts` that retrieves rules from a configured endpoint.
- [ ] **Add Caching Logic**: Implement local caching of policies in `PolicyService.ts` to ensure the browser works offline while maintaining security posture.
- [ ] **Implement Admin Override**: Add a "Developer Mode" override (guarded by a password/secret) in `PolicyService.ts` for local debugging.

## Task 5: Cloud-Backed Shared Skill Library
**Goal**: Transform `TaskKnowledgeService` from a local JSON file to a shared vector database, allowing skills learned by one user to be used by all.

**Target Files**:
- `electron/services/TaskKnowledgeService.ts`
- `electron/services/WebAPIService.ts`

**Subtasks**:
- [ ] **Abstract Storage Interface**: Refactor `TaskKnowledgeService.ts` to separate the storage logic (currently `fs.readFileSync`) into a `SkillStorageProvider` interface.
- [ ] **Implement Cloud Provider**: Create a `CloudSkillStorage` class implementing the interface, using `WebAPIService.ts` to communicate with a hypothetical backend.
- [ ] **Add Sync Mechanism**: Implement a synchronization routine in `TaskKnowledgeService.ts` to merge local skills with the remote library on startup.
- [ ] **Enhance Embedding Logic**: Ensure embeddings are computed consistently (or fetched from the cloud) to support cross-user search.

## Task 6: Enterprise Identity Provider (IdP) Integration
**Goal**: Replace mock user objects with real OIDC/SAML authentication.

**Target Files**:
- `electron/services/IdentityService.ts` (New)
- `src/App.tsx`
- `src/components/browser/BrowserChrome.tsx`

**Subtasks**:
- [ ] **Create Identity Service**: Scaffold `electron/services/IdentityService.ts` to handle OIDC flows (Authorization Code Flow).
- [ ] **Implement Login Window**: Create a dedicated `BrowserWindow` in `electron/main.ts` for handling IdP redirects securely.
- [ ] **Secure Token Management**: Use `VaultService.ts` to store Access and Refresh tokens.
- [ ] **Connect UI**: Update `src/components/browser/BrowserChrome.tsx` to trigger the login flow and display the real user's profile picture/name.
- [ ] **Add Auth Headers**: Middleware in `WebAPIService.ts` to automatically inject the Bearer token into outgoing enterprise API requests.

## Task 7: SIEM Log Export & Advanced Auditing
**Goal**: Make audit logs accessible to enterprise security tools (Splunk, Datadog).

**Target Files**:
- `electron/services/AuditService.ts`
- `electron/main.ts`

**Subtasks**:
- [ ] **Define Log Shipper Interface**: Create an interface for log destinations in `AuditService.ts`.
- [ ] **Implement Syslog/HTTP Shipper**: Add a capability to `AuditService.ts` to POST encrypted log batches to a configured HTTP endpoint (mocked for now).
- [ ] **Implement Log Rotation**: Add logic to `AuditService.ts` to archive or delete local SQLite logs after a set period (e.g., 30 days) to save space.
- [ ] **Add Integrity Checks**: Implement a hash chain in the SQLite database to prevent tampering with local logs.

## Task 8: Robust Error Handling & Recovery Loop
**Goal**: Prevent the agent from getting stuck in loops or failing silently.

**Target Files**:
- `electron/services/AgentService.ts`
- `electron/services/AgentRunContext.ts`
- `src/components/browser/AgentPanel.tsx`

**Subtasks**:
- [ ] **Implement Retry Budget**: Add a "retry budget" to `AgentService.ts` for tool calls. If a tool fails, retry X times with exponential backoff.
- [ ] **Add Self-Correction Prompt**: Modify the system prompt in `AgentService.ts` to explicitly include the previous error message in the next step, forcing the model to "reflect" on the failure.
- [ ] **Detect Loops**: Implement a loop detector in `AgentRunContext.ts` that flags if the agent visits the same URL > 3 times or calls the same tool with identical args repeatedly.
- [ ] **Improve User Feedback**: Update `src/components/browser/AgentPanel.tsx` to show distinct UI states for "Retrying", "Recovering", and "Fatal Error".

## Task 9: Comprehensive Testing Suite
**Goal**: Ensure stability across refactors.

**Target Files**:
- `tests/unit/`
- `tests/e2e/`
- `package.json`

**Subtasks**:
- [ ] **Unit Test Services**: Add Jest tests for `PolicyService.ts` (rule evaluation logic) and `TaskKnowledgeService.ts` (embedding search logic).
- [ ] **E2E Agent Tests**: Create a Playwright test in `tests/e2e/` that spins up the app, navigates to the `mock-saas`, and verifies the agent can "Click" a button using the `BrowserAutomationService`.
- [ ] **Mock External APIs**: Setup MSW (Mock Service Worker) or similar in `tests/` to mock OpenAI and GitHub API responses for deterministic testing.
- [ ] **CI Pipeline Config**: Create a `.github/workflows/test.yml` file to run these tests automatically on push.

## Task 10: Final Polish, Documentation & Commit
**Goal**: Prepare the codebase for the "v1.0" tag and handover.

**Target Files**:
- `README.md`
- `docs/`
- `.gitignore`

**Subtasks**:
- [ ] **Update README**: Rewrite `README.md` to reflect the new architecture, setup instructions (including Settings), and feature capabilities.
- [ ] **Document Architecture**: Update `docs/design.md` with the new diagrams for Identity, Policy Sync, and Skill Sharing.
- [ ] **Clean Code**: Run `eslint --fix` across the `electron/` and `src/` directories.
- [ ] **Verify Build**: Run `npm run build` to ensure the Electron app packages correctly for distribution.
- [ ] **Git Commit**: Stage all changes, write a comprehensive commit message detailing the architectural shift, and push to the repository.
