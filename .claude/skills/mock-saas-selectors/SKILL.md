---
name: mock-saas-selectors
description: Complete reference of all data-testid selectors in Mock SaaS. Use when you need to find the correct selector for any UI element in AeroCore, Jira, Trello, or Confluence.
---

# Mock SaaS Selector Reference

Complete reference of all `data-testid` selectors available in the Mock SaaS suite at `localhost:3000`.

## AeroCore Navigation

```
[data-testid=aero-nav-admin]      → Admin Console
[data-testid=aero-nav-dispatch]   → Dispatch Command
[data-testid=aero-nav-fleet]      → Fleet Management
[data-testid=aero-nav-security]   → SecurePerimeter
[data-testid=aero-nav-hr]         → WorkforceHub
[data-testid=aero-nav-logistics]  → CargoFlow
[data-testid=aero-nav-portal]     → Client Portal
```

## Admin Console (`/aerocore/admin`)

```
[data-testid=admin-create-user-btn]    → "New User" button
[data-testid=admin-input-name]         → Full Name input
[data-testid=admin-input-email]        → Email input
[data-testid=admin-select-role]        → Role dropdown (Pilot/Dispatcher/Admin/Manager/Security)
[data-testid=admin-submit-user]        → Submit button
[data-testid=admin-edit-user-{id}]     → Edit button for user
[data-testid=user-name-{id}]           → User name in table
```

## Dispatch (`/aerocore/dispatch`)

```
[data-testid=dispatch-create-btn]      → "Report Incident" button
[data-testid=dispatch-broadcast-btn]   → "Broadcast Alert" button
[data-testid=dispatch-select-type]     → Incident Type (Medical/Security/Fire/Logistics)
[data-testid=dispatch-select-priority] → Priority (Low/Medium/High/Critical)
[data-testid=dispatch-input-location]  → Location input
[data-testid=dispatch-textarea-desc]   → Description textarea
[data-testid=dispatch-submit-incident] → Submit button
```

## Cargo (`/aerocore/cargo`)

```
[data-testid=cargo-input-customer]     → Customer/Sender input
[data-testid=cargo-input-origin]       → Origin input
[data-testid=cargo-input-destination]  → Destination input
[data-testid=cargo-input-weight]       → Weight input (kg)
[data-testid=cargo-select-priority]    → Priority (Standard/Express)
[data-testid=cargo-submit-btn]         → Submit button
```

## Security (`/aerocore/security`)

```
[data-testid=simulate-breach-button]   → Debug: Simulate Breach
[data-testid=deploy-drone-button]      → Deploy Drone (visible during ALERT)
[data-testid=camera-{id}]              → Camera feed (1-6)
[data-testid=sensor-log]               → Sensor log container
```

## Jira (`/jira`)

```
[data-testid=jira-create-button]       → "Create" button in nav
[data-testid=jira-create-issue-button] → "Create issue" in column
[data-testid=jira-summary-input]       → Issue summary input
[data-testid=jira-status-select]       → Status dropdown (To Do/In Progress/Done)
[data-testid=jira-submit-create]       → Submit button
[data-testid=jira-column-todo]         → "To Do" column
[data-testid=jira-column-in-progress]  → "In Progress" column
[data-testid=jira-column-done]         → "Done" column
[data-testid=jira-issue-card-{key}]    → Issue card (e.g., PROJ-1)
[data-testid=jira-issue-summary]       → Issue summary text
```

## Usage Tips

1. **Always use data-testid selectors** when available - they're stable and won't change with styling updates.

2. **For dynamic IDs**, replace `{id}` or `{key}` with the actual value:
   - `[data-testid=admin-edit-user-u1]`
   - `[data-testid=jira-issue-card-PROJ-1]`

3. **Fallback selectors** when data-testid isn't available:
   - `button:has-text('Button Text')` - Match by visible text
   - `input[placeholder="..."]` - Match by placeholder
   - `.class-name` - Match by CSS class (less stable)

4. **Wait for verification** - Always end multi-step plans with a `wait` action to verify success.
