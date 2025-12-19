---
name: aerocore-portal
description: Use the AeroCore Client Portal for tracking shipments, requesting services, viewing invoices, and contacting support. Use when the user wants to track a package, request a security patrol or delivery, or interact with the client-facing portal.
---

# AeroCore Client Portal

The Client Portal provides customer-facing features for tracking shipments and requesting services.

## Prerequisites

Navigate to Client Portal first:
```json
{"tool": "browser_navigate", "args": {"url": "http://localhost:3000/aerocore/portal"}}
```

## Available Actions

### Track Shipment

Enter a tracking number (e.g., ORD-001) in the search box and click "Track".

Shows:
- Shipment status with progress bar
- Origin and destination
- Estimated delivery
- Live tracking map
- Shipment details (weight, priority, customer)

### Request Service

Submit a service request for:
- **Security Patrol** - Request security presence at a location
- **Urgent Delivery** - Request expedited logistics

**Form Fields:**
- Service Type toggle (Patrol / Delivery)
- Location input
- Date & Time picker

### View Recent Orders

Click on any order in the "Recent Orders" list to view its tracking details.

### View Invoices

Shows billing history with:
- Invoice ID
- Date
- Amount
- Status (Paid/Pending)
- PDF download option

### Contact Support

Click "Open Support Chat" to start a live chat session with support.

## Dashboard Components

| Component | Description |
|-----------|-------------|
| Track Shipment | Hero search for tracking numbers |
| Request Service | Form for patrol/delivery requests |
| Recent Orders | List of customer's shipments |
| Notifications | System alerts and updates |
| Invoices | Billing history |
| Support | Live chat widget |

## Mock Client

The portal displays as logged in for:
- **Company**: TechCorp Industries
- **Account**: TC-9001
- **Plan**: Enterprise
