# AeroCore Systems Implementation Plan

## 1. Overview
AeroCore Systems is a comprehensive mock enterprise suite simulating an autonomous logistics and security company. It consists of 8 interconnected applications designed to test agentic browser capabilities in handling complex, multi-domain workflows.

## 2. Design System: "AeroUI"
**Aesthetic:** Industrial Futurism. Clean, high-contrast, data-dense.

### Colors
- **Primary (Core Blue):** `bg-slate-900` (Background), `text-sky-400` (Accents)
- **Secondary (Status):**
  - Success: `text-emerald-400`
  - Warning: `text-amber-400`
  - Critical: `text-rose-500`
- **Surface:** `bg-slate-800` (Cards), `bg-slate-950` (App Background)
- **Text:** `text-slate-100` (Primary), `text-slate-400` (Secondary)

### Typography
- **Headings:** Sans-serif (Inter/System), Uppercase tracking-wide for section headers.
- **Data:** Monospace for IDs, coordinates, and telemetry.

### Core Components (Shared)
1.  **AeroShell:** Unified layout with "App Switcher" (9-dot menu) and Global Search.
2.  **DataGrid:** High-density table with sorting/filtering (Agent-friendly `data-testid`).
3.  **StatusBadge:** Uniform status indicators.
4.  **MetricCard:** Key Performance Indicator display.

## 3. Application Suite

### A. Core Operations
1.  **AeroDispatch** (`/aerocore/dispatch`)
    - **Role:** 911-style Command Center.
    - **Features:** Live Map (Mocked), Active Incident List, Drone Deployment Controls.
    - **Agent Tasks:** "Deploy drone X to coordinates Y", "Prioritize Incident #123".

2.  **FleetForge** (`/aerocore/fleet`)
    - **Role:** Asset Management & Maintenance.
    - **Features:** Drone Inventory, Maintenance Schedules, Firmware Updates.
    - **Agent Tasks:** "Schedule maintenance for Drone X", "Check battery health of Fleet A".

### B. Enterprise Resource Planning
3.  **WorkforceHub** (`/aerocore/hr`)
    - **Role:** Human Resources & Scheduling.
    - **Features:** Pilot Rosters, Shift Scheduling, Certification Tracking.
    - **Agent Tasks:** "Assign Pilot John to Night Shift", "Renew certification for Jane".

4.  **CargoFlow** (`/aerocore/cargo`)
    - **Role:** Logistics & Supply Chain.
    - **Features:** Package Manifests, Route Optimization, Customer Orders.
    - **Agent Tasks:** "Find package #999", "Reroute delivery to Warehouse B".

### C. Security & Admin
5.  **SecurePerimeter** (`/aerocore/security`)
    - **Role:** Surveillance Network.
    - **Features:** Camera Feeds (Static Images), Breach Alerts, Access Logs.
    - **Agent Tasks:** "Flag breach at Sector 7", "Review access logs for User X".

6.  **AeroAdmin** (`/aerocore/admin`)
    - **Role:** System Administration.
    - **Features:** User Management, Role Assignment, System Health.
    - **Agent Tasks:** "Create new user account", "Reset password", "Grant 'Dispatch' access".

### D. External & Data
7.  **ClientPortal** (`/aerocore/portal`)
    - **Role:** Customer Facing.
    - **Features:** Track Shipment, Request Service, Billing.
    - **Agent Tasks:** "Check status of order #555".

8.  **DataLake** (`/aerocore/data`)
    - **Role:** Analytics & Reporting.
    - **Features:** Aggregated Dashboards, Export Reports (CSV/PDF simulation).
    - **Agent Tasks:** "Generate weekly fleet report".

## 4. End-to-End Implementation Plan

### Phase 1: Foundation (Current Sprint)
- [ ] Create `src/aerocore` directory structure.
- [ ] Implement `GlobalStore` (React Context) for shared state (Users, Drones, Incidents).
- [ ] Build **AeroShell** (Layout with App Switcher).
- [ ] Implement **AeroAdmin** (User Management) as the first app.
- [ ] Update `App.tsx` to include `/aerocore/*` routes.

### Phase 2: Operations
- [ ] Implement **AeroDispatch** (Incident Management).
- [ ] Implement **FleetForge** (Inventory).
- [ ] Connect Dispatch & Fleet (Deploying a drone updates its status in Fleet).

### Phase 3: Enterprise Layers
- [ ] Implement **WorkforceHub** & **CargoFlow**.
- [ ] Implement **SecurePerimeter**.
- [ ] Add cross-app workflows (e.g. Security Breach -> Auto-create Dispatch Incident).

### Phase 4: Polish & Data
- [ ] Implement **DataLake** & **ClientPortal**.
- [ ] comprehensive `data-testid` review for Agent reliability.

## 5. Technical Architecture
- **State:** `src/aerocore/lib/store.tsx` (Context API + useReducer).
- **Data Seed:** `src/aerocore/lib/seed.ts` (Initial mock data).
- **Routing:** Nested Routes in `App.tsx`.
