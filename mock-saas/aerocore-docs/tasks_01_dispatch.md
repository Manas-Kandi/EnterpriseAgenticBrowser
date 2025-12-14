# Task List: AeroDispatch Implementation

**Application:** AeroDispatch
**Route:** `/aerocore/dispatch`
**Role:** Operations Command Center for managing incidents and deploying drones.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize Dispatch Structure
- [x] Create directory `src/aerocore/pages/dispatch`.
- [x] Create `DispatchPage.tsx` with a basic layout skeleton using `AeroShell` context.
- [x] Register route in `App.tsx` (if not already properly linked).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Incident Map" Placeholder
- [x] Create `IncidentMap.tsx` component.
- [x] Style it as a large grid or canvas area representing a "Sector Map".
- [x] Add mock "Drone" and "Incident" markers (using absolute positioning or CSS Grid).
- [x] Ensure it fits the "Industrial Futurism" aesthetic (dark map, neon markers).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Active Incidents" List
- [x] Create `IncidentList.tsx` component.
- [x] Connect to `GlobalStore` to fetch `state.incidents`.
- [x] Render incidents in a `DataGrid` (refer to Design System).
- [x] Add `data-testid="dispatch-incident-row-[id]"` for agent accessibility.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement Incident Detail View
- [x] Create a "Slide-over" or "Right Panel" for viewing incident details when a row is clicked.
- [x] Display fields: ID, Type, Priority, Location, Description, Assigned Drone.
- [x] Add action buttons: "Assign Drone", "Resolve Incident", "Escalate".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Create Incident" Workflow
- [x] Create a modal `CreateIncidentModal.tsx`.
- [x] Form fields: Type (Select), Priority (Select), Location (Text), Description (Textarea).
- [x] Add `data-testid` for all inputs (e.g., `dispatch-input-location`).
- [x] Dispatch `ADD_INCIDENT` action to Global Store on submit.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement Drone Selection Logic
- [x] In the Incident Detail view, implement "Assign Drone".
- [x] Show a list of available drones (filter `state.drones` where status === 'Ready').
- [x] clicking a drone should dispatch `UPDATE_INCIDENT` (assign drone) and `UPDATE_DRONE` (set status to 'In-Flight').
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement Real-time Status Filters
- [x] Add filter tabs to the Incident List: "All", "New", "Dispatched", "Resolved".
- [x] Implement filtering logic.
- [x] Add `data-testid` to filter tabs (e.g., `dispatch-filter-new`).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 8: Add "Emergency Broadcast" Action
- [x] Add a global "Broadcast Alert" button in the header of the Dispatch app.
- [x] This simulates sending a message to all pilots (visual toast or mock notification).
- [x] Good for testing Agent's ability to find "Critical" actions.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 9: Polish & Data Integration
- [x] Ensure the Map updates visually when an incident status changes (e.g., red marker turns green).
- [x] Add empty states for the list if no incidents exist.
- [x] Verify all colors match `01_DESIGN_SYSTEM.md`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Integration Review
- [x] Verify navigation from AeroAdmin to AeroDispatch.
- [x] Verify that creating an incident updates the Global Store correctly.
- [x] Verify Agent can "See" the incidents using `browser_observe`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.
