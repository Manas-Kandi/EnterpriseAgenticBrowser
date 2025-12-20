---
name: aerocore-cargo
description: Manage shipments and logistics in AeroCore CargoFlow. Use when the user wants to create shipments, track packages, view warehouse inventory, or manage cargo logistics operations.
---

# AeroCore CargoFlow (Logistics)

CargoFlow manages cargo shipments, drone dispatch integration, and warehouse inventory.

## Prerequisites

Navigate to CargoFlow first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/cargo"}}
```

## Available Actions

### Create New Shipment

**Selectors:**
- Customer input: `[data-testid=cargo-input-customer]`
- Origin input: `[data-testid=cargo-input-origin]`
- Destination input: `[data-testid=cargo-input-destination]`
- Weight input: `[data-testid=cargo-input-weight]`
- Priority select: `[data-testid=cargo-select-priority]`
- Submit button: `[data-testid=cargo-submit-btn]`

**Priority Levels:** `Standard`, `Express`

**Example - Create Standard Shipment:**
```json
{"tool": "browser_execute_plan", "args": {"steps": [
  {"action": "click", "selector": "button:has-text('New Shipment')"},
  {"action": "type", "selector": "[data-testid=cargo-input-customer]", "value": "TechCorp Industries"},
  {"action": "type", "selector": "[data-testid=cargo-input-origin]", "value": "Warehouse A"},
  {"action": "type", "selector": "[data-testid=cargo-input-destination]", "value": "Sector 7"},
  {"action": "type", "selector": "[data-testid=cargo-input-weight]", "value": "5.5"},
  {"action": "select", "selector": "[data-testid=cargo-select-priority]", "value": "Standard"},
  {"action": "click", "selector": "[data-testid=cargo-submit-btn]"},
  {"action": "wait", "text": "ORD-"}
]}}
```

## Shipment Statuses

- `Pending` - Awaiting processing
- `Processing` - Being prepared
- `In-Transit` - On the way (drone assigned)
- `Delivered` - Successfully completed
- `Exception` - Issue encountered

## Dashboard Features

### Active Shipments
DataGrid showing all shipments with:
- Order ID (ORD-XXXX format)
- Customer name
- Origin and destination
- Status
- Priority
- Weight
- Estimated delivery

### Warehouse Inventory
Tab-based view of inventory items across warehouses.

### AI Route Optimizer
Mock feature for optimizing delivery routes.

### Drone Dispatch Integration
Assign drones to shipments for delivery.
