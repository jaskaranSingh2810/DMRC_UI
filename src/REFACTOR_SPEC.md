Session 1 → Phase 1–2 (Vite migration + TypeScript conversion)
Session 2 → Phase 3 + 4 (Tailwind + deps update + Redux setup)
Session 3 → Phase 5–6 (Axios + Router + Auth)
Session 4 → Phase 7 (component library)
Session 5 → Phase 8–9 (entity pages — one entity, then "repeat for Device/Ticker/etc.")
Session 6 → Phase 10 (Dashboard + responsiveness)

You are a senior full-stack engineer. Perform a complete, production-grade refactor of this React (JavaScript) codebase. Execute all tasks in the exact order listed below. Do not stop between tasks. Do not ask for confirmation. Commit-ready output only.

---

## PHASE 1 — PROJECT MIGRATION & TOOLING

1. Migrate from Create React App to Vite:
   - Replace react-scripts with vite, @vitejs/plugin-react
   - Update package.json scripts: dev, build, preview
   - Create vite.config.ts with path aliases (@/ → src/)
   - Delete react-app-env.d.ts, update index.html to use <script type="module" src="/src/main.tsx">

2. Convert entire codebase from JavaScript to TypeScript:
   - Rename all .js/.jsx → .ts/.tsx
   - Create tsconfig.json with strict: true, baseUrl: "src", paths: { "@/*": ["./*"] }
   - Add explicit types to all props, state, functions, API responses, and Redux slices
   - Create a global src/types/index.ts for shared interfaces/enums

3. Replace all .css files with Tailwind CSS:
   - Install tailwindcss, postcss, autoprefixer; run init
   - Configure tailwind.config.ts with content paths and a custom design system (colors, fonts, spacing, breakpoints)
   - Delete every .css file; migrate all styles to Tailwind utility classes
   - Use clsx + tailwind-merge for conditional class logic

4. Update ALL dependencies to latest versions compatible with React 18 + Vite:
   - React 18, React DOM 18, React Router v6, Redux Toolkit, Axios, TypeScript 5, Tailwind CSS 3, and all dev deps

---

## PHASE 2 — ARCHITECTURE & STATE MANAGEMENT

5. Set up Redux Toolkit (RTK):
   - Create src/store/index.ts with configureStore
   - Create slices for: authSlice, uiSlice (loading, toast), and one slice per entity (user, device, ticker, notice, ad)
   - Use RTK Query for all API calls — define a baseApi with Axios baseQuery
   - Wrap app in <Provider store={store}>

6. Set up Axios with a centralized API service:
   - Create src/services/api.ts: Axios instance with baseURL from env, request/response interceptors
   - Interceptor: attach Bearer token from Redux auth state to every request
   - Interceptor: on 401, attempt silent token refresh (call /auth/refresh, retry original request); on failure, dispatch logout
   - Export typed API service functions grouped by entity

7. Set up React Router v6:
   - Create src/router/index.tsx with createBrowserRouter
   - Define routes: /login, /dashboard, /users, /users/new, /users/:id/edit, /devices, /devices/new, /devices/:id/edit, /tickers, /tickers/new, /tickers/:id/edit, /notices, /notices/new, /notices/:id/edit, /ads, /ads/new, /ads/:id/edit
   - Implement ProtectedRoute wrapper: redirect to /login if not authenticated
   - Implement RoleGuard wrapper: restrict routes by user role (admin, editor, viewer)

---

## PHASE 3 — PERFORMANCE OPTIMIZATION

8. Implement code splitting and lazy loading:
   - Wrap every page-level component in React.lazy() + Suspense
   - Add a <PageLoader /> fallback (full-screen centered spinner)
   - Use dynamic import() for heavy third-party libs (charts, rich-text editors, etc.)

9. Add global Error Boundaries:
   - Create src/components/ErrorBoundary.tsx (class component)
   - Wrap the router in a top-level ErrorBoundary showing a styled fallback UI with a "Reload" button
   - Add per-route ErrorBoundary for isolated failures
   - Log errors to console (and to an error monitoring service if configured)

---

## PHASE 4 — AUTHENTICATION

10. Enhance authentication flow:
    - Auth state shape: { user, accessToken, refreshToken, role, isAuthenticated, isLoading }
    - On app load, check localStorage for tokens → dispatch restoreSession
    - Implement token refresh: auto-refresh access token 60s before expiry using a setTimeout
    - Implement Role-Based Access Control (RBAC): roles enum (super_admin, ad_manager, notice_manager, ticker_manager); usePermission(role) hook; <Can role="ADMIN"> component
    - Protect all API calls and UI elements with role checks

---

## PHASE 5 — CUSTOM COMPONENT LIBRARY

11. Build a reusable, accessible, Tailwind-styled component library in src/components/ui/:

    Button.tsx — variants: primary, secondary, danger, ghost; sizes: sm, md, lg; loading state with spinner; disabled state
    Input.tsx — label, error message, helper text, left/right icon slots; controlled + uncontrolled
    Select.tsx — custom styled, accessible, supports options array prop
    Textarea.tsx — auto-resize, char count optional
    Modal.tsx — backdrop blur, close on Escape/click-outside, focus trap, animated entry/exit
    Table.tsx — sortable columns, pagination, empty state, loading skeleton rows
    Badge.tsx — status variants: success, warning, error, info, neutral
    Avatar.tsx — image with initials fallback
    Dropdown.tsx — accessible, keyboard navigable
    Breadcrumb.tsx — auto-generates from current route
    Sidebar.tsx — collapsible, mobile drawer, active link highlight
    Topbar.tsx — user avatar, notifications bell, breadcrumbs
    PageHeader.tsx — title, subtitle, action button slot
    ConfirmDialog.tsx — reusable delete confirmation modal with entity name interpolation
    FormField.tsx — wraps Input/Select with react-hook-form Controller + error display
    Skeleton.tsx — shimmer loading placeholder for any shape

