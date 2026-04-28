# User Management Design

## Goal

Replace the current partial User Management implementation with a design-aligned, API-ready flow that matches the interaction model of Device Management:

- server-driven listing for pagination, filtering, sorting, and stat-card filtering
- dedicated pages for `Add New User` and `Edit User Details`
- modal flows for `Change Password`, `Manage Access`, and `Activate/Deactivate`
- Redux thunks that use static dummy data for now but preserve the future API contract

## Confirmed Product Decisions

- `Add New User` is a separate page/route.
- `Edit User Details` is a separate page/route.
- `Change Password` opens in a modal from the list page.
- `Manage Access` opens in a modal from the list page.
- `Activate/Deactivate` uses a confirmation modal only and then updates the row/status.
- Pagination, filtering, and sorting should be server-side, following the Device Management pattern.
- Device Management should be used as the behavioral reference for state flow and request construction.

## Current State

The existing User Management page has these gaps:

- pagination and filtering are client-side
- only status update is partially wired
- add/edit user flows are not implemented
- password and access actions are placeholders
- header action is still configured as a modal trigger instead of page navigation

Device Management already demonstrates the intended repository pattern:

- Redux slice stores list filters, current page, total pages, page size, and summary
- list thunk accepts a request object that reflects server-side filters and sorting
- page state triggers refetches on filter, sort, location/stat changes
- list actions refresh data after mutations

## Information Architecture

### Routes

Add the following routes:

- `/user-management`
- `/user-management/create`
- `/user-management/:userId/edit`

### Navigation Behavior

- Header button on `/user-management` navigates to `/user-management/create`
- Table action `Edit User Details` navigates to `/user-management/:userId/edit`
- `Cancel` on create/edit returns to `/user-management`
- successful create returns to list after success acknowledgement
- successful edit returns to `/user-management`

## UX Structure

### 1. User Management List Page

The list page contains:

- three summary stat cards:
  - `Total Users`
  - `Active Users`
  - `Inactive Users`
- header module dropdown:
  - `All Modules`
  - module-specific filters
- server-driven data table
- row action menu

#### Table Columns

- `Emp ID`
- `Employee Name`
- `Email Id`
- `Mobile Number`
- `Password`
- `Location Access`
- `Module Access`
- `Last Logged in`
- `Created On`
- `Created By`
- `Status`
- `Actions`

#### List Behaviors

- filtering is column-based and dispatched to Redux
- sorting is column-based and dispatched to Redux
- page changes dispatch a list refetch
- stat cards apply a server-side status filter
- header module dropdown applies a server-side module filter
- password column supports show/hide per row
- action menu matches the design:
  - `Edit User Details`
  - `Change Password`
  - `Manage Access`
  - `Activate` or `Deactivate`

### 2. Add User Page

The create page contains two content cards.

#### User Details card

Fields:

- `Employee ID`
- `User Name`
- `Email ID`
- `Mobile Number`
- `Password`

#### Access & Permissions card

Display a module access grid similar to the design. Each module block contains:

- module name
- location selector
- selected location chips

Expected modules in dummy data:

- `Ad Management`
- `Ticker Management`
- `Notice Management`
- `Device Management`

Page actions:

- `Cancel`
- `Add User`

On success:

- show success modal
- acknowledge
- navigate back to `/user-management`

### 3. Edit User Details Page

Layout matches the create page and is prefilled from the selected user.

Differences from create:

- primary action label is `Update`
- route loads current user by id
- password field remains visible in the form, matching the supplied design

### 4. Change Password Modal

Modal includes:

- icon header
- title `Change Password`
- supporting description
- `New Password`
- `Confirm New Password`
- show/hide toggles
- actions:
  - `Change Password`
  - `Cancel`

Validation:

- both fields required
- values must match

On success:

- close form modal
- open success modal

### 5. Change Password Success Modal

Display simple acknowledgement UI:

- success icon
- success title
- short description
- `Okay` button

On acknowledgement:

- close modal
- keep user on list page

### 6. Manage Access Modal

Modal includes:

- title and description
- repeated module access blocks
- location selector per module
- location chips per module
- actions:
  - `Cancel`
  - `Update`

On save:

- update user access assignments
- close modal
- refresh list data

