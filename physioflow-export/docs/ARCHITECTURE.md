# PhysioFlow — Architecture & Stack

## 1. Stack Decision

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | Node.js 22 + TypeScript | Type-safe contracts shared conceptually with frontend; huge ecosystem; fast to iterate. |
| Backend framework | Express 4 | Predictable, minimal, easy to reason about middleware/auth pipeline — matches AGENT.md's "RESTful, predictable API" requirement. |
| ORM / DB access | Drizzle ORM | Typed schema-as-code (`schema.ts`), typed query builder, lightweight migrations — no external binary engine to fetch at build time (pure JS/TS + the DB driver), which also makes it easy to self-host/CI anywhere. |
| Database (dev) | SQLite via `better-sqlite3` (file-based) | Zero external services needed to run the app. Drizzle supports Postgres with the same schema-definition style, so moving to **PostgreSQL** for production is a driver swap (`drizzle-orm/node-postgres` + connection string), not a data-model rewrite. |

> **Note on this decision:** the original plan was Prisma. Prisma's `generate` step downloads a native query-engine binary from `binaries.prisma.sh` at build time, which was unreachable from this build environment (network egress is allow-listed to package registries and a few other hosts). Rather than fight the sandbox, we switched to Drizzle, which needs nothing beyond `npm install` — a better fit for a project that should build reliably on the very first `npm install`, in CI, and on any developer's machine. Nothing about the actual data model changed.
| Auth | JWT (access + refresh) in httpOnly cookies, bcrypt password hashing | Stateless, scales horizontally, no secrets in frontend JS (httpOnly cookie can't be read by client scripts — XSS-safer than localStorage tokens). |
| Validation | Zod | Single schema definition validates both request bodies and gives inferred TypeScript types — no drift between validation and types. |
| Frontend framework | React 18 + TypeScript + Vite | Fast dev server, first-class PWA plugin support, huge component ecosystem. |
| Styling / design system | Tailwind CSS + small hand-built component library (`/client/src/components/ui`) | Utility-first but centralized design tokens (color, spacing, radius) in `tailwind.config.ts` — avoids "generic Bootstrap" look by not using a prebuilt component kit. |
| Data fetching / server state | TanStack Query | Real caching, loading/error states, and optimistic updates come for free — required by AGENT.md's loading/error/empty-state rules. |
| Client state (UI-only) | Zustand | Small, no boilerplate, only for things that aren't server state (sidebar open/closed, active wizard step, etc). |
| Routing | React Router v6 (data routers) | Role-based protected routes, nested layouts per role. |
| PWA | `vite-plugin-pwa` (Workbox under the hood) | Generates manifest + service worker with configurable caching strategies; supports "offline shell" requirement without hand-rolling SW logic. |
| Testing | Vitest + Supertest (API), Vitest + Testing Library (frontend) | Same test runner across both halves of the monorepo. |

## 2. Why not a single full-stack framework (e.g. Next.js)?

AGENT.md explicitly asks for **clean separation** between frontend, backend, database, auth, storage, notifications, and payments, with a "modular backend architecture" and "service layer." A dedicated Express API + separate React PWA enforces that boundary structurally (they're literally different processes/deployables) rather than relying on developer discipline inside one framework. It also makes the backend independently reusable if a native mobile app is added later (AGENT.md §32).

## 3. Repository Layout

```
physioflow/
├── docs/
│   ├── ARCHITECTURE.md          (this file)
│   └── API.md                   (endpoint reference)
├── server/                      # Express API
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/              # env loading, constants
│   │   ├── middleware/          # auth, error handling, validation, rate limiting
│   │   ├── modules/             # one folder per domain (feature-sliced, not layer-sliced)
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── patients/
│   │   │   ├── physiotherapists/
│   │   │   ├── clinics/
│   │   │   ├── appointments/
│   │   │   ├── treatment-plans/
│   │   │   ├── exercises/
│   │   │   ├── recovery/
│   │   │   ├── messages/
│   │   │   ├── payments/
│   │   │   └── notifications/
│   │   │       # each module: routes.ts, controller.ts, service.ts, validation.ts
│   │   ├── lib/                 # prisma client singleton, jwt helpers, logger
│   │   ├── app.ts               # express app assembly
│   │   └── server.ts            # entrypoint
│   └── tests/
└── client/                      # React PWA
    ├── src/
    │   ├── app/                 # router, providers, role-based layouts
    │   ├── components/ui/       # design system primitives
    │   ├── features/            # one folder per domain, mirrors backend modules
    │   ├── lib/                 # api client, query client, auth store
    │   └── styles/
    └── public/
```

**Module pattern (backend):** each domain module owns its routes → controller → service → Prisma calls. Controllers never touch Prisma directly; validation (Zod) sits between the route and the controller. This is the "service layer" AGENT.md asks for.

## 4. Environments & Secrets

- `.env` (gitignored) holds `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_DOMAIN`, `NODE_ENV`.
- `.env.example` is committed with placeholder values so the shape is documented without leaking secrets.
- No secret ever appears in frontend code or bundle — the client only ever talks to `/api/*` on the same origin (or `VITE_API_URL` in dev).

## 5. Payments & Notifications abstraction

Both are implemented behind a **provider interface**, per AGENT.md §6/§18:

```ts
// modules/payments/providers/PaymentProvider.ts
interface PaymentProvider {
  initiate(payment: PaymentIntent): Promise<PaymentResult>;
  verify(reference: string): Promise<PaymentStatus>;
}
```

MVP ships a `ManualPaymentProvider` (cash/manual reconciliation) and a `MockMobileMoneyProvider` (simulates MTN/Vodafone/AirtelTigo MoMo flow for demo purposes) implementing the same interface, so swapping in a real Paystack/Flutterwave/Hubtel integration later touches only `providers/`, never the rest of the app. Same pattern for notifications (`NotificationProvider` → `ConsoleNotificationProvider` for dev, ready for SMS/WhatsApp/Push later).

## 6. Build phases (this build)

1. ✅ Architecture + repo scaffold
2. ✅ Database schema (Drizzle) + seed data — 17 tables, verified against a real SQLite file
3. ✅ Auth + role-based access — register/login/logout/refresh/me, RBAC middleware, verified via 14 passing automated tests (Vitest + Supertest) covering auth, authorization, and double-booking prevention
4. ✅ Core API modules — clinics, physiotherapists (dashboard aggregation), patients (dashboard aggregation), appointments (double-booking prevention), treatment plans, exercises, recovery logs, messages, payments (abstracted provider), notifications (abstracted provider)
5. ✅ PWA foundation — manifest, service worker (network-first API caching, precached app shell), installable, verified via production build (`vite build` outputs `sw.js` + `manifest.webmanifest`, 14 precached entries)
6. ✅ Design system — Button, Card, Input, Select, Textarea, Badge, Modal, Skeleton, EmptyState, ErrorState, ProgressRing — built on Tailwind v4 CSS-based tokens matching the brand direction
7. ✅ Feature build-out — Patient home, Physiotherapist dashboard, Clinic Admin overview, Exercise Library (browse/filter/create), Appointments (booking with live double-booking rejection, status management), Messages (patient single-thread + physio/admin multi-conversation view), Treatment Plan Builder (4-step guided wizard matching AGENT.md's exact flow), Patients management (search/filter), Recovery tracking (pain/mobility/mood logging + trend chart), Profile, Payments (patient billing + admin cash reconciliation), Staff management (real account creation), Settings (clinic profile editing), Reports (real data aggregations — appointment status breakdown, adherence, payment breakdown, revenue)
8. ✅ Verification pass — see below

## 7. Multi-institution rebuild (Phase A–F of the SaaS pivot)

The product was later restructured from single-clinic to multi-tenant SaaS, with a corresponding
philosophy change: patients no longer self-register or self-book — clinic staff create patients
and schedule their visits. This section documents that rebuild.

### Phase A — Multi-institution foundation
- `clinicId` added as a **required** column on every institution-owned table that was missing it:
  `appointments`, `treatmentPlans`, `exercises`, `exerciseAssignments`, `recoveryLogs`,
  `sessionNotes`, `conversations`, `payments`, plus made required (not nullable) on `patients`
  and `physiotherapists`.
- `getCallerClinicId(userId, role)` (`src/lib/tenant.ts`) is the single source of truth for
  "what institution does this user belong to" — always derived server-side from the caller's
  own membership row, **never** from a client-supplied `clinicId`.
- `assertSameInstitution()` returns **404, not 403**, on a cross-tenant mismatch, so a probing
  request can't distinguish "wrong institution" from "doesn't exist" — that distinction is
  itself a data disclosure.
- New tables: `invitation_tokens` (only a SHA-256 hash is ever stored, never the raw token) and
  `audit_logs` (now actively written on every write path listed in AGENT.md §28).

### Phase B/C — Admin-driven patient registration + invitations
- Patient and physiotherapist self-registration were **removed entirely**. The only public
  signup left is a new *institution* joining the platform (clinic + first admin) —
  `POST /api/auth/register-institution`.
- Admins create patients via `POST /api/patients`, including the clinical intake fields
  (presenting complaint, body area, date of injury, referring source) and a generated
  human-readable `patientCode` (`PF-000123`).
- A created patient's user account has `passwordHash: null` until they accept their invitation
  — `users.passwordHash` was made nullable, and `loginUser()` rejects login attempts on
  unactivated accounts with a clear message rather than a generic auth failure.
- Invitation tokens are single-use (consumed on accept), expire after 7 days, and generating a
  new invitation invalidates any previous unused one for that patient.

### Phase D — Appointment model change
- Patients can no longer create, reschedule, or cancel appointments — `POST /api/appointments`
  and its mutation endpoints are restricted to `PHYSIOTHERAPIST` / `CLINIC_ADMIN` roles.
  A patient calling these gets 403.
- Physio-initiated appointments go straight to `CONFIRMED` (no separate patient-confirmation
  step, since a staff member already decided the slot).
- Scheduling validates that both the patient and physio belong to the scheduling clinic —
  without this, a physio could accidentally (or maliciously) schedule using another
  institution's patient ID.
- The patient receives a real notification ("Your physiotherapist scheduled your next
  appointment") rather than the old "Book your next appointment" language, which no longer
  applies to this flow.

### Phase F — Inventory
- New `inventory_items` / `inventory_movements` tables, fully clinic-scoped.
- Stock status (in stock / low stock / out of stock / expired) is computed server-side from
  quantity, threshold, and expiry — never stored redundantly.
- Every quantity change is a recorded movement with a reason and the staff member who made it;
  the movement's sign is normalized server-side (a "removed" reason can never accidentally
  increase stock) — only manual `ADJUSTED` corrections may move in either direction.
- Low-stock/out-of-stock counts surface on both the physiotherapist dashboard and the clinic
  admin overview via a shared `InventoryAlertBanner` component, computed from real data.

### Verified facts for this rebuild (not claims)
- **32 automated tests pass**, up from 18 before this rebuild, including a dedicated
  `tests/tenant-isolation.test.ts` that proves Institution A can never see Institution B's
  patients, staff, appointments, exercise library, treatment plans, messages, payments, or
  inventory — covering both listing endpoints and direct-by-ID access attempts.
- One of those tests explicitly proves an admin **cannot plant a staff account into another
  institution even by sending that institution's real `clinicId` in the request body** — the
  server ignores it and uses the caller's own clinic every time.
- The complete new patient journey was smoke-tested live against the running API (not just
  unit-tested): admin creates a patient with clinical intake data → generates an invitation →
  the (still-unauthenticated) patient fetches their welcome details → accepts and sets a
  password → **reusing that same token is correctly rejected (400)** → patient logs in with
  their own credentials → **patient attempting to self-book an appointment is correctly
  rejected (403)**.
- The inventory flow was separately smoke-tested live end-to-end: item creation auto-records
  an "Initial stock" movement, dispensing decrements and attributes correctly, the low-stock
  alert is consistent across both dashboards, and a movement that would take stock negative is
  rejected (400).
- `npx tsc --noEmit` is clean on both frontend and backend after every phase of this rebuild.

Every screen named in AGENT.md and the redesign brief is now built and wired to real data. Nothing in the product is a placeholder route anymore.

Each phase ended with an actual run/build check before moving to the next — no phase was marked done on the strength of code existing alone.

### Verified backend facts (not claims)
- `npx tsc --noEmit` passes with zero errors.
- `npm run db:migrate` creates all 17 tables in a real SQLite file (confirmed via direct query against `sqlite_master`).
- `npm run db:seed` populates realistic fictional demo data: 1 clinic, 1 admin, 3 physiotherapists, 3 patients, 6 exercises, 3 treatment plans with exercise assignments and completion history, 3 appointments, 7 days of recovery logs, a message thread, and 2 payments across different methods/statuses.
- Full auth flow smoke-tested live against a running server: register → cookie issued → `/me` works → wrong password rejected (401) → duplicate email rejected (409) → unauthenticated access rejected (401) → cross-role access rejected (403).
- 14 automated tests pass (`npm test`): registration validation, login, session cookie lifecycle, logout invalidation, RBAC enforcement, appointment booking, double-booking rejection (409), invalid time range rejection (400), unauthenticated booking rejection (401).
- Exercise library filtering (by body area), physio/patient directories, treatment plan creation → assignment (DRAFT → ACTIVE), messaging (send → appears in recipient's conversation list), and appointment double-booking rejection were all additionally smoke-tested using the exact payload shapes the frontend sends.
- Two real bugs found and fixed during testing:
  1. Refresh tokens could collide when the same user logged in twice within the same second (JWT `iat` has 1-second resolution) — fixed by adding a random `jti` claim.
  2. Test setup used `setupFiles`, which runs *after* test modules (and their imports of the DB client) are already loaded — deleting and recreating the SQLite file there left the app's already-open connection pointing at a deleted file handle, causing spurious "no such table" errors. Fixed by moving DB reset/migration into Vitest's `globalSetup`, which runs in a separate process before any test file imports anything.
- The physiotherapist "needs attention" logic was corrected after seed-data testing to flag patients on *either* low adherence *or* stale activity (3+ days), not adherence alone — matching the product requirement, not just what was easiest to query.

### Verified frontend facts (not claims)
- `npx tsc --noEmit` passes with zero errors across the full app, including the treatment plan wizard, appointments, and messaging screens.
- `npm run build` succeeds and produces an installable PWA bundle with a generated service worker.
- Logged in through the actual Vite dev-server proxy (not a mock) as each of the three demo roles and confirmed real computed dashboard data renders — not hardcoded placeholders.
- Role-based route guards confirmed: patients cannot reach `/patients` (physio/admin-only data), `/reports` is gated to physio/admin, `/staff` and `/settings` are gated to clinic admin only, and the sidebar/bottom-nav render different item sets per role, matching AGENT.md §6.

### A/B check against this spec (what was already satisfied vs. newly built)

Most of this spec's Phases 1–9 (multi-institution isolation, roles, admin-created patients,
invitations, no patient self-booking, the professional calendar, the physio dashboard as a
clinical command center) were already built and verified in the prior architectural rebuild —
see the section above. This pass targeted the two most explicit remaining gaps against this
spec: the Patient Profile as "central clinical workspace" (§26) and exercise video/YouTube
resources (§24, called out as a critical requirement).

### New in this pass

- **Patient Profile page** (`/patients/:id`) — the tabbed clinical workspace the spec calls for:
  Overview, Clinical, Treatment, Exercises, Appointments, Progress, Sessions, Messages. Every
  tab reads from an existing, already-tenant-scoped endpoint (patient detail, treatment plans,
  appointments, recovery logs) except Sessions, which needed a new module (see below).
- **Session notes module** — the `session_notes` table existed since the original schema but had
  no service/controller/routes. Added `POST /api/session-notes` (physio-only, validates the
  patient belongs to the physio's own clinic) and `GET /api/session-notes/patient/:patientId`
  (physio/admin, same-institution only).
- **Exercise video resources** — added `youtubeUrl` and `safetyNotes` columns to `exercises`,
  plus a secure upload pipeline:
  - `POST /api/exercises/upload` (physio-only, `multer`, 50MB limit, MIME-allowlisted to
    video/mp4/webm/quicktime, image/jpeg/png/webp, and PDF) stores the file under a random UUID
    filename — the original filename is never trusted or preserved.
  - `GET /api/exercises/media/:filename` serves the file only to authenticated users whose
    institution matches the exercise that references it — uploaded media is never a plain
    static asset reachable by URL alone, closing the "uploaded files" tenant-isolation
    requirement this spec calls out explicitly (§2, §38).
  - YouTube URLs are validated against a real pattern and embedded via iframe as-is — never
    downloaded or re-hosted, per the explicit rule in §24/#41 rule 10.
- Exercise creation UI now offers Upload / YouTube / Both, with a live embed preview before
  saving, and physiotherapist-authored instructions/safety notes remain free-text fields the
  system never generates or suggests content for (§22, §23, #41 rules 11–12).

### Verified facts for this pass (not claims)
- `npx tsc --noEmit` clean on both frontend and backend.
- **39 automated tests pass** (up from 32), including a new `tests/exercise-resources.test.ts`
  covering: rejection of non-YouTube URLs, rejection of instructions that are too short (the
  physiotherapist must write real content), rejection of disallowed file types, and — the most
  important one — a live proof that a physiotherapist in Institution B gets a 404 (not the file)
  when requesting Institution A's uploaded exercise media by its exact URL, while Institution
  A's own physiotherapist gets the file (200).
- Session notes tenant isolation was proven the same way: a cross-institution note-creation
  attempt returns 404, and a same-institution note is immediately visible while remaining
  invisible to the other institution's staff.
- Every data source the new Patient Profile page depends on (patient detail, treatment plans,
  appointments, recovery logs, session notes) was smoke-tested live against the running API for
  a real seeded patient, and separately confirmed to 404 when queried by a physiotherapist from
  the other seeded institution.

### Bug fixes from earlier passes (preserved for history)

**Staff creation session hijack.** The first Staff page implementation reused the public
`/auth/register` endpoint to let an admin create a physiotherapist account. That endpoint issues
an auth cookie for the *new* account — and because the frontend and API share an origin, that
would have silently logged the admin out and swapped their session for the new physio's the
moment they added staff. Fixed by adding a dedicated `POST /api/physiotherapists/staff` endpoint
(clinic-admin-only, no session/cookie side effects) and verified live: after creating a new
staff account, `GET /auth/me` on the admin's original session still returns the admin's own
identity.

**Payments authorization gap.** `GET /payments` originally allowed any authenticated user to
list *all* payments in the system by simply omitting the `patientId` query parameter — a patient
could have seen every other patient's billing history. Fixed by scoping patients to their own
payments server-side (ignoring any client-supplied `patientId`), restricting unscoped listing to
`CLINIC_ADMIN`, and adding ownership checks to the single-payment `get` and `create` endpoints.
Covered by `tests/payments.test.ts`.
