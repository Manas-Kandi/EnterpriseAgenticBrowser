---
name: aerocore-hr
description: Manage personnel in AeroCore WorkforceHub (HR). Use when the user wants to view personnel, manage shifts, onboard new hires, or handle certifications and scheduling.
---

# AeroCore WorkforceHub (HR)

WorkforceHub manages human resources including scheduling, certifications, and personnel management.

## Prerequisites

Navigate to WorkforceHub first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/hr"}}
```

## Available Actions

### Add Personnel

Click the "Add Personnel" button to open the onboarding wizard.

The wizard has 3 steps:
1. **Personal Information** - Name and email
2. **Role Selection** - Choose from Pilot, Dispatcher, Security, Manager
3. **Initial Certifications** - Select applicable certifications

### Manage Shifts

The shift scheduler shows personnel with their current shift assignments:
- Morning (06:00 - 14:00)
- Afternoon (14:00 - 22:00)
- Night (22:00 - 06:00)
- Off Duty

### Renew Certifications

For personnel with expiring certifications, use the renewal modal.

## Dashboard Statistics

- **Total Personnel**: Count of all non-admin users
- **Active Shifts**: Personnel currently on duty
- **Certified Pilots**: Pilots with valid certifications

## Personnel Roles

| Role | Icon | Description |
|------|------|-------------|
| Pilot | ✈️ | Drone operators |
| Dispatcher | 📻 | Incident coordinators |
| Security | 🛡️ | Security personnel |
| Manager | 💼 | Team managers |

## Certifications

Available certifications:
- Pilot License A
- Pilot License B
- Night Flight
- Dispatcher L1
- Crisis Mgmt
- Security Clearance
- First Aid

## Personnel Table

Shows all personnel with:
- Name and role
- Current shift
- Certification status
- Expiry warnings (if applicable)
