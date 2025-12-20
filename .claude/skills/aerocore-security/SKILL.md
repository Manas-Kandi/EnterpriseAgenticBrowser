---
name: aerocore-security
description: Manage security operations in AeroCore SecurePerimeter. Use when the user wants to monitor cameras, control access points, view bio-scans, simulate security breaches, deploy security drones, or initiate facility lockdown.
---

# AeroCore SecurePerimeter (Security)

SecurePerimeter provides surveillance, threat detection, and access control systems.

## Prerequisites

Navigate to Security first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/security"}}
```

## Available Actions

### Simulate Security Breach (Testing)

**Selector:** `[data-testid=simulate-breach-button]`

Triggers a simulated breach on a random camera for testing purposes.

**Example:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=simulate-breach-button]"},
  {"action": "wait", "text": "ALERT"}
]}}
```

### Deploy Security Drone

When a camera shows ALERT status, deploy a drone to respond.

**Selector:** `[data-testid=deploy-drone-button]`

**Example:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "[data-testid=deploy-drone-button]"},
  {"action": "wait", "text": "DRONE"}
]}}
```

### Initiate System Lockdown

**CRITICAL ACTION** - Locks all access points facility-wide.

Click "INITIATE LOCKDOWN" button, then confirm in the modal.

### Release Lockdown

When lockdown is active, click "Release Lockdown" to restore normal operations.

## Tabs

### Camera Grid
- 6 camera feeds with live status
- Camera selector: `[data-testid=camera-{id}]` (1-6)
- Status indicators: ACTIVE, OFFLINE, ALERT, DRONE_EN_ROUTE

### Access Control
- List of facility access points (doors, gates)
- Toggle lock/unlock status
- Disabled during lockdown

### Bio-Scan
- Recent biometric scan logs
- Shows authorized/denied access attempts
- Scan types: Facial, Fingerprint, Retina

## Sensor Log

**Selector:** `[data-testid=sensor-log]`

Real-time log of all security events with:
- Timestamp
- Message
- Severity (Low, Medium, High, Critical)

## System Status Card

Shows:
- Lockdown Status (NORMAL/ACTIVE)
- Cameras Online count
- Active Incidents count
