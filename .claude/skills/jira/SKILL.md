---
name: jira-mock
description: Manage issues in Jira Software (Mock SaaS). Use when the user wants to create Jira issues, view the Kanban board, or manage project tasks.
---

# Jira Software (Mock SaaS)

Jira provides issue tracking with a Kanban board interface.

## Prerequisites

Navigate to Jira first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/jira"}}
```

## Available Actions

### Create New Issue

**Selectors:**
- Create button: `[data-testid=jira-create-button]`
- Summary input: `[data-testid=jira-summary-input]`
- Status select: `[data-testid=jira-status-select]`
- Submit button: `[data-testid=jira-submit-create]`

**Status Options:** `To Do`, `In Progress`, `Done`

**Example - Create Issue:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=jira-create-button]"},
  {"action": "type", "selector": "[data-testid=jira-summary-input]", "value": "Fix authentication bug"},
  {"action": "select", "selector": "[data-testid=jira-status-select]", "value": "To Do"},
  {"action": "click", "selector": "[data-testid=jira-submit-create]"},
  {"action": "wait", "text": "Fix authentication bug"}
]}}
```

## Kanban Board

### Columns
- **To Do**: `[data-testid=jira-column-todo]`
- **In Progress**: `[data-testid=jira-column-in-progress]`
- **Done**: `[data-testid=jira-column-done]`

### Issue Cards
- Card selector: `[data-testid=jira-issue-card-{key}]` (e.g., `jira-issue-card-PROJ-1`)
- Summary text: `[data-testid=jira-issue-summary]`

## Default Issues

The board comes pre-populated with:
- PROJ-1: "Fix login page layout" (To Do, High)
- PROJ-2: "Update API documentation" (In Progress, Medium)
- PROJ-3: "Investigate server crash" (Done, High)

## Issue Properties

Each issue has:
- Key (PROJ-X format)
- Summary
- Status
- Assignee
- Priority (High, Medium, Low)
