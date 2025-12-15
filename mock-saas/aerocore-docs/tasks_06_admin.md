# Task List: AeroAdmin Completion

**Application:** AeroAdmin
**Route:** `/aerocore/admin`
**Role:** System Administration and User Management.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Review Existing Implementation
- [x] Review `AdminPage.tsx`.
- [x] Ensure it uses the Global Store correctly.
- [x] Verify `data-testid` coverage.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Edit User" Workflow
- [x] The "Edit" button currently does nothing.
- [x] Wire it to open the Modal pre-filled with user data.
- [x] Handle "Update" action in Reducer (`UPDATE_USER`).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Deactivate User"
- [x] Add "Deactivate" / "Delete" button.
- [x] Update status to 'Inactive'.
- [x] Visual indication (greyed out row).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Role Permissions" Matrix
- [x] New Tab: "Permissions".
- [x] Grid of Roles (Admin, Pilot) vs Apps (Dispatch, Fleet).
- [x] Checkboxes (mock functionality is fine, visual is key).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Audit Logs"
- [ ] New Tab: "System Logs".
- [ ] List of "User X did Action Y at Time Z".
- [ ] Mock some data.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Password Reset"
- [x] Action on User row: "Reset Password".
- [x] Shows a temporary password in a toast/modal.
- [x] Agent Task: "Reset password for user John".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "System Health" Widget
- [x] Add a dashboard widget showing "Server Status", "Database Latency".
- [x] Visual graphs (can be static SVGs or simple CSS bars).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Global Settings"
- [x] Form for "Company Name", "Timezone", "Security Level" (Low/Med/High).
- [x] Save to a new `settings` slice in Global Store (optional, or just local state).
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Batch Actions"
- [x] Add checkboxes to User List rows.
- [x] "Bulk Deactivate", "Bulk Email".
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Polish
- [x] Ensure the "Admin" badge looks distinct.
- [x] Verify search filtering works perfectly.
- [x] Run a comprehensive review of the implementation and make sure it is ok.
- [x] Write a clear comprehensive commit message, git commit and push.
