# Task List: AeroAdmin Completion

**Application:** AeroAdmin
**Route:** `/aerocore/admin`
**Role:** System Administration and User Management.

## References
- [Overview](./00_OVERVIEW.md)
- [Design System](./01_DESIGN_SYSTEM.md)

## Tasks

### Task 1: Review Existing Implementation
- [ ] Review `AdminPage.tsx`.
- [ ] Ensure it uses the Global Store correctly.
- [ ] Verify `data-testid` coverage.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 2: Implement "Edit User" Workflow
- [ ] The "Edit" button currently does nothing.
- [ ] Wire it to open the Modal pre-filled with user data.
- [ ] Handle "Update" action in Reducer (`UPDATE_USER`).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 3: Implement "Deactivate User"
- [ ] Add "Deactivate" / "Delete" button.
- [ ] Update status to 'Inactive'.
- [ ] Visual indication (greyed out row).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 4: Implement "Role Permissions" Matrix
- [ ] New Tab: "Permissions".
- [ ] Grid of Roles (Admin, Pilot) vs Apps (Dispatch, Fleet).
- [ ] Checkboxes (mock functionality is fine, visual is key).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 5: Implement "Audit Logs"
- [ ] New Tab: "System Logs".
- [ ] List of "User X did Action Y at Time Z".
- [ ] Mock some data.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 6: Implement "Password Reset"
- [ ] Action on User row: "Reset Password".
- [ ] Shows a temporary password in a toast/modal.
- [ ] Agent Task: "Reset password for user John".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 7: Implement "System Health" Widget
- [ ] Add a dashboard widget showing "Server Status", "Database Latency".
- [ ] Visual graphs (can be static SVGs or simple CSS bars).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 8: Implement "Global Settings"
- [ ] Form for "Company Name", "Timezone", "Security Level" (Low/Med/High).
- [ ] Save to a new `settings` slice in Global Store (optional, or just local state).
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 9: Implement "Batch Actions"
- [ ] Add checkboxes to User List rows.
- [ ] "Bulk Deactivate", "Bulk Email".
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.

### Task 10: Final Polish
- [ ] Ensure the "Admin" badge looks distinct.
- [ ] Verify search filtering works perfectly.
- [ ] Run a comprehensive review of the implementation and make sure it is ok.
- [ ] Write a clear comprehensive commit message, git commit and push.