### 7. Activate/Deactivate Confirmation Modal

Single confirmation modal only.

Behavior:

- copy reflects target state
- confirm updates status
- cancel closes modal
- no separate success modal
- list refreshes after successful update

## Data Model

The current `ManagedUserRecord` shape is not rich enough for the design. Introduce or extend supporting types for form and access editing while preserving the existing list row requirements.

### List Record Shape

The list record should continue to support:

- `id`
- `empId`
- `employeeName`
- `emailId`
- `mobileNumber`
- `password`
- `locationAccess`
- `moduleAccess`
- `lastLoggedIn`
- `createdOn`
- `createdBy`
- `status`

### Form/Access Shape

Add a user access assignment shape such as:

- module id or module name
- selected location ids
- selected location names

Add dummy option collections for:

- module definitions
- location options

This allows the list to derive:

- flat `Module Access` labels
- flat `Location Access` labels

while the forms and access modal work with structured data.

## State Management Design

User Management should be refactored to follow the same slice responsibilities as Device Management.

### User Slice Responsibilities

- list items
- current user
- loading/error/success message
- list loaded flag
- current page
- total pages
- total elements
- page size
- column filter map
- selected module filter
- selected stat-card filter
- summary counts

### Async Thunks

Implement these API-ready thunks:

- `fetchUsers`
- `fetchUserById`
- `createUser`
- `updateUser`
- `updateUserStatus`
- `updateUserPassword`
- `updateUserAccess`

For now, thunks will use static dummy data and local in-memory mutation logic, but the request/response signatures should remain shaped like real API calls.

### Request Model

The list request should support:

- `page`
- `size`
- `sortCriteria`
- column filters for user fields
- `module`
- `status`

This mirrors Device Management where page state is rebuilt from UI state and sent through one request object.

### Response Model

The list response should support:

- `summary`
  - `totalUsers`
  - `activeUsers`
  - `inactiveUsers`
- `content`
- `currentPage`
- `totalPages`
- `totalElements`
- `pageSize`

## Component Design

To keep responsibilities clear, split the feature into focused units rather than placing all logic inside `UserManagement.tsx`.

### Suggested Units

- `UserManagement.tsx`
  - list page orchestration only
- `userListRequest.ts`
  - builds list request from Redux/UI state
- user form page component
  - shared create/edit rendering
- user access module card component
  - renders one module block and location selection UI
- user status confirm modal component
- user password modal component
- user password success modal component
- user access modal component
- user success modal component

This keeps the list, forms, and modal flows independently understandable and easier to swap to real APIs later.

## Dummy Data Strategy

Dummy data should live close to the user slice or in a dedicated feature data file so UI code does not own mock persistence.

The dummy layer should:

- seed a list of users with varied modules, locations, and statuses
- support create, update, password update, access update, and status update
- support deterministic list filtering, sorting, and pagination
- compute summary counts from the filtered dataset rules used by the list request

This keeps UI behavior close to the future backend model.

## Validation Rules

### Create/Edit Form

- all top-level user fields required
- email must be valid format
- mobile number must be numeric and sensible length
- password required on create
- at least one module/location assignment required

### Password Modal

- password required
- confirm password required
- both values must match

### Access Modal

- a module with no selected locations is invalid if enabled

## Error Handling

- retain existing toast pattern for async success/error feedback
- keep modal-level validation inline for form mistakes
- if user lookup fails on edit route, show toast and navigate back to list
- if a mutation completes successfully, refresh the list using the current server-style request state

## Testing and Verification Scope

Implementation should be verified with:

- route navigation to create/edit pages
- stat-card filtering
- module dropdown filtering
- column filtering
- sorting
- pagination
- create flow
- edit flow
- change password modal and success modal
- manage access modal
- activate/deactivate confirmation flow

## Out of Scope

- real backend integration
- export/download behavior for User Management
- unrelated Sidebar or shared-layout refactors

## Implementation Notes

- preserve Device Management patterns where practical
- preserve current shared `DataTable` and `Modal` usage unless a targeted extension is necessary
- keep the dummy thunk contract easy to swap to axios-based API calls later
- avoid mixing client-side table pagination/filtering with server-style behavior
