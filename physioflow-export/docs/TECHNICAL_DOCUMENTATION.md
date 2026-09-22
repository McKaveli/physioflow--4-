# PhysioFlow Technical Documentation

## 1. Overview

PhysioFlow is a multi-tenant physiotherapy clinic management platform designed for healthcare operations, patient care coordination, and clinical workflows. It supports multiple organizations operating in the same system while keeping organization data isolated and secure.

The system includes:

- Organization-aware authentication and role-based authorization
- Patient onboarding and invitation-based access flow
- Physiotherapist and clinic admin dashboards
- Appointment scheduling and rescheduling workflows
- Recovery tracking and exercise assignment
- Inventory tracking and movement history
- Payments and financial reconciliation
- Notification and messaging flows
- Installable PWA frontend for clinic access

The application is intentionally split into a dedicated frontend and backend to preserve clean service boundaries, tenant isolation, and deployment flexibility.

---

## 2. Product Goals

The platform is designed to support the following operational goals:

1. Multi-tenant SaaS delivery for multiple clinics or organizations
2. Role-based access for Manager, Clinic Admin, Physiotherapist, and Patient
3. Strict organization-level data isolation
4. Secure clinical workflows with auditability
5. A modern, healthcare-optimized user experience
6. Offline-capable client behavior through a PWA shell
7. Maintainability with typed schemas, modular backend services, and reusable UI components

---

## 3. System Architecture

PhysioFlow follows a layered architecture with a clear separation between client, API, and persistence layers.

```text
+------------------------+
| React + Vite frontend  |
| - Role-based UI        |
| - PWA shell            |
| - Protected routes     |
| - API client / hooks   |
+-----------+------------+
            |
            | HTTPS / JSON
            v
+------------------------+
| Express API            |
| - Routes               |
| - Middleware           |
| - Auth / RBAC          |
| - Validation           |
| - Service layer        |
+-----------+------------+
            |
            | Drizzle ORM
            v
+------------------------+
| SQLite database        |
| - tenant-scoped tables |
| - journaling / audit   |
| - payment / inventory  |
| - appointments etc.   |
+------------------------+
```

### Architectural principles

- Keep tenant context server-side, never trust client-provided `clinicId` values
- Validate all payloads using schema validators
- Use domain modules for feature organization
- Prefer shared primitives for UI consistency
- Ensure business rules live in backend services and are not browser-only

---

## 4. Technical Stack

### Frontend

| Layer | Technology |
|---|---|
| Runtime | React 19 |
| Build tool | Vite |
| Language | TypeScript |
| Routing | React Router |
| State | Zustand + TanStack Query |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| PWA | vite-plugin-pwa |

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Language | TypeScript |
| ORM | Drizzle ORM |
| Database | SQLite via better-sqlite3 |
| Validation | Zod |
| Auth | JWT in HTTP-only cookies + bcryptjs |
| Rate limiting | express-rate-limit |
| Security | Helmet, CORS, cookie parsing |

### Development and testing

- TypeScript for both client and server
- Vitest for backend test execution
- Build verification with TypeScript compilation and production bundling
- Browser-based smoke testing for front-end UI verification

---

## 5. Repository Layout

```text
physioflow-export/
├── client/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/
│   │   ├── db/
│   │   ├── lib/
│   │   ├── middleware/
│   │   └── modules/
│   ├── scripts/
│   ├── tests/
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── TECHNICAL_DOCUMENTATION.md
├── README.md
├── package-lock.json
└── .gitignore
```

### Frontend module responsibilities

- `app/`: app shell, routing, layout, topbar/sidebar, protected routing
- `components/`: shared reusable UI primitives
- `features/`: domain-driven hooks and feature logic
- `pages/`: page-level views for roles and screens
- `lib/`: API client utilities, formatting helpers, shared logic

### Backend module responsibilities

- `modules/*`: business domain modules such as auth, clinics, patients, appointments, recovery, exercises, inventory, messaging, payments, and notifications
- `middleware/`: security, auth verification, tenant enforcement, request validation, error handling
- `db/`: database and schema definition
- `config/`: environment configuration and application constants

---

## 6. Authentication and Authorization

### Identity model

The application supports four primary user roles:

- Manager
- Clinic Admin
- Physiotherapist
- Patient

Authentication is handled by a server-issued JWT kept in an HTTP-only cookie. This pattern avoids exposing tokens to client-side JavaScript and reduces XSS risk compared to localStorage token storage.

### Login flow

The login flow is organization-aware and requires a valid clinic code before authentication proceeds:

1. User submits clinic/organization code
2. Backend verifies that the clinic exists
3. User logs in with email/password against the matching clinic context
4. Backend validates the user’s membership in that clinic
5. JWT is created and returned in an HTTP-only cookie
6. Protected routes read the user from the authenticated session

### Authorization model

The backend enforces access using per-role permission checks and clinic scoping. The important rule is that a user can only access resources belonging to their organization.

Examples:

- Patient cannot view other patients' records
- Physiotherapist cannot access another clinic's records
- Managers can monitor organization-wide metrics within their clinic
- Admins can manage clinic membership, patients, and operational workflows

This is implemented by binding session user data to the clinic context during request handling and enforcing checks in service methods.

---

## 7. Multi-Tenant Model

PhysioFlow is intentionally built as a multi-organization product, not a single-clinic app.

### Core tenant principles

- All primary business records are associated with a `clinicId` or equivalent tenant identifier
- Backend logic derives this value from the authenticated user session, not client input
- Cross-tenant access is blocked even if a malicious request attempts to change the value
- Demo seed data includes multiple independent institutions to validate isolated behavior

