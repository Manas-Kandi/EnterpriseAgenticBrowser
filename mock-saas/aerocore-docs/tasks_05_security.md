# Task List: SecurePerimeter Implementation

**Application:** SecurePerimeter
**Route:** `/aerocore/security`
**Role:** Surveillance and Threat Detection.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Initialize Security App Structure
- [ ] Create `src/aerocore/pages/security`.
- [ ] Create `SecurityPage.tsx`.
- [ ] Register route in `App.tsx`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Camera Grid"
- [ ] Display 4-6 "Camera Feeds".
- [ ] Use static placeholder images (dark industrial settings) with an overlaid "REC" indicator and timestamp.
- [ ] Layout: CSS Grid.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Sensor Log" Side Panel
- [ ] Scrolling list of text events: "Motion detected - Sector 4", "Door Open - Sector 1".
- [ ] Auto-scroll simulation (add a new random log every 10s if possible, or just static list).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Trigger Alert" Mechanism
- [ ] Add a hidden/debug button "Simulate Breach".
- [ ] When clicked, one camera feed turns Red borders and flashes "ALERT".
- [ ] A new log entry is added: "BREACH CONFIRMED".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Dispatch Security Drone" Action
- [ ] When a camera is in Alert mode, show a "Deploy Drone" overlay button.
- [ ] Clicking it:
    1. Creates a "Security" Incident in Global Store (Dispatch app).
    2. Updates Camera UI to say "Drone En Route".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Access Control" List
- [ ] Tab "Access Control".
- [ ] List of "Doors" and "Gates".
- [ ] Status: Locked / Unlocked.
- [ ] Action: Toggle Lock.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Bio-Scan" Mock
- [ ] A section showing "Recent Scans".
- [ ] Profile photos of Users (from Global Store) with "Authorized" or "Denied".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "System Lockdown"
- [ ] Big Red Button: "INITIATE LOCKDOWN".
- [ ] Requires confirmation modal.
- [ ] Changes UI theme to Red tints (global CSS class or overlay).
- [ ] Locks all doors.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Shift Report"
- [ ] Button "Generate Shift Report".
- [ ] Shows a text summary of all alerts in the last 8 hours.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review
- [ ] Test the Breach -> Dispatch workflow.
- [ ] Verify `data-testid` for the "Deploy Drone" button (crucial for Agent).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
