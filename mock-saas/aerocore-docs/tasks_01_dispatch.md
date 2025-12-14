# Task List: AeroDispatch Implementation

**Application:** AeroDispatch
**Route:** `/aerocore/dispatch`
**Role:** Operations Command Center for managing incidents and deploying drones.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize Dispatch Structure
- [ ] Create directory `src/aerocore/pages/dispatch`.
- [ ] Create `DispatchPage.tsx` with a basic layout skeleton using `AeroShell` context.
- [ ] Register route in `App.tsx` (if not already properly linked).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Incident Map" Placeholder
- [ ] Create `IncidentMap.tsx` component.
- [ ] Style it as a large grid or canvas area representing a "Sector Map".
- [ ] Add mock "Drone" and "Incident" markers (using absolute positioning or CSS Grid).
- [ ] Ensure it fits the "Industrial Futurism" aesthetic (dark map, neon markers).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Active Incidents" List
- [ ] Create `IncidentList.tsx` component.
- [ ] Connect to `GlobalStore` to fetch `state.incidents`.
- [ ] Render incidents in a `DataGrid` (refer to Design System).
- [ ] Add `data-testid="dispatch-incident-row-[id]"` for agent accessibility.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement Incident Detail View
- [ ] Create a "Slide-over" or "Right Panel" for viewing incident details when a row is clicked.
- [ ] Display fields: ID, Type, Priority, Location, Description, Assigned Drone.
- [ ] Add action buttons: "Assign Drone", "Resolve Incident", "Escalate".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Create Incident" Workflow
- [ ] Create a modal `CreateIncidentModal.tsx`.
- [ ] Form fields: Type (Select), Priority (Select), Location (Text), Description (Textarea).
- [ ] Add `data-testid` for all inputs (e.g., `dispatch-input-location`).
- [ ] Dispatch `ADD_INCIDENT` action to Global Store on submit.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement Drone Selection Logic
- [ ] In the Incident Detail view, implement "Assign Drone".
- [ ] Show a list of available drones (filter `state.drones` where status === 'Ready').
- [ ] clicking a drone should dispatch `UPDATE_INCIDENT` (assign drone) and `UPDATE_DRONE` (set status to 'In-Flight').
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement Real-time Status Filters
- [ ] Add filter tabs to the Incident List: "All", "New", "Dispatched", "Resolved".
- [ ] Implement filtering logic.
- [ ] Add `data-testid` to filter tabs (e.g., `dispatch-filter-new`).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Add "Emergency Broadcast" Action
- [ ] Add a global "Broadcast Alert" button in the header of the Dispatch app.
- [ ] This simulates sending a message to all pilots (visual toast or mock notification).
- [ ] Good for testing Agent's ability to find "Critical" actions.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Polish & Data Integration
- [ ] Ensure the Map updates visually when an incident status changes (e.g., red marker turns green).
- [ ] Add empty states for the list if no incidents exist.
- [ ] Verify all colors match `01_DESIGN_SYSTEM.md`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Integration Review
- [ ] Verify navigation from AeroAdmin to AeroDispatch.
- [ ] Verify that creating an incident updates the Global Store correctly.
- [ ] Verify Agent can "See" the incidents using `browser_observe`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
