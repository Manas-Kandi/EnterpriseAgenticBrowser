# Task List: SecurePerimeter Implementation

**Application:** SecurePerimeter
**Route:** `/aerocore/security`
**Role:** Surveillance and Threat Detection.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)
- Only git Commit and Push Changes to the Security Branch!

## Tasks

### Task 1: Initialize Security App Structure
- [x] Create `src/aerocore/pages/security`.
- [x] Create `SecurityPage.tsx`.
- [x] Register route in `App.tsx`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Camera Grid"
- [x] Display 4-6 "Camera Feeds".
- [x] Use static placeholder images (dark industrial settings) with an overlaid "REC" indicator and timestamp.
- [x] Layout: CSS Grid.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Sensor Log" Side Panel
- [x] Scrolling list of text events: "Motion detected - Sector 4", "Door Open - Sector 1".
- [x] Auto-scroll simulation (add a new random log every 10s if possible, or just static list).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Trigger Alert" Mechanism
- [x] Add a hidden/debug button "Simulate Breach".
- [x] When clicked, one camera feed turns Red borders and flashes "ALERT".
- [x] A new log entry is added: "BREACH CONFIRMED".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Dispatch Security Drone" Action
- [x] When a camera is in Alert mode, show a "Deploy Drone" overlay button.
- [x] Clicking it:
    1. Creates a "Security" Incident in Global Store (Dispatch app).
    2. Updates Camera UI to say "Drone En Route".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Access Control" List
- [x] Tab "Access Control".
- [x] List of "Doors" and "Gates".
- [x] Status: Locked / Unlocked.
- [x] Action: Toggle Lock.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Bio-Scan" Mock
- [x] A section showing "Recent Scans".
- [x] Profile photos of Users (from Global Store) with "Authorized" or "Denied".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "System Lockdown"
- [x] Big Red Button: "INITIATE LOCKDOWN".
- [x] Requires confirmation modal.
- [x] Changes UI theme to Red tints (global CSS class or overlay).
- [x] Locks all doors.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Shift Report"
- [x] Button "Generate Shift Report".
- [x] Shows a text summary of all alerts in the last 8 hours.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review
- [x] Test the Breach -> Dispatch workflow.
- [x] Verify `data-testid` for the "Deploy Drone" button (crucial for Agent).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.
