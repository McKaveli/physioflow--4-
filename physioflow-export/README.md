# PhysioFlow

A multi-institution physiotherapy management and patient-care platform. See `AGENT.md` for the
original product spec and `docs/ARCHITECTURE.md` for stack decisions and a full phase-by-phase
verification log — including the multi-tenant rebuild, every bug found and fixed along the way,
and how each claim was actually verified rather than assumed.

## Product model (read this first)

This is **not** a single-clinic app — it's multi-tenant SaaS. Every institution's data (patients,
staff, appointments, exercises, treatment plans, messages, payments, inventory) is fully isolated
from every other institution's, enforced server-side and proven with automated tests.

The workflow is staff-driven, not patient-driven:

- **Patients never self-register and never book their own appointments.** A clinic admin creates
  patient records and sends a secure invitation link; a physiotherapist schedules their visits.
- **The only public signup is a new institution joining the platform** — a clinic name plus its
  first admin account.

## Quick start

Requires Node.js 20+.

### 1. Backend

```bash
cd server
cp .env.example .env      # defaults work out of the box for local dev
npm install
npm run db:migrate        # creates server/dev.db with all tables
npm run db:seed           # populates TWO independent demo institutions
npm run dev                # → http://localhost:4000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                # → http://localhost:5173 (proxies /api to :4000)
```

### Demo accounts (password for all: `Demo1234!`)

The seed script creates two separate institutions specifically so you can confirm tenant
isolation yourself — log into one and confirm you never see the other's data.

**Institution A — PhysioCare Accra**
| Role | Email |
|---|---|
| Clinic Admin | `admin@physiocare.demo` |
| Physiotherapist | `sarah.mensah@physiocare.demo` |
| Patient | `lawson.bediako@physioflow.demo` |

**Institution B — Greenfield Physiotherapy Clinic**
| Role | Email |
|---|---|
| Clinic Admin | `admin@greenfield.demo` |
| Physiotherapist | `michael.addo@greenfield.demo` |
| Patient | `kwame.boateng@greenfield.demo` |

To try the real patient onboarding flow: log in as a clinic admin → Patients → Add patient →
fill in personal + clinical intake info → Send invitation → copy the link → open it in a private
window to complete the "patient" side (set password, accept terms) exactly as a real patient
would.

### Running tests

```bash
cd server
npm test           # 32 tests — auth, RBAC, booking, payments authorization,
                    # and a dedicated cross-tenant isolation suite
```

### Production build

```bash
cd client && npm run build   # outputs client/dist — installable PWA, service worker included
cd server && npm run build   # outputs server/dist
```

## What's built

**Backend:**
- Multi-tenant data model (21 tables) — every institution-owned resource carries a required
  `clinicId`, always derived server-side from the authenticated user's own membership, never
  from client input
- Auth: institution signup (the only self-service path), staff-created patient/physio accounts,
  single-use expiring patient invitations, bcrypt + JWT-in-httpOnly-cookies
- Appointments: physio/admin-only scheduling (no patient self-booking), double-booking
  prevention, patient notifications on schedule/reschedule/cancel
- Treatment plans, exercise library, recovery logs, messaging, payments (abstracted provider),
  inventory (items + full movement audit trail), notifications, audit logging — all tenant-scoped
- 32 automated tests, including a dedicated cross-tenant isolation suite covering every resource
  type

**Frontend, by role:**

*Patient:* Home, My Recovery (logging + trend chart), Exercise Library (read-only), Appointments
(**read-only** — scheduled by staff), Messages, Payments, Profile. Public invitation-acceptance
flow at `/invite/:token`.

*Physiotherapist:* Dashboard (metrics, appointment timeline, "needs attention" list, low-stock
alert banner, weekly overview chart, adherence donut, real recent-activity feed from the audit
log), Patients, **Patient Profile** (tabbed clinical workspace — Overview, Clinical, Treatment,
Exercises, Appointments, Progress, Sessions, Messages), Appointments (real week/day/month
calendar with a detail panel, schedule/reschedule/cancel), Treatment Plans (4-step guided
builder), Exercise Library (browse + create, **video upload or YouTube embedding**),
**Inventory** (view stock, record movements with reason + audit trail), Messages, Reports.

*Clinic Admin:* Overview (real appointment/staff/patient counts, low-stock alert banner),
Patients (**Add Patient wizard** with clinical intake + invitation generation), Staff (create
real physiotherapist accounts), **Inventory** (add items, view stock), Payments (cash
reconciliation), Reports, Settings.

**Design system:** Button, Card, Input, Select, Textarea, Badge, Modal, Slider, Skeleton,
EmptyState, ErrorState, ProgressRing, InventoryAlertBanner — Tailwind v4 tokens (deep navy,
clinical blue, semantic status colors).

**PWA:** manifest, service worker (network-first for API calls, precached app shell), installable.

## Not yet built

Calendar day/week/month views (scheduling logic is done; the visual calendar layer isn't),
exercise media upload + YouTube resource embedding, global search / command palette, and a
dedicated mobile responsive polish pass.

## Repository layout

```
physioflow/
├── AGENT.md              # original product spec
├── docs/ARCHITECTURE.md  # stack decisions, full phase-by-phase verification log
├── server/                # Express + Drizzle ORM + SQLite API
└── client/                # React + Vite + Tailwind PWA
```
