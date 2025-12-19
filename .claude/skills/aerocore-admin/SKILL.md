---
name: aerocore-admin
description: Manage users in the AeroCore Admin Console. Use when the user wants to create, edit, or manage users, view user statistics, or perform administrative tasks in AeroCore.
---

# AeroCore Admin Console

The Admin Console manages system users, roles, and permissions for the AeroCore platform.

## Prerequisites

Navigate to Admin Console first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/admin"}}
```

## Available Actions

### Create New User

**Selectors:**
- Create button: `[data-testid=admin-create-user-btn]`
- Name input: `[data-testid=admin-input-name]`
- Email input: `[data-testid=admin-input-email]`
- Role select: `[data-testid=admin-select-role]`
- Submit button: `[data-testid=admin-submit-user]`

**Available Roles:** `Pilot`, `Dispatcher`, `Admin`, `Manager`, `Security`

**Steps:**
1. Click the "New User" button
2. Fill in the name field
3. Fill in the email field
4. Select the role
5. Click submit
6. Wait for the user name to appear in the table

**Example - Create a Pilot:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=admin-create-user-btn]"},
  {"action": "type", "selector": "[data-testid=admin-input-name]", "value": "John Smith"},
  {"action": "type", "selector": "[data-testid=admin-input-email]", "value": "john@aerocore.com"},
  {"action": "select", "selector": "[data-testid=admin-select-role]", "value": "Pilot"},
  {"action": "click", "selector": "[data-testid=admin-submit-user]"},
  {"action": "wait", "text": "John Smith"}
]}}
```

### Edit User

**Selector:** `[data-testid=admin-edit-user-{userId}]`

Click the edit button for a specific user to modify their details.

### View User Statistics

The Admin Console displays:
- Total Users count
- Active Pilots count
- Dispatchers count
- Admins count

These are visible in the stats cards at the top of the page.

## User Table

The user table shows:
- User name and email
- Role (with color-coded badge)
- Status (Active/Inactive)
- Edit action button

**User name selector:** `[data-testid=user-name-{userId}]`
