# Phase 5: SaaS Platform & White-Labeling

## Problem Statement
SaaS companies and Enterprises today face a "fragmentation" problem. Their employees or customers use dozens of disparate web apps (Jira, Slack, Salesforce, internal dashboards) inside a generic browser (Chrome/Edge) that has no context of their work.

These companies want to offer a **Unified Work Environment**—a "Super App" or "Operating System for Work"—but building a custom browser from scratch is prohibitively expensive.

## The Solution: "Browser-as-a-Platform"
We will transform our Enterprise Browser into a **White-Label Platform**. Companies can deploy their own custom branded instance of our browser, pre-configured with:
1.  **Identity**: Their SSO and user management.
2.  **Context**: Their specific integrations (Connectors) pre-installed.
3.  **Knowledge**: Shared agent skills specific to their workflows.
4.  **Branding**: Their logo, colors, and name.

## Architecture

### 1. The Enterprise Config (`enterprise.config.json`)
Instead of hardcoding "AeroCore", the browser will look for a config file at build/runtime.
```json
{
  "company": {
    "name": "Acme Logistics",
    "slug": "acme-logistics",
    "branding": {
      "logoUrl": "...",
      "primaryColor": "#0052CC",
      "windowTitle": "Acme WorkOS"
    }
  },
  "modules": {
    "vault": true,
    "agent": {
      "persona": "You are the Acme Logistics Assistant.",
      "allowedDomains": ["acme.com", "salesforce.com"]
    }
  },
  "connectors": ["jira-v2", "slack-v1", "custom-dispatch-api"]
}
```

### 2. The Connector Protocol
A standardized interface for plugins that allows the Agent to understand external apps *without* generic DOM scraping.
-   **Manifest**: `agent-manifest.json` at the root of SaaS apps.
-   **API**: Standard hooks for `search`, `create`, `read`.

### 3. "Teach Me" Onboarding
A workflow where users can "record" an action to teach the agent a new skill, which is then verified and shared with the entire organization.

## Task Breakdown

### Milestone 1: The Entry Point
- [ ] **Task 5.1**: Update `OnboardingPage.tsx` to include a "SaaS Platform" entry point.
- [ ] **Task 5.2**: Create a "SaaS Admin Portal" (Mock) page where a hypothetical admin can generate their `enterprise.config.json`.

### Milestone 2: Dynamic Configuration
- [ ] **Task 5.3**: Implement `EnterpriseConfigService` in Electron.
    -   Reads `enterprise.config.json` (or defaults to standard).
    -   Updates `BrowserWindow` title and icon based on config.
    -   Injects branding colors into the React App.

### Milestone 3: The "Teach Me" Workflow
- [ ] **Task 5.4**: Create `TeachMeService` (frontend wrapper for `TaskKnowledgeService`).
- [ ] **Task 5.5**: Build the "Record Workflow" UI component.
    -   Overlay that captures clicks/types.
    -   Allows user to annotate steps ("This is where I approve the request").
    -   Saves to `TaskKnowledgeService`.

### Milestone 4: Connector Architecture
- [ ] **Task 5.6**: Refactor `MockJiraConnector` into a generic `Plugin` class.
- [ ] **Task 5.7**: Create a "Plugin Registry" that loads plugins defined in the config.

## Success Criteria
1.  User can select "SaaS Platform" on onboarding.
2.  User can "configure" a fictional company (e.g., "CyberDyne Systems").
3.  Browser reloads with "CyberDyne" branding and context.
4.  User can teach the agent a new "CyberDyne" specific task.
