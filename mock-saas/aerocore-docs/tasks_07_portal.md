# Task List: ClientPortal Implementation

**Application:** ClientPortal
**Route:** `/aerocore/portal`
**Role:** Customer-facing shipment tracking and service requests.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize Portal Structure
- [ ] Create `src/aerocore/pages/portal`.
- [ ] Create `PortalPage.tsx`.
- [ ] Note: This app might look different (lighter theme?) or stay consistent. Let's keep it "AeroUI" for consistency but maybe simplified.
- [ ] Register route in `App.tsx`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Track Shipment" Hero
- [ ] Large search input "Enter Tracking Number".
- [ ] On enter: Searches `state.shipments` (Global Store).
- [ ] Displays status visually (Progress Bar).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Shipment Details" Card
- [ ] Show map (static image) of route.
- [ ] Show ETA.
- [ ] Show "Drone ID" if airborne.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Request Service" Form
- [ ] Form to "Request Security Patrol" or "Urgent Delivery".
- [ ] Fields: Location, Type, Date.
- [ ] Submit -> Creates a "Pending Request" (can be mock, or create a 'New' Incident in Dispatch).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "My Account" Dashboard
- [ ] Mock login state for a "Client".
- [ ] List of "Recent Orders".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Notifications"
- [ ] List of alerts: "Your package has arrived", "Patrol scheduled".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Support Chat" Mock
- [ ] Floating chat widget.
- [ ] Agent Task: "Open support chat and ask for help".
- [ ] Auto-reply: "An agent will be with you shortly."
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Invoice History"
- [ ] Table of past payments.
- [ ] Button "Download PDF" (mock toast).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Service Rating"
- [ ] 5-star rating component for completed jobs.
- [ ] Saves to local state.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review
- [ ] Verify the tracking number search works with real IDs from CargoFlow.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
