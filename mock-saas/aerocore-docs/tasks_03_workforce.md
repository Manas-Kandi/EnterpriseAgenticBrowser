# Task List: WorkforceHub Implementation

**Application:** WorkforceHub
**Route:** `/aerocore/hr`
**Role:** Human Resources for scheduling and pilot management.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)
- Git commit and push to workforce-features branch ONLY!

## Tasks

### Task 1: Initialize WorkforceHub Structure
- [x] Create directory `src/aerocore/pages/hr`.
- [x] Create `WorkforcePage.tsx`.
- [x] Register route in `App.tsx`.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Personnel List"
- [x] Fetch `state.users` from Global Store.
- [x] Filter by roles: Pilot, Dispatcher, Security (Hide 'Admin' maybe, or show differently).
- [x] Display in DataGrid: Name, Role, Status, "Current Shift".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Shift Scheduler" UI
- [x] Create a visual "Calendar" or "Timeline" view (mocked).
- [x] Columns: Morning, Afternoon, Night.
- [x] Rows: Pilots.
- [x] Allow dragging/assigning a pilot to a slot (or clicking slot to assign).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Certification Tracker"
- [ ] Extend `User` type in `types.ts` to include `certifications: string[]` and `certExpiry: string`.
- [ ] Display certifications in the Personnel List (e.g., "Drone License A", "Security Clearance").
- [ ] Highlight expired certs in Red.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Cert Renewal" Workflow
- [ ] Add action "Renew Certification" for a user.
- [ ] Modal: Select Cert, Enter New Expiry Date.
- [ ] Update user in Global Store.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "On-Duty" Toggle
- [ ] Add a master switch for each user to mark them "On Duty" or "Off Duty".
- [ ] This affects their availability in AeroDispatch (can only assign incidents to On-Duty pilots - advanced logic).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "Leave Request" Queue
- [ ] Create a mock list of "Pending Leave Requests".
- [ ] Agent Task: "Approve vacation for Pilot X".
- [ ] Actions: Approve / Reject.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Payroll" Preview
- [ ] Read-only view of "Hours Worked" and "Estimated Payout".
- [ ] Simple table.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "New Hire" Onboarding Wizard
- [ ] Multi-step modal:
    1. Personal Info.
    2. Role Selection.
    3. Initial Certifications.
- [ ] Dispatches `ADD_USER`.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Review
- [ ] Ensure Certifications update visually.
- [ ] Ensure "On Duty" status reflects in the list.
- [ ] Verify Agent accessibility (`data-testid`).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