### Why this matters

This is critical for clinical data safety and platform correctness. A tenant-aware architecture prevents leakage across organizations and ensures the product can scale to multiple clinics without data mixing.

---

## 8. Database Design

The project uses Drizzle ORM with SQLite in development. The database includes tables for:

- Organizations / clinics
- Users and staff accounts
- Patients
- Roles and membership
- Appointments
- Treatment plans
- Exercises and video/URL media
- Recovery logs
- Messages and notifications
- Inventory and stock movements
- Payments
- Audit trail / event logging

### Design characteristics

- Schema-driven definitions with strong typing
- Tenant-scoped records for isolation
- Audit-friendly records for hold/modify actions
- Explicit status tracking for appointments, payments, messages, and inventory movement

### Data migration workflow

The backend includes migration scripts and utility commands:

```bash
cd server
npm run db:migrate
npm run db:seed
```

These create the schema and populate demo data for organizations and users.

---

## 9. API Structure

The backend exposes REST-style endpoints grouped by feature domain. Typical routes include:

- `/api/auth/*` for login, logout, refresh, and session retrieval
- `/api/clinics/*` for clinic lookup and overview data
- `/api/patients/*` for patient details and onboarding flows
- `/api/appointments/*` for scheduling and rescheduling
- `/api/exercises/*` for exercise library access and assignment creation
- `/api/recovery/*` for patient recovery tracking
- `/api/messages/*` for messaging and communication
- `/api/payments/*` for payment records and reconciliation
- `/api/inventory/*` for stock management
- `/api/notifications/*` for alerts and reminders

The API is designed for predictable request/response contracts with validation and consistent error handling. Errors are typically returned as structured payloads with meaningful status codes.

---

## 10. Frontend Architecture

The client is a role-based dashboard application using React, Vite, and modular UI patterns.

### Core frontend principles

- Route protection based on authentication and role
- Reusable card and stat primitives
- Shared empty and error states
- Live API data from TanStack Query hooks
- Mobile-responsive dashboards and layouts
- Design system tokens for consistent visual language

### Typical role screens

- Patient: home, recovery, exercises, appointments, payments, messages, profile
- Physiotherapist: dashboard, patient management, schedule, treatment plans, interventions
- Clinic Admin: dashboard, patient onboarding, staff management, inventory, configuration
- Manager: organizational summary, performance metrics, clinic status, payment visibility

### UI pattern

The frontend largely uses a component-driven structure:

- `pages/` for full-screen views
- `components/ui/` for foundational UI building blocks
- `components/dashboard/` for analytics cards and visual modules
- `features/*/hooks.ts` for data access and server state integration

---

## 11. PWA and Offline Considerations

PhysioFlow includes a progressive web app setup intended to provide installable web application behavior.

### Included features

- Web app manifest
- Service worker for app-shell caching
- Network-first behavior for API requests
- Offline fallback support for navigational routes
- Installable app shell for clinic environments

This helps ensure the platform can be used in a stable browser environment while still maintaining a native-like experience.

---

## 12. Security Considerations

The project includes several important protections:

- HTTP-only cookies for JWT transport
- Password hashing via bcrypt
- Clinic-scoped access enforcement
- Validation of inbound request data
- Role checks before sensitive actions
- Preventing frontend-driven tenant manipulation
- Secure handling of patient invitation flows

### Security-sensitive areas

- Auth login and refresh flows
- Patient invitation and onboarding tokens
- Appointment creation, conflict checks, and cancellations
- Payments and financial data access
- Inventory changes and audit logging

---

## 13. Testing Strategy

The project includes automated backend tests and UI smoke validation. At a minimum, the backend suite covers:

- Authentication requests
- Authorization boundaries
- Booking and scheduling rules
- Business rule enforcement
- Cross-tenant isolation
- Payment authorization checks

### Typical command

```bash
cd server
npm test
```

The client also supports production build verification:

```bash
cd client
npm run build
```

---

## 14. Development Workflow

### Backend

```bash
cd server
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

### Production build

```bash
cd server
npm run build

cd ../client
npm run build
```

---

## 15. Environment Variables

The project expects a small set of runtime configuration values. Typical examples include:

- `PORT`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_URL`
- `NODE_ENV`
- `DATABASE_URL` or local SQLite paths

A `.env.example` file should be used as the documented baseline for local development.

---

## 16. Known Design and Product Constraints

The current implementation is built as a practical clinically focused SaaS MVP. Some areas are intentionally constrained or simplified relative to a full production healthcare platform.

Examples:

- Real payment provider integrations are abstracted behind provider interfaces and may still be mocked for demo purposes
- Some operational workflows may be simplified in the UI but remain backed by real business rules
- Browser-level validation and empty states are emphasized to avoid broken or fabricated data presentation
- PWA support is included, but production-quality mobile install validation may still require dedicated release testing

---

## 17. Future Enhancements

Possible next steps include:

- Real external payment provider integration
- More advanced analytics dashboards and custom reports
- Deeper mobile-first patient experience refinements
- Expanded notification channels (WhatsApp, SMS, push)
- Advanced search and global command palette
- Improved calendar UI polish and scheduling workflows
- More comprehensive end-to-end browser QA across all roles and breakpoints

---

## 18. Summary

PhysioFlow is a multi-tenant physiotherapy operations platform with a clean separation between frontend and backend, typed database modeling, secure organization-bound authentication, and role-based clinical workflows. It is designed to be extensible, secure, and maintainable while supporting patient, physiotherapist, clinic admin, and manager use cases within a single commercial-grade healthcare product structure.
