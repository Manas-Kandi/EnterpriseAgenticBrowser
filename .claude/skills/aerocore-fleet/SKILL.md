---
name: aerocore-fleet
description: Manage drone fleet in AeroCore Fleet Management. Use when the user wants to add drones, view fleet status, check drone details, or manage autonomous drone assets.
---

# AeroCore Fleet Management

FleetForge provides real-time status monitoring and management of autonomous drone assets.

## Prerequisites

Navigate to Fleet Management first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/fleet"}}
```

## Available Actions

### Add New Drone

**Steps:**
1. Click "Add Drone" button
2. Select drone model
3. Select base location
4. Click "Deploy Unit"

**Drone Models:**
- `Sentinel-X` - Surveillance drone (120 km/h, 2kg payload)
- `CargoLifter-9` - Transport drone (80 km/h, 15kg payload)
- `Scout-Mini` - Recon drone (150 km/h, 0.5kg payload)

**Base Locations:**
- `Base Alpha` - HQ
- `Hangar B` - Maintenance
- `Sector 4` - Outpost
- `Sector 7` - Outpost

**Example - Deploy Sentinel-X:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "button:has-text('Add Drone')"},
  {"action": "select", "selector": "select:first-of-type", "value": "Sentinel-X"},
  {"action": "select", "selector": "select:last-of-type", "value": "Base Alpha"},
  {"action": "click", "selector": "button:has-text('Deploy Unit')"},
  {"action": "wait", "text": "Sentinel-X"}
]}}
```

### View Drone Details

Click on any drone row to navigate to its detail page at `/aerocore/fleet/{droneId}`.

## Fleet Statistics

The page displays:
- **Total Drones**: Complete fleet count
- **Ready**: Drones available for deployment
- **Maintenance**: Drones under service

## Drone Statuses

- `Ready` - Available for deployment (green)
- `In-Flight` - Currently on mission (blue)
- `Maintenance` - Under service (amber)
- `Offline` - Not operational (red)

## Drone Table

Shows all drones with:
- Model name
- Status badge
- Battery level indicator
- Current location
- Sortable columns
- Filter by model