---

## PHASE 6 — GLOBAL UX SYSTEMS

12. Implement Toast Notification System:
    - Create src/components/ui/Toast.tsx and src/components/ui/Toaster.tsx
    - Toaster renders at fixed bottom-right, stacks up to 5 toasts, auto-dismiss after 4s
    - Variants: success (green), error (red), warning (amber), info (blue)
    - Each toast: icon + title + message + manual close button + progress bar
    - Expose useToast() hook: toast.success(msg), toast.error(msg), toast.warning(msg), toast.info(msg)
    - Dispatch toasts from RTK uiSlice

13. Implement Global Loading System:
    - uiSlice tracks globalLoading: boolean
    - <GlobalSpinner /> — full-screen overlay with centered animated spinner, shown when globalLoading is true
    - RTK Query automatically sets globalLoading during in-flight requests via middleware
    - useLoading() hook: showLoader(), hideLoader()

14. Implement Global Error Handling:
    - window.onerror and window.onunhandledrejection handlers in main.tsx
    - All unhandled errors dispatch toast.error() with a safe message
    - Axios response interceptor maps HTTP error codes to user-friendly messages
    - Create src/utils/errorHandler.ts: parseApiError(error) → string

---

## PHASE 7 — ENTITY PAGES (repeat pattern for all 5 entities)

For each entity — User, Device, Ticker, Notice, Ad — generate:

15. List Page (e.g., src/pages/users/UsersPage.tsx):
    - PageHeader with title + "Create [Entity]" button (role-gated)
    - Table with columns appropriate to entity, sort, pagination
    - Search/filter bar
    - Loading skeleton while fetching
    - Empty state illustration + CTA
    - Delete button per row → opens ConfirmDialog → calls delete mutation → shows toast

16. Create Page (e.g., src/pages/users/CreateUserPage.tsx):
    - Full form using react-hook-form + zod schema validation
    - All fields with proper types, validation rules, and error messages
    - Submit calls RTK Query create mutation
    - On success: toast.success + navigate to list page
    - On error: toast.error with API error message
    - Cancel button navigates back

17. Edit Page (e.g., src/pages/users/EditUserPage.tsx):
    - Pre-populates form from RTK Query getById query
    - Loading skeleton while fetching entity
    - Submit calls update mutation
    - On success: toast.success + navigate to list page
    - Same validation and error handling as Create

---

## PHASE 8 — DASHBOARD

18. Build Dashboard page (src/pages/dashboard/DashboardPage.tsx):
    - Stats cards: total users, devices, active tickers, pending notices, active ads
    - Recent activity feed
    - Fully responsive grid layout (1 col mobile → 2 col tablet → 4 col desktop)
    - All data from RTK Query endpoints

---

## PHASE 9 — RESPONSIVE DESIGN & ACCESSIBILITY

19. Ensure full responsiveness across all pages:
    - Mobile-first Tailwind breakpoints: base (mobile), sm (640px), md (768px), lg (1024px), xl (1280px)
    - Sidebar collapses to hamburger drawer on mobile
    - Tables become card lists on mobile (< md breakpoint)
    - All forms stack vertically on mobile
    - Touch targets minimum 44×44px

20. Accessibility (WCAG 2.1 AA):
    - All interactive elements have aria-label or visible label
    - Focus rings on all focusable elements (outline-none only with focus-visible replacement)
    - Color contrast ratio ≥ 4.5:1 for all text
    - Keyboard navigation for Modal, Dropdown, Table
    - role, aria-expanded, aria-controls on all disclosure patterns
    - <html lang="en"> in index.html

---

## PHASE 10 — CODE QUALITY & CONVENTIONS

21. Enforce code organization conventions:
    src/
    ├── assets/
    ├── components/
    │   ├── ui/           ← generic reusable components
    │   └── shared/       ← app-specific shared components
    ├── features/         ← feature-specific components (not pages)
    ├── hooks/            ← custom hooks (useAuth, usePermission, useToast, useLoading)
    ├── pages/            ← one folder per entity
    ├── router/
    ├── services/         ← Axios instance, API helpers
    ├── store/            ← Redux store + all slices
    ├── types/            ← global TypeScript interfaces/enums
    └── utils/            ← pure utility functions

22. Naming conventions (enforce throughout):
    - Components: PascalCase
    - Hooks: camelCase prefixed with "use"
    - Constants: UPPER_SNAKE_CASE
    - Types/Interfaces: PascalCase, interfaces prefixed with "I" (e.g., IUser)
    - Files: match their default export name

23. Environment variables:
    - Create .env.example with VITE_API_BASE_URL, VITE_APP_NAME, VITE_TOKEN_REFRESH_THRESHOLD
    - Access only via import.meta.env, never process.env
    - Create src/config/env.ts that exports typed, validated env vars

---

## EXECUTION RULES

- Work file by file, completing each fully before moving on
- Never leave TODOs, placeholder comments, or incomplete implementations
- Every component must have TypeScript props interface
- Every API call must have typed request and response
- Every form must have Zod schema and react-hook-form integration
- Every page must be lazy-loaded
- Every destructive action must use ConfirmDialog
- Every mutation must show success/error toast
- Output only production-ready, lint-clean code