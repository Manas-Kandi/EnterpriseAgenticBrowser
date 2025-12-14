# Task List: FleetForge Implementation

**Application:** FleetForge
**Route:** `/aerocore/fleet`
**Role:** Asset Management for Drone Inventory and Maintenance.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize FleetForge Structure
- [ ] Create directory `src/aerocore/pages/fleet`.
- [ ] Create `FleetPage.tsx` with layout.
- [ ] Register route in `App.tsx`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Drone Fleet" Grid
- [ ] Fetch `state.drones` from Global Store.
- [ ] Create a `DataGrid` to display: ID, Model, Status, Battery, Location.
- [ ] Use "StatusBadge" for the Status column (Ready=Green, Maintenance=Orange).
- [ ] Add `data-testid="fleet-drone-row-[id]"`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement Battery Health Visuals
- [ ] Create a `BatteryIndicator` component.
- [ ] Visual bar: Green (>70%), Orange (30-70%), Red (<30%).
- [ ] Integrate into the Drone Grid.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Drone Detail" View
- [ ] Create a detail view (modal or separate page `/aerocore/fleet/:id`).
- [ ] Show technical specs: Max Speed, Payload Capacity, Firmware Version.
- [ ] Show current mission status (linked Incident ID).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Maintenance Mode" Toggle
- [ ] In Detail View, add a toggle/button "Set to Maintenance".
- [ ] Logic: Updates `status` to 'Maintenance' in Global Store.
- [ ] Prevent this action if status is 'In-Flight'.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Firmware Update" Workflow
- [ ] Add a "Check for Updates" button for each drone.
- [ ] Simulate an async update process (ProgressBar -> Success).
- [ ] Agent Task: "Update firmware for all Sentinel-X drones".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Add New Drone" Form
- [x] Create `AddDroneModal.tsx`.
- [x] Inputs: Model (Select), Base Location (Select).
- [x] Dispatch `ADD_DRONE` (need to add this action to Store reducer first).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Inventory Stats" Dashboard
- [ ] At top of page, show metric cards: "Total Fleet", "Ready to Fly", "In Maintenance".
- [ ] Calculate these live from `state.drones`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Return to Base" Command
- [ ] For drones with status 'In-Flight', add a "Recall" button.
- [ ] Updates status to 'Ready' and Location to 'Base Alpha' (simulated).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review & Polish
- [ ] Verify sorting by Battery Level works.
- [ ] Verify filtering by Model works.
- [ ] Check accessibility of all buttons for the Agent.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
