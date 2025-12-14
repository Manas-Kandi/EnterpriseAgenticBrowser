# AeroCore Systems: Ecosystem Overview

## 1. Vision & Objectives
AeroCore Systems is a fictional enterprise software suite designed to simulate the complexities of a modern, autonomous logistics and security company. 

**Primary Goal:** To provide a rich, interconnected environment for testing Agentic AI capabilities. The suite challenges agents with:
- **Multi-step workflows** across different applications (e.g., receiving a security alert and dispatching a drone).
- **Context switching** between domain-specific UIs.
- **Data consistency** verification across separate modules.
- **Role-based access control** navigation.

## 2. The Ecosystem
The suite consists of 8 specialized applications that share a common data layer (Global Store) but operate as distinct "products" within the platform.

### A. Operations Command (Real-time)
1.  **AeroDispatch:** The "911" center. Handles incoming incidents, assigns drones, and monitors active missions.
2.  **FleetForge:** Asset management. Tracks physical drone inventory, battery health, maintenance cycles, and firmware updates.
    *Interaction:* Dispatch checks Fleet for available drones. Fleet marks drones "In-Flight" when Dispatch assigns them.

### B. Enterprise Resources (Administrative)
3.  **WorkforceHub (HR):** Manages pilots, security officers, and dispatchers. Tracks shifts, certifications, and payroll.
    *Interaction:* Dispatch requires an active "Shift" in WorkforceHub to allow manual overrides.
4.  **CargoFlow (Logistics):** Manages customer orders, packages, and delivery manifests.
    *Interaction:* A "Delivery" mission in Dispatch is triggered by an Order in CargoFlow.

### C. Security & Infrastructure (Monitoring)
5.  **SecurePerimeter:** Surveillance network. Monitors camera feeds (static images) and IoT sensors.
    *Interaction:* A sensor trip in SecurePerimeter automatically creates a "Security Incident" in Dispatch.
6.  **AeroAdmin:** System configuration. User management, role assignment, and system-wide settings.
    *Interaction:* Controls who can access which application.

### D. External & Intelligence (Reporting)
7.  **ClientPortal:** Customer-facing interface for tracking shipments and requesting security patrols.
    *Interaction:* Requests here appear as "Pending" in CargoFlow or Dispatch.
8.  **DataLake:** Analytics suite. Aggregates data from all apps to generate reports on fleet efficiency, incident response times, etc.

## 3. Core Architecture
- **Shared State:** A React Context (`store.tsx`) holds the "Truth" (Users, Drones, Incidents, Orders).
- **Separation of Concerns:** Each app resides in `src/aerocore/pages/[app_name]` and has its own local components.
- **Unified Shell:** `AeroShell` provides consistent navigation and user context.

## 4. Agentic Workflow Examples
- **"Breach Response":** 
    1. Agent detects alert in **SecurePerimeter**.
    2. Agent switches to **AeroDispatch** to create an incident.
    3. Agent checks **FleetForge** for the nearest 'Ready' drone.
    4. Agent assigns drone to incident in **AeroDispatch**.
- **"Pilot Onboarding":**
    1. Agent creates user in **AeroAdmin**.
    2. Agent assigns shift in **WorkforceHub**.
    3. Agent verifies user can login (simulated).
