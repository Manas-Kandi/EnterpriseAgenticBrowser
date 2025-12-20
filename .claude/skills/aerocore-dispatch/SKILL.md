---
name: aerocore-dispatch
description: Manage incidents and emergency response in AeroCore Dispatch Command Center. Use when the user wants to report incidents, broadcast alerts, view active incidents, or manage emergency dispatch operations.
---

# AeroCore Dispatch Command Center

The Dispatch Command Center monitors active incidents and coordinates fleet response.

## Prerequisites

Navigate to Dispatch first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/dispatch"}}
```

## Available Actions

### Report New Incident

**Selectors:**
- Create button: `[data-testid=dispatch-create-btn]`
- Type select: `[data-testid=dispatch-select-type]`
- Priority select: `[data-testid=dispatch-select-priority]`
- Location input: `[data-testid=dispatch-input-location]`
- Description textarea: `[data-testid=dispatch-textarea-desc]`
- Submit button: `[data-testid=dispatch-submit-incident]`

**Incident Types:** `Medical`, `Security`, `Fire`, `Logistics`

**Priority Levels:** `Low`, `Medium`, `High`, `Critical`

**Example - Report Security Incident:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=dispatch-create-btn]"},
  {"action": "select", "selector": "[data-testid=dispatch-select-type]", "value": "Security"},
  {"action": "select", "selector": "[data-testid=dispatch-select-priority]", "value": "High"},
  {"action": "type", "selector": "[data-testid=dispatch-input-location]", "value": "Sector 4 North Gate"},
  {"action": "type", "selector": "[data-testid=dispatch-textarea-desc]", "value": "Unauthorized access detected"},
  {"action": "click", "selector": "[data-testid=dispatch-submit-incident]"},
  {"action": "wait", "text": "Sector 4"}
]}}
```

### Broadcast Alert

Send an emergency broadcast to all units.

**Selector:** `[data-testid=dispatch-broadcast-btn]`

**Example:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=dispatch-broadcast-btn]"},
  {"action": "wait", "text": "ALERT"}
]}}
```

## Dashboard Components

### Quick Stats
- **Active Incidents**: Count of unresolved incidents
- **Fleet Availability**: Number of drones ready for deployment

### Sector Map
Visual map showing incident locations and drone positions.

### Incident List
List of all incidents with status, priority, and location.

## Incident Statuses

- `New` - Just reported
- `Dispatched` - Drone assigned
- `In Progress` - Being handled
- `Resolved` - Completed
