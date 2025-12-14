# Task List: CargoFlow Implementation

**Application:** CargoFlow
**Route:** `/aerocore/cargo`
**Role:** Logistics and Supply Chain Management.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize CargoFlow Structure
- [x] Create `src/aerocore/pages/cargo`.
- [x] Create `CargoPage.tsx`.
- [x] Register route in `App.tsx`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Active Shipments" Dashboard
- [x] Create `shipments` array in Global Store (Order ID, Origin, Destination, Status, Customer).
- [x] Display in DataGrid.
- [x] Statuses: Pending, Processing, In-Transit, Delivered.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Create Shipment" Form
- [x] Modal form.
- [x] Fields: Sender, Receiver, Weight (kg), Priority (Standard/Express).
- [x] On save, add to `shipments`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Route Optimizer" Mock
- [ ] View details of a shipment.
- [ ] Button "Optimize Route".
- [ ] Shows a spinner, then displays a mock route (e.g., "Warehouse A -> Hub B -> Customer").
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Dispatch to Drone" Action
- [ ] "One-click Dispatch" for urgent small packages.
- [ ] Logic: Checks if a drone is available in FleetForge (mock check).
- [ ] Updates shipment status to "In-Transit".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Warehouse Inventory" View
- [ ] Simple table of items in stock at the hub.
- [ ] Columns: SKU, Name, Quantity, Zone.
- [ ] Agent Task: "Check stock of Medical Kits".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Customer Manifest" Search
- [ ] Global search bar specific to Cargo.
- [ ] Enter "Customer Name" -> Filter shipments.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Delivery Exception" Handling
- [x] Button on a shipment "Report Issue" (Lost, Damaged).
- [x] Updates status to "Exception".
- [x] Flags it red in the UI.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Proof of Delivery"
- [ ] For "Delivered" items, clicking detail shows a mock "Signature" image.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review
- [ ] Test the Create -> Dispatch -> Delivered flow.
- [ ] Verify `data-testid` on all inputs and buttons.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
