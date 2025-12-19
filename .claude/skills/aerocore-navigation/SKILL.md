---
name: aerocore-navigation
description: Navigate to any AeroCore Mock SaaS page. Use when the user wants to open, go to, or navigate to any AeroCore module (Admin, Dispatch, Fleet, HR/Workforce, Cargo, Security, Portal) or legacy apps (Jira, Trello, Confluence).
---

# AeroCore Navigation

Navigate to any page in the AeroCore Mock SaaS suite at `localhost:3000`.

## Quick Reference

| Module | URL | Command |
|--------|-----|---------|
| Admin Console | `/aerocore/admin` | `browser_navigate` to `http://localhost:3000/aerocore/admin` |
| Dispatch Command | `/aerocore/dispatch` | `browser_navigate` to `http://localhost:3000/aerocore/dispatch` |
| Fleet Management | `/aerocore/fleet` | `browser_navigate` to `http://localhost:3000/aerocore/fleet` |
| WorkforceHub (HR) | `/aerocore/hr` | `browser_navigate` to `http://localhost:3000/aerocore/hr` |
| CargoFlow | `/aerocore/cargo` | `browser_navigate` to `http://localhost:3000/aerocore/cargo` |
| SecurePerimeter | `/aerocore/security` | `browser_navigate` to `http://localhost:3000/aerocore/security` |
| Client Portal | `/aerocore/portal` | `browser_navigate` to `http://localhost:3000/aerocore/portal` |
| Jira | `/jira` | `browser_navigate` to `http://localhost:3000/jira` |
| Trello | `/trello` | `browser_navigate` to `http://localhost:3000/trello` |
| Confluence | `/confluence` | `browser_navigate` to `http://localhost:3000/confluence` |

## Sidebar Navigation

Once inside AeroCore, you can also navigate using the sidebar:

```
Selector: [data-testid=aero-nav-{module}]
```

Where `{module}` is: `admin`, `dispatch`, `fleet`, `security`, `hr`, `logistics`, `portal`

## Examples

### Navigate to Admin Console
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/admin"}}
```

### Navigate to Dispatch
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/dispatch"}}
```

### Navigate using sidebar (when already in AeroCore)
```json
{"tool": "browser_click", "args": {"selector": "[data-testid=aero-nav-fleet]"}}
```
