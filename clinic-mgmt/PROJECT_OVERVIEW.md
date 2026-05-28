# ZenFlow Clinic — Project Overview

**Version:** 0.3.0  
**Last updated:** May 28, 2026 (arrival workflow fix + system audit)  
**Stack:** Next.js 16 (App Router) + Prisma + PostgreSQL (Supabase) + Tailwind CSS 4

---

## 1. Project Summary

ZenFlow Clinic is a web-based acupuncture clinic management system built for small-to-medium acupuncture or alternative medicine practices. It replaces paper records, spreadsheets, and fragmented tools with a single integrated platform.

**What it solves:**
- Scattered patient records across paper files and documents
- Manual appointment scheduling with no overlap detection
- No automated patient reminder system
- No audit trail for clinic operations
- Difficulty tracking multi-stage, multi-sitting treatment plans
- No structured visit history or receipt generation

**Who uses it:**
- **Receptionists** — patient intake, scheduling, reminders
- **Doctors / Practitioners** — treatment plans, visit notes, session tracking
- **Admin** — user management, settings, audit log review, full system access

---

## 2. Product Goals

**Business goals:**
- Provide a single source of truth for all patient and clinic data
- Reduce no-shows through automated email reminders
- Maintain a complete audit trail for compliance and accountability
- Enable multi-user access with role-based permissions
- Keep the system affordable by using free-tier infrastructure (Supabase Free, Resend 100 emails/day)

**Clinic workflow goals:**
- One-click patient lookup and duplicate detection
- Structured treatment plans with stage/sitting progression tracking
- Visual calendar with day/week/month views
- Automated reminder dispatch (email only)
- Receipt/visit slip generation with unique numbering
- Overdue patient identification and follow-up tracking

**Why the system exists:**
The system was purpose-built for an acupuncture clinic that needed an affordable, no-code-alternative management tool. Unlike generic EHR systems, this is tailored to the specific workflow of stage-based treatment plans, sitting-by-sitting visit tracking, and the reminder cadence typical of acupuncture practices.

---

## 3. Current Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16.2.6** (App Router) | Framework — server components, client components, API routes |
| **React 19** | UI library |
| **TypeScript 5** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **shadcn/ui** (~25 components) | Accessible UI primitives (button, card, dialog, sheet, table, tabs, etc.) |
| **class-variance-authority** + **clsx** + **tailwind-merge** | Component variant system (`cn()` utility) |
| **tw-animate-css** | CSS animations |
| **Lucide React** | Icon library |
| **next-themes** | Theme support (light/dark) |

### Forms & Validation
| Technology | Purpose |
|---|---|
| **react-hook-form** | Form state management |
| **zod 4** | Schema validation |
| **@hookform/resolvers** | react-hook-form ↔ zod bridge |

### Calendar/Scheduling
| Technology | Purpose |
|---|---|
| **FullCalendar 6** | Calendar rendering (core, daygrid, timegrid, list, react) |
| Custom day/week/month view | Manual calendar view built on the calendar page |

### Backend / Server
| Technology | Purpose |
|---|---|
| Next.js Server Actions | All data mutations (CRUD) |
| Next.js API Routes | Auth endpoints (login, logout), CRON endpoint |
| **jose** | JWT creation and verification |
| **bcryptjs** | Password hashing |
| **Resend API** | Email delivery |
| **requireAuth() / requireRole()** | Custom server-side auth guard (src/lib/auth.ts) |

### Database
| Technology | Purpose |
|---|---|
| **PostgreSQL** (via Supabase) | Primary database |
| **Prisma 6** | ORM — schema migrations, type-safe queries |
| Supabase (client + admin SDK) | Available but not primary (auth not Supabase-based) |

### In-Memory Cache
| Technology | Purpose |
|---|---|
| Custom `Map`-based TTL cache (via `withCache`) | Reduces repeated DB queries for doctors, users, settings, dashboard stats, patients, today schedule, patient/plan detail, search (30-60s TTL per key, 100-entry FIFO eviction) |
| React `cache()` | Request-level dedup for `requireAuth()` and `requireRole()` — 1st call hits DB, subsequent calls in same render return cached session |

### Infrastructure
| Service | Role |
|---|---|
| Supabase (free tier) | PostgreSQL database hosting |
| Resend (free tier) | Email sending (100 emails/day) |
| Vercel or any Node.js host | Application deployment |

### Audit / Logging
| Technology | Purpose |
|---|---|
| `AuditLog` model (Prisma) | Structured entity-level change log |
| `createAuditLog()` | Server-side audit helper |

---

## 4. Project Architecture

### High-Level Architecture

```
┌───────────────────────────────────────────────────┐
│                  Next.js 16 App                    │
│                                                     │
│  ┌──────────────┐   ┌────────────────────────┐    │
│  │  UI Layer     │   │  Server Actions / API  │    │
│  │  (React 19)   │──▶│  Routes                │    │
│  │  Client/      │   │  src/lib/actions.ts    │    │
│  │  Server Comps │   │  src/app/api/          │    │
│  └──────────────┘   └────────┬───────────────┘    │
│                               │                      │
│  ┌────────────────────────────┴────────────────┐    │
│  │  Service Layer                                │    │
│  │  - auth.ts (JWT, bcrypt)                      │    │
│  │  - audit.ts (AuditLog writes)                 │    │
│  │  - cache.ts (TTL in-memory)                   │    │
│  │  - validators.ts (zod schemas)                │    │
│  │  - constants.ts (roles, labels, enums)        │    │
│  └────────────────────────────┬────────────────┘    │
│                               │                      │
│  ┌────────────────────────────┴────────────────┐    │
│  │  Data Layer                                  │    │
│  │  - Prisma ORM (PrismaClient)                 │    │
│  │  - PostgreSQL (Supabase)                     │    │
│  │  - Resend API (email)                        │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────┘
```

### Folder Structure

```
clinic-mgmt/
├── prisma/
│   ├── schema.prisma          # Data model
│   ├── seed.js                # Demo seed data
│   └── migrations/            # SQL migrations
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/login/      # Login page
│   │   ├── (dashboard)/       # Protected pages (layout + sidebar)
│   │   │   ├── audit/         # Audit log viewer
│   │   │   ├── calendar/      # Calendar/scheduler
│   │   │   ├── dashboard/     # Overview stats
│   │   │   ├── overdue/       # Overdue patients
│   │   │   ├── patients/      # Patient list, detail, create, edit
│   │   │   ├── plans/         # Treatment plans (detail, new, versions)
│   │   │   ├── reminders/     # Reminder management
│   │   │   ├── schedule/      # Schedule slots management
│   │   │   ├── settings/      # Clinic settings
│   │   │   ├── users/         # User management
│   │   │   └── visits/        # Visit detail + receipt
│   │   └── api/
│   │       ├── auth/          # Login + logout routes
│   │       └── cron/          # Reminder processing CRON
│   ├── components/
│   │   ├── features/          # Domain-specific components
│   │   │   └── status-badge.tsx
│   │   └── ui/                # shadcn/ui primitives (~25 components)
│   ├── lib/
│   │   ├── actions.ts         # All server actions (1145 lines)
│   │   ├── audit.ts           # Audit log helper
│   │   ├── auth.ts            # JWT, password, session
│   │   ├── cache.ts           # In-memory TTL cache
│   │   ├── constants.ts       # Roles, labels, enums
│   │   ├── db.ts              # PrismaClient singleton
│   │   ├── supabase.ts        # Supabase client instances
│   │   ├── utils.ts           # Formatters, helpers
│   │   ├── validators.ts      # Zod schemas
│   │   └── notifications/
│   │       ├── dispatch.ts    # Reminder dispatch logic
│   │       └── email.ts       # Resend email integration
│   └── proxy.ts               # Auth middleware (Route Guard)
├── .env                       # Environment configuration
├── next.config.ts             # Next.js config
├── tsconfig.json              # TypeScript config
├── tailwind.config.ts         # Tailwind config
└── package.json
```

### Feature/Module Organization

Each dashboard feature follows a consistent pattern:
- **Route group:** `src/app/(dashboard)/<feature>/`
- **Server page:** `page.tsx` (fetches data via server actions, passes to client component)
- **Client component:** `<feature>-client.tsx` or embedded in `page.tsx` (interactive UI)
- **Server actions:** All mutations live in `src/lib/actions.ts`
- **Validation:** `src/lib/validators.ts` (zod schemas)
- **Constants:** `src/lib/constants.ts` (labels, enums)

### Data Flow: UI → Server Action → Database

```
User Interaction
       │
       ▼
Client Component (useState, useCallback)
       │
       │  calls server action (imported from @/lib/actions)
       ▼
Server Action ("use server")
       │
       ├── requireAuth() / requireRole() → session + role check
       ├── Zod validation
       ├── Prisma query (read/write)
       ├── createAuditLog() with actorId from session (if mutation)
       ├── clearCache() (if mutation)
       └── return result to client
       │
       ▼
Client Component receives data → re-render / toast
```

### Role-Based Access Flow

```
Proxy Middleware (src/proxy.ts)
  │
  ├── Is path public? (login, api/auth/login, api/cron) → allow
  ├── Is path static? (_next/*, favicon) → allow
  ├── Has session_user cookie? → no → redirect to /login?redirect=<path>
  ├── verifySessionToken() → invalid → delete cookie, redirect to /login
  ├── Is user active? → no → delete cookie, redirect to /login?error=deactivated
  ├── Is path admin-only? (/users, /settings) → no admin role → redirect /dashboard
  ├── Is path doctor-only? (/plans/new) → below doctor role → redirect /dashboard
  └── Pass → NextResponse.next()
       │
       ▼
Server Action (requireRole / requireAuth)
  │
  ├── requireRole("admin") → session check + role ≥ admin → pass or throw
  ├── requireRole("doctor") → session check + role ≥ doctor → pass or throw
  ├── requireAuth() → session check only → pass or throw
  └── All mutations include actorId in audit log from session
```

**Role enforcement is applied at two levels:**
1. **Middleware level** (`src/proxy.ts`) — blocks access to admin-only routes (/users, /settings) and doctor-only routes (/plans/new) based on JWT role claim
2. **Server action level** (`src/lib/auth.ts`) — every exported action calls `requireAuth()` or `requireRole()` before executing; throws "Authentication required" or "Insufficient permissions" if unauthorized

### Validation Flow

```
User Input → Zod Schema (validators.ts)
  │
  ├── Fails → error returned to form, field-level messages
  └── Passes → data passed to server action
       │
       ▼
Server Action → Second validation pass (zod.parse)
  │
  ├── Fails → throw ValidationError
  └── Passes → Prisma query
```

### Audit Logging Flow

```
Any mutation (create/update/delete)
       │
       ▼
createAuditLog({
  actorId: session user ID,
  entityType: "Patient" | "User" | "Visit" | "TreatmentPlan" | "PlanSession" | "Reminder" | "ScheduleSlot" | "ClinicSetting",
  entityId: record ID,
  action: "create" | "update" | "delete",
  before: previous state (JSON),
  after: new state (JSON),
})
       │
       ▼
Prisma → AuditLog table
  │
  ▼
Audit Page → filterable viewer with expandable before/after diff
```

### Scheduling/Booking Flow

```
Receptionist clicks on time slot in calendar
       │
       ▼
New Appointment dialog opens
       │
       ├── Search patient (by name/phone, debounced 300ms)
       │   └── searchPatients server action
       ├── Select date/time/duration
       ├── Enter reason/notes
       ├── Optional: Override conflict checkbox
       └── Click "Create Appointment"
              │
              ▼
       bookAppointmentSlot server action:
              │
              ├── Check for slot conflicts (if not overriding)
              ├── Create ScheduleSlot record (status: "booked")
              ├── Create audit log
              └── Create 24h reminder for patient (if email exists)
```

### Reminder Flow

```
Reminder Creation
  (automatic on booking, plan creation, visit completion — OR manual from reminders page)
        │
        ├── 24h appointment reminder (if appointment >24h away)
        └── 2h appointment reminder (if appointment >2h away)
        │
        ▼
Reminder record (status: "pending", channel: "email", template: "24h_appointment"|"2h_appointment"|etc.)
        │
        ▼
Dispatch paths:
  ├── Immediate (fire-and-forget): On completeVisit / createTreatmentPlan for sessions within 24h
  └── CRON endpoint (GET /api/cron/process-reminders)
       - Protected by x-cron-secret header
       - Finds pending reminders where sendAt <= now, attempts < 5
       - Calls dispatchReminder() for each (up to 50 per run — currently concurrent, needs sequential fix)
        │
        ▼
dispatchReminder():
        │
        ├── Patient has email? → no → mark failed "Patient has no email address"
        ├── Build email (buildReminderEmail — 6 professional HTML templates with clinic branding)
        ├── Send via Resend API
        ├── Success → status: "sent", attempts++
        └── Failure → status: "failed", lastError, attempts++
```

**Email templates** are now professionally styled with:
- ZenFlow Clinic header (green brand color)
- Responsive HTML layout with card design
- Template-specific content for each of 6 scenarios
- Safe HTML escaping for all patient data

### Receipt Generation Flow

```
Visit detail page → "Print Receipt" button
       │
       ▼
Receipt page (server component)
  - Fetches visit + patient + plan info
  - Renders receipt layout (print-friendly)
  - Receipt number format: ZF-<YYMMDD>-<XXXX>
       │
       ▼
Browser print dialog (CTRL+P)
```

---

## 5. Core Modules Already Built

### Login / Auth Flow (`(auth)/login/page.tsx`, `api/auth/login/route.ts`, `api/auth/logout/route.ts`)

- Login form with email/password
- Server-side credential verification using bcrypt
- JWT session token stored in `session_user` cookie (8-hour expiry)
- Redirect to original URL after login (`?redirect=` parameter)
- Logout clears cookie and redirects to login
- Proxy middleware protects all dashboard routes

### Dashboard (`dashboard/page.tsx`, `dashboard/dashboard-client.tsx`)

- Server-rendered page fetching stats via `getDashboardStats()`
- Four stat cards: Today's Visits, Active Plans, New Patients, Overdue
- Total patient count card
- Quick actions: New Patient, View Calendar, All Patients
- Clinic name from settings (ClinicSetting key `clinic_name`)
- Stats cached in-memory for 30 seconds

### Patient Intake (`patients/new/page.tsx`)

- Full form with name, phone, email, address, age, date of birth, gender, reported problem, referral source, emergency contact, notes, consent flags
- Zod validation on all fields
- Email field included for reminder delivery
- Server action creates patient + audit log
- Redirects to patient detail on success

### Patient Search & List (`patients/page.tsx`, `patients/patients-client.tsx`)

- Card-based patient grid (responsive: 1 column mobile, 2 columns xl)
- Search by name or phone (URL-param-based, server-filtered)
- Filter by plan status (active/completed/paused/draft)
- Pagination with Previous/Next buttons and page numbers
- Each card shows: name, age/gender, phone, last visit date, next visit date, assigned doctor, plan status badge
- Hover actions: edit, calendar, reminder
- Click navigates to patient detail

### Patient Detail (`patients/[id]/page.tsx`, `patients/[id]/patient-detail-client.tsx`)

- Hero card with avatar, name, ID, DOB/age/gender, phone, email, plan status
- Action buttons: Edit, Create Plan, Schedule Visit, Print Receipt, Send Reminder
- Next visit banner (if exists)
- Three tabs:
  - **Treatment Plan tab** — active plan progress bar, stage timeline (completed/current/upcoming), schedule next sitting, view full plan
  - **Visit History tab** — timeline of all visits with stage/sitting, date/time, status, notes, next visit date
  - **Reminders tab** — list of all reminders with channel, template, scheduled date, status
- No audit log tab (AuditLog-Patient FK removed intentionally — audit logs are entity-generic)

### Patient Edit (`patients/[id]/edit/page.tsx`, `edit-patient-client.tsx`)

- Pre-populated form with all patient fields
- Email field pre-filled from existing data
- Same validation as create
- Updates patient record + creates audit log

### Treatment Plan Creation (`plans/new/page.tsx`, `plans/new/new-plan-form.tsx`)

- Multi-field form: patient selector, doctor selector, condition, stages total, sittings total, interval days, planned visit dates, expected end date, start date, status, special notes
- Patient pre-selected if navigated from patient detail (`?patientId=`)
- Creates plan + generates PlanSession records for each sitting + ScheduleSlot records linked via `overrideReason: "plan-session:{planId}:{sessionNumber}"`
- Auto-creates 24h reminders for sessions scheduled within 24h (fire-and-forget send)
- Creates audit log
- Redirects to plan detail on success

### Treatment Plan Detail (`plans/[id]/page.tsx`, `plans/[id]/plan-detail-client.tsx`)

- Plan overview card: condition, doctor, dates, progress, status
- Session timeline (`session-timeline.tsx`): list of all sessions by stage/sitting number
- Each session shows: scheduled date, status, notes
- Quick actions: Mark Completed, Cancel (inline buttons)
- Edit dialog: change date, status, notes
- Version history link
- Action buttons: edit plan, schedule visit, record visit

### Plan Versioning (`plans/[id]/versions/page.tsx`)

- Lists all PlanVersion records in chronological order
- Shows version number, key parameters, status, change notes
- Created each time a plan is updated via `updateTreatmentPlan`

### Visit Tracking (`visits/[id]/page.tsx`, `visit-detail-client.tsx`)

- Visit detail card: patient, plan, stage/sitting, date/time, status, notes
- Print-friendly receipt page (`visits/[id]/receipt/page.tsx`)
- Receipt layout with patient info, doctor info, receipt number, date, stage/sitting
- Plan resolved via `overrideReason` (direct) or `patientId` fallback (back-fills `planId` on existing visits)

### Calendar / Scheduler (`calendar/page.tsx`)

- Custom-built calendar (not FullCalendar in the main view)
- Three views: Day, Week, Month
- Week view: 5-day grid with hourly rows (8 AM – 6 PM), time slots clickable to create appointments
- Day view: single-day detailed view
- Month view: grid with appointment dots
- Current time indicator (red line, updates every minute)
- Side panel: practitioner filter (populated from DB), room filter
- New Appointment dialog with patient search (debounced), date/time/duration, reason, practitioner dropdown, override conflict checkbox
- Patient search connected to server action (`searchPatients`)
- Booking creates ScheduleSlot + 24h/2h reminders (if patient has email)
- Arrive → Complete → Done workflow with local state sync (visitId stored on arrival)
- Loading skeleton while data fetches (no static demo data)

### Schedule / Today's Schedule (`schedule/page.tsx`, `schedule/appointment-slots.tsx`)

- **Visit Schedule** — table of today's booked visits with time, patient, treatment, status (color-coded left border)
- **Available Slots** — paginated table (10/page) showing only `free` slots across all practitioners with prev/next page numbers
- Three stat cards: total visits, arrived count, completed count
- Slot types: available, appointment, lunch, break, external, leave, emergency
- Audit logging for all slot mutations

### Reminder Management (`reminders/page.tsx`)

- Full reminder list with search and filter by status/patient
- Channel display: email only (Mail icon)
- Create new reminder dialog: search patient, select template, set send date/time
- Per-reminder actions: retry (up to 5 attempts), pause, resume, view attempts/errors
- Tabs: All / Pending / Sent / Failed
- Pagination
- Summary stats: pending, sent, failed counts

### Overdue Follow-Ups (`overdue/page.tsx`)

- Lists patients identified as overdue for follow-up
- Shows patient name, phone, last visit date, overdue since, action buttons
- Criteria: patient has visits AND has active treatment plan

### Users & Roles Management (`users/page.tsx`)

- Table of all users: name, email, role, status
- Create user dialog: name, email, **password** (min 6 chars), role (admin/doctor/receptionist), active toggle
- Edit user: name, email, role, active status, **optional password reset**
- Role-based visibility: the `/users` page itself is blocked by middleware for non-admin users
- Server-side enforcement: `createUser()` and `updateUser()` require admin role via `requireRole("admin")`
- Cannot deactivate yourself or change your own role
- Delete user (admin only — UI not yet exposed)
- Audit trail logs all user changes with the acting admin's ID

### Audit Log Review (`audit/page.tsx`)

- Table of all audit log entries: timestamp, actor, entity type, entity ID, action
- Filter by entity type (Patient, User, Visit, TreatmentPlan, PlanSession, Reminder, ScheduleSlot, ClinicSetting)
- Filter by action (create, update, delete)
- Expandable rows showing before/after JSON diff
- Pagination (10 per page)
- Export button (UI only — not wired)

### Settings (`settings/page.tsx`)

- Three tabs: General, Reminders, Notifications
- **General:** Clinic name, address, phone, email, timezone, currency, date format
- **Reminders:** Active channels (email only), default reminder timing, max retries, batch size
- **Notifications:** Email configuration (sender name, from address — read-only display)
- All settings stored as ClinicSetting key-value pairs
- Changes create audit logs

### Landing / Index (`page.tsx`)

- Root page redirects to `/dashboard` if authenticated (cookie present)
- Falls back silently on error

---

## 6. Data Model

### Patient

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Patient full name |
| `phone` | String | Contact number |
| `email` | String? | Used for email reminders |
| `address` | String | Residential/contact address |
| `age` | Int? | Age in years |
| `dateOfBirth` | DateTime? | Date of birth |
| `gender` | String? | Gender identity |
| `reportedProblem` | String | Chief complaint / reason for visit |
| `referralSource` | String? | How the patient found the clinic |
| `emergencyContact` | String? | Emergency contact info |
| `notes` | String? | Internal notes |
| `consentFlags` | String? | Consent tracking (JSON string) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Has many `TreatmentPlan` records → `patientId`
- Has many `Visit` records → `patientId`
- Has many `Reminder` records → `patientId`
- Has many `ScheduleSlot` records → `patientId`

**Why it exists:** Core entity. Every workflow starts with or references a patient.

### User

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String | Staff full name |
| `email` | String (unique) | Login email |
| `phone` | String? | Contact number |
| `passwordHash` | String | bcrypt hash |
| `role` | String (default: "receptionist") | "admin", "doctor", "receptionist" |
| `active` | Boolean (default: true) | Account active/inactive |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Has many `TreatmentPlan` records (as doctor) → `doctorId`
- Has many `ScheduleSlot` records → `doctorId`
- Has many `AuditLog` records → `actorId`

**Why it exists:** Staff accounts for login, role-based access, and attribution of actions.

### TreatmentPlan

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `patientId` | String | FK → Patient |
| `doctorId` | String | FK → User |
| `condition` | String | Diagnosis / condition being treated |
| `stagesTotal` | Int (default: 1) | Total stages in the plan |
| `sittingsTotal` | Int (default: 6) | Total sittings across all stages |
| `currentStage` | Int (default: 1) | Current active stage |
| `currentSittingNumber` | Int (default: 0) | Current sitting number |
| `intervalDays` | Int (default: 7) | Recommended interval between visits |
| `plannedVisitDates` | String? | JSON of planned dates |
| `startDate` | DateTime? | Plan start date |
| `expectedEndDate` | DateTime? | Plan end date |
| `status` | String (default: "active") | draft, active, paused, completed, cancelled |
| `specialNotes` | String? | Clinical notes |
| `version` | Int (default: 1) | Current version number |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Belongs to `Patient` → `patientId` (cascade delete)
- Belongs to `User` (doctor) → `doctorId`
- Has many `Visit` records → `planId`
- Has many `PlanVersion` records → `planId` (cascade delete)
- Has many `PlanSession` records → `planId` (cascade delete)

**Why it exists:** The core clinical document. Defines the treatment structure — how many stages, how many sittings per stage, which doctor, what condition. Everything in the clinic workflow revolves around the plan.

### PlanSession

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `planId` | String | FK → TreatmentPlan |
| `sessionNumber` | Int | Sequential session number |
| `stageNo` | Int (default: 1) | Which stage this session belongs to |
| `sittingNo` | Int (default: 1) | Which sitting within the stage |
| `scheduledDate` | DateTime | When the session is scheduled |
| `status` | String (default: "scheduled") | scheduled, completed, cancelled, missed |
| `notes` | String? | Session notes |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Belongs to `TreatmentPlan` → `planId` (cascade delete)

**Why it exists:** Pre-generated individual sessions within a plan. Each sitting gets its own session record, allowing granular scheduling, status tracking (completed/cancelled), and notes. Seed data creates sessions for all sittings upfront.

### PlanVersion

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `planId` | String | FK → TreatmentPlan |
| `version` | Int | Version number (incremented) |
| `stagesTotal` | Int | Snapshot at version time |
| `sittingsTotal` | Int | Snapshot at version time |
| `intervalDays` | Int | Snapshot at version time |
| `condition` | String | Snapshot at version time |
| `specialNotes` | String? | Snapshot at version time |
| `plannedVisitDates` | String? | Snapshot at version time |
| `expectedEndDate` | DateTime? | Snapshot at version time |
| `status` | String | Snapshot at version time |
| `changeNotes` | String? | What changed in this version |
| `createdAt` | DateTime | Auto |

**Relationships:**
- Belongs to `TreatmentPlan` → `planId` (cascade delete)

**Why it exists:** Audit trail for plan changes. Each time a plan is updated, the previous state is saved as a version snapshot so clinicians can review what changed over time.

### Visit

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `patientId` | String | FK → Patient (cascade delete) |
| `planId` | String? | FK → TreatmentPlan |
| `dateTime` | DateTime | When the visit occurred |
| `stageNo` | Int (default: 1) | Stage number at visit time |
| `sittingNo` | Int (default: 1) | Sitting number |
| `notes` | String? | Clinical notes |
| `nextVisitDate` | DateTime? | Recommended next visit |
| `visitStatus` | String (default: "completed") | scheduled, arrived, in_treatment, completed, cancelled, no_show |
| `receiptNumber` | String? | Unique receipt identifier |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Belongs to `Patient` → `patientId` (cascade delete)
- Belongs to `TreatmentPlan` → `planId`

**Why it exists:** Records each patient visit — what stage/sitting, notes, status, receipt. Completes the treatment cycle by linking planned sessions to actual visits.

### ScheduleSlot

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `doctorId` | String | FK → User |
| `startTime` | DateTime | Slot start |
| `endTime` | DateTime | Slot end |
| `slotType` | String (default: "available") | available, appointment, lunch, break, external, leave, emergency |
| `status` | String (default: "free") | free, booked, blocked, completed |
| `overrideReason` | String? | Required to override conflicts |
| `patientId` | String? | FK → Patient |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Belongs to `User` (doctor) → `doctorId`
- Belongs to `Patient` → `patientId`

**Why it exists:** Manages doctor availability and appointments. Supports conflict detection and override. Links to patient when booked.

### Reminder

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `patientId` | String | FK → Patient (cascade delete) |
| `visitId` | String? | Optional FK to visit |
| `channel` | String (default: "email") | Always "email" (SMS/WhatsApp removed) |
| `template` | String | Template identifier (e.g., "24h_appointment") |
| `sendAt` | DateTime | When to send |
| `status` | String (default: "pending") | pending, sent, failed, paused |
| `deliveryAttempts` | Int (default: 0) | Retry count (max 5) |
| `lastError` | String? | Last error message |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

**Relationships:**
- Belongs to `Patient` → `patientId` (cascade delete)

**Why it exists:** Drives the automated reminder system. Created automatically on appointment booking and manually from the reminders page. Processed by the CRON endpoint.

### AuditLog

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `actorId` | String? | FK → User |
| `entityType` | String | Entity class name |
| `entityId` | String? | Generic entity ID (no FK constraint) |
| `action` | String | "create", "update", "delete" |
| `before` | String? | JSON of previous state |
| `after` | String? | JSON of new state |
| `ipOrDevice` | String? | Optional metadata |
| `createdAt` | DateTime | Auto |

**Relationships:**
- Belongs to `User` (actor) → `actorId`

**Why it exists:** Immutable change log for compliance and troubleshooting. Every server-side mutation (create/update/delete) across all entity types writes to this table. The entityId field is intentionally unconstrained (no FK) to allow referencing any entity type.

### ClinicSetting

| Field | Type | Notes |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `key` | String (unique) | Setting name |
| `value` | String | Setting value (all stored as strings) |

**Why it exists:** Simple key-value configuration store. Stores clinic name, address, reminder defaults, email config, etc. No schema enforcement — values are parsed by the consuming code.

---

## 7. Workflow Explanation

### End-to-End Clinic Workflow

```
1. Patient walks in
       │
       ▼
2. Receptionist opens Patients page
       │
       ├── Search by name or phone → if found, open existing record
       └── Not found → Create New Patient (name, phone, email, address, problem, etc.)
              │
              ▼
3. Doctor creates Treatment Plan
       │
       ├── Select patient, assign doctor, define condition
       ├── Set stages (e.g., 3 stages), sittings per stage (e.g., 6 per stage)
       ├── Set interval between visits (e.g., 7 days)
       └── Plan sessions auto-generated for all sittings
              │
              ▼
4. Visits are scheduled (Calendar / Schedule)
       │
       ├── Click on time slot in calendar
       ├── Search and select patient
       ├── Create appointment slot (booked)
       ├── 24h reminder auto-created (if patient has email)
       └── Slot conflicts flagged unless override is used
              │
              ▼
 5. Visit occurs — receptionist/doctor records it
        │
        ├── Patient arrives → click "Arrive" on calendar slot
        │   └── Creates Visit record, updates slot status to "arrived"
        ├── Treatment delivered → click "Complete" on calendar
        │   └── Marks visit completed, updates slot to "completed", advances plan (auto-counts completed sessions), generates receipt
        ├── Next session auto-reminder created (if within 24h)
        ├── Receipt number generated (format: ZF-<timestamp>-<random>)
        └── Receipt printable (CTRL+P from receipt page)
              │
              ▼
6. Reminders are sent (automated)
       │
       ├── CRON endpoint runs every X minutes
       ├── Finds pending reminders where sendAt <= now
       ├── Attempts delivery via email (Resend)
       ├── On success: mark sent
       ├── On failure: mark failed, retry up to 5 times
       └── Retry available manually from reminders page
              │
              ▼
7. Overdue patients tracked
       │
       ├── Overdue page shows patients needing follow-up
       └── Action buttons to schedule new visit or send reminder
              │
              ▼
8. Everything is audited
       │
       └── Every create/update/delete → AuditLog entry
            (actor, entity type, entity ID, before/after JSON)
```

---

## 8. What Has Been Completed So Far

### Pages Implemented (23 routes)

| Route | Page | Type |
|---|---|---|
| `/` | Root (redirect → dashboard) | Server |
| `/login` | Login form | Client |
| `/dashboard` | Overview stats | Server + Client |
| `/patients` | Patient list + search + pagination | Server + Client |
| `/patients/new` | Create patient | Client |
| `/patients/[id]` | Patient detail (3 tabs) | Server + Client |
| `/patients/[id]/edit` | Edit patient | Server + Client |
| `/plans/new` | Create treatment plan | Client |
| `/plans/[id]` | Plan detail + session timeline | Server + Client |
| `/plans/[id]/versions` | Plan version history | Server |
| `/visits/[id]` | Visit detail | Server + Client |
| `/visits/[id]/receipt` | Print receipt | Server |
| `/calendar` | Calendar (day/week/month) + appointment creation | Client |
| `/schedule` | Today's schedule + available slots (paginated) | Server + Client |
| `/receipt/[id]` | Standalone receipt (outside dashboard layout, auto-print) | Server |
| `/reminders` | Reminder list + create + retry | Client |
| `/overdue` | Overdue patient tracking | Server |
| `/audit` | Audit log viewer | Client |
| `/users` | User management (CRUD) | Client |
| `/settings` | Clinic settings (3 tabs) | Client |

### API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/auth/login` | POST | Authenticate, set session cookie |
| `/api/auth/logout` | POST | Clear session cookie |
| `/api/cron/process-reminders` | GET | Process pending reminders (x-cron-secret) |

### Server Actions (src/lib/actions.ts, ~1717 lines)

All CRUD operations for: Patient, User, TreatmentPlan, PlanSession, PlanVersion, Visit, Reminder, ScheduleSlot. Plus:
- `searchPatients()` — name/phone search (cached 15s)
- `bookAppointmentSlot()` — create appointment + auto-reminder (24h + 2h)
- `arrivePatient()` — mark patient arrived, create Visit, link plan via overrideReason
- `completeVisit()` — mark visit complete, advance plan progress (self-healing via session count), auto-create next reminder
- `retryReminder()`, `pauseReminder()` — reminder management
- `getDashboardStats()` — aggregated stats via single raw SQL with 5 subqueries (cached 30s)
- `getDoctors()`, `getUsers()` — cached queries

### What Has Been Hardened / Fixed

- **Role-based access control added to ALL 35 server actions** — every exported function now calls `requireAuth()` or `requireRole()` before executing. Previously, zero actions had auth checks.
- **Proxy middleware enforces roles** — `/users` and `/settings` are blocked for non-admin users; `/plans/new` requires doctor role. *(Note: file is named `proxy.ts` not `middleware.ts`, so middleware is currently inactive.)*
- **User creation requires password** — no more hardcoded `"temporary123"` default. Password field added to create/edit forms with 6-character minimum.
- **`updateUser` audit log bug fixed** — was logging the target user's ID as the actor; now correctly logs the session user's ID.
- **Self-deactivation prevented** — admin cannot deactivate their own account or change their own role.
- **Professional HTML email templates** — branded ZenFlow Clinic email with responsive layout, 6 template variants with proper content.
- **Both 24h and 2h reminders auto-created** on appointment booking (previously only 24h).
- **`sendTestEmail` action** added so admin can verify email configuration from settings.
- **Calendar doctor selector** — new appointment dialog now has a practitioner dropdown (was hardcoded to first doctor).
- **Calendar practitioner filter** — uses doctor IDs instead of name strings for accurate per-doctor filtering.
- **WhatsApp/SMS fully removed** — All WhatsApp code, env vars, webhook routes, schema defaults, and UI references deleted. The only notification channel is email.
- **AuditLog FK constraint removed** — `entityId` was pinned to Patient via FK. Now it's a free string field, allowing audit logs for any entity type (TreatmentPlan, Visit, User, etc.)
- **Email field on patient forms** — Added to create, edit, and detail views so reminders can actually be delivered.
- **`createVisit` allows past dates** — Clinics need to record historical visits; the past-date check was removed.
- **Retry cap consistency** — Cron and manual retry both use max 5 attempts (was 3 in cron, 5 in retry).
- **`updateScheduleSlot` audit logging** — Was missing; added before/after audit.
- **Audit page entity filter** — Expanded to include `PlanSession` and `ClinicSetting`.
- **Reminder.channel default** — Changed from `"sms"` to `"email"` in Prisma schema.
- **Stale seed data removed** — `reminder_channel_sms` removed from seed; duplicate `reminder_channel_email` deduplicated.
- **5 server component pages made dynamic** — added `force-dynamic` to prevent prerender failures with auth checks.
- **Performance optimizations:**
  - In-memory TTL cache (60s doctors, 30s for users/settings/stats/patients/today-schedule/patient-detail/plan-detail)
  - React `cache()` wraps `requireAuth` and `requireRole` — request-level dedup, saves 1-2 DB calls per page load
  - `getDashboardStats` combined 5 sequential `count()` queries into 1 raw SQL with correlated subqueries (5 round-trips → 1, critical with connection_limit=1)
  - All `Promise.all` with Prisma queries removed — replaced with sequential `await` to avoid `P2024` pool timeout errors with `connection_limit=1`
  - `take` limits on all list queries (20-500 range)
  - `getOverduePatients` uses raw SQL with `EXTRACT(EPOCH ...)` for server-side overdue filtering
  - Calendar fetches date-scoped slots via `visibleRange` memo instead of all slots
  - Fire-and-forget audit logging (`logAudit` wraps `createAuditLog` with `.catch(() => {})`)
- **Indexes added** — 21 database indexes across all models (previously zero non-PK indexes). Key indexes: `ScheduleSlot(doctorId, startTime)`, `Visit(dateTime)`, `AuditLog(createdAt)`, `Patient(name)`, `PlanSession(planId, sessionNumber)`, `Reminder(sendAt, status)`.
- **Session time/timezone fix** — PlanSession and ScheduleSlot dates now constructed as IST (+05:30) instead of UTC midnight, fixing incorrect time display (previously showed 5:30 AM instead of 10:00 AM in IST).
- **Calendar practitioner filter** — Removed "All Practitioners" default; filters to first doctor on load with no "All" option.
- **Patient delete** — Admin can permanently delete patients (cascades through visits, plans, reminders, schedule slots).
- **AppointmentSlotsTable** — New paginated component (10/page) on schedule page showing only `free` slots with page numbers.
- **Receipt page toolbar** — Fixed CSS bug: `.no-print` rule was always active (missing `@media print` wrapper), hiding the Download/Share/Email buttons permanently.
- **Plan sessions sync to calendar** — `createTreatmentPlan` creates ScheduleSlot records per session; `updatePlanSession` syncs date/time/status changes to matching ScheduleSlot via `overrideReason` key.
- **Session time picker** — Plan session edit dialog includes time input; default session time 10:00 AM.
- **Standalone receipt route** — `/receipt/[id]` page outside dashboard layout for clean PDF prints (auto-opens browser Print dialog).
- **Seed data fixed** — PlanSessions created for all sittings, patient emails set, non-overlapping slots, duplicates cleaned, receipt format updated, startDate on plans.
- **Server actions return `{ error }` instead of throwing** — `arrivePatient`, `completeVisit`, `createTreatmentPlan`, `bookAppointmentSlot` return error objects instead of throwing, preventing React error boundary from catching them.
- **`completeVisit` advances plan via session count** — Uses `count({ where: { status: "completed" } })` instead of incrementing `currentSittingNumber`, self-healing if sessions are manually marked.
- **`updatePlanSession` also uses session count** — Same self-healing approach for rescheduling.
- **`getTreatmentPlanById` cache removed** — Plan detail now always fetches fresh data (was 30s TTL).
- **Plan detail computes sittings from sessions** — Uses `sessions.filter(s => s.status === "completed").length` instead of relying on `currentSittingNumber`.
- **Visit resolution via overrideReason** — `getVisitById` resolves plan through `scheduleSlot.overrideReason` first, falls back to `patientId` when visit has no direct `planId`; back-fills `planId` for existing records.
- **Auto-create 24h reminders on plan creation and visit completion** — `createTreatmentPlan` and `completeVisit` now check for upcoming sessions within 24h and create+send reminders immediately.
- **Calendar loading state** — Static demo appointments and online requests section removed; loading skeleton shown while DB data fetches.
- **`toDateIST` handles date-only strings** — Added `T` separator for string dates without time component.
- **Empty-string guards** — `plannedVisitDates`, `expectedEndDate`, `startDate` treated as null instead of invalid dates.
- **Arrival workflow local state fix** — `handleArrivePatient` now stores `visitId` from server response so "Complete" button appears immediately after arrival.

### What Is Stable

- All 23 routes compile and render (0 TypeScript errors, 0 lint warnings)
- All server actions pass build
- Auth flow (login/logout/session verification)
- Patient CRUD with duplicate detection
- Treatment plan creation with auto-generated sessions + ScheduleSlot sync + auto-reminders
- Visit recording with receipt generation + plan back-fill
- Calendar with DB-connected appointment booking (arrive → complete workflow)
- Plan session edits persist and sync to calendar ScheduleSlots (self-healing progress counter)
- Reminder dispatch via Resend email API (inline + CRON)
- Audit logging on all mutations (fire-and-forget, non-blocking)
- Role-based UI visibility
- Seed data produces a fully populated demo environment
- 21 database indexes for query performance

---

## 9. Security and Reliability

### Authentication
- **JWT-based sessions** using `jose` library (HS256 algorithm)
- 8-hour token expiry
- Password hashing with bcrypt (12 salt rounds)
- Session token stored in HTTP cookie (`session_user`)
- Token verification on every protected request (middleware)

### Authorization
- **Proxy middleware** protects all dashboard routes — redirects to `/login` if no valid session
- **Middleware role enforcement:** admin-only routes (`/users`, `/settings`) redirect non-admin users; doctor-only routes (`/plans/new`) redirect non-doctor users
- **Server-side role enforcement via `requireRole()`:**
  - `requireRole("admin")` — full system access (users, settings, audit)
  - `requireRole("doctor")` — create/update treatment plans, update plan sessions
  - `requireAuth()` — any authenticated user (patients, visits, reminders, calendar)
- **Self-protection:** Admin cannot deactivate own account or change own role
- **Audit actor tracking:** All mutations include `actorId` from the session user (not the target entity)

### Protected Routes
All routes under `/(dashboard)` are protected by middleware (`src/proxy.ts`). Public paths:
- `/login`
- `/api/auth/login`
- `/api/cron/*` (requires `x-cron-secret` header, not session cookie)

### Sensitive Data Handling
- Passwords: bcrypt-hashed, never stored in plaintext
- Session tokens: stored in HTTP-only cookie (not localStorage)
- JWT secret: environment variable (`JWT_SECRET`)
- Database credentials: environment variables only (not in code)
- No patient PII logged in plaintext audit entries (before/after is JSON, but still contains data — review before production)

### Audit Logging
- Every mutation (create, update, delete) across all entity types logs to `AuditLog`
- Records: actor, entity type, entity ID, action, before/after JSON
- Immutable — logs are never updated or deleted
- Viewable on the Audit page with filtering and expandable diffs

### Validation
- **Client-side:** zod schemas validate form input before submission
- **Server-side:** zod validation on every mutation (second verification)
- **TypeScript:** strict mode enabled

### Data Integrity
- Prisma schema defines foreign key constraints with cascade deletes where appropriate
- AuditLog entityId intentionally unconstrained (no FK) to allow generic entity references
- ScheduleSlot conflict detection prevents double-booking without explicit override
- Unique email constraint on User model
- `cuid` IDs for all primary keys (collision-resistant)

### Current Limitations / Assumptions
- No rate limiting on API routes
- No CSRF protection (Next.js server actions have built-in CSRF protection via POST requirement)
- No request logging (beyond Prisma query logs)
- No encrypted audit log payloads
- No brute-force protection on login
- `JWT_SECRET` in `.env` is a development placeholder — must be changed for production
- `CRON_SECRET` in `.env` is a development placeholder — must be changed for production
- CORS not configured (not needed for same-origin)
- `Secure` cookie flag only enabled in production (`process.env.NODE_ENV === "production"`)
- The initial Prisma migration file still has `@default('sms')` for Reminder.channel — the schema has been updated to `@default("email")`; a follow-up migration will be generated on next `prisma migrate dev`

---

## 10. Design System

### Visual Style
- Clean, minimal, professional medical/clinic aesthetic
- White/gray background (`bg-background`, `bg-card`, `bg-muted`)
- Primary color accent (emerald/green tones — Zen/wellness theme)
- Subtle shadows and borders (`border-border`)
- Rounded corners (`rounded-lg`, `rounded-xl`)
- Sans-serif typography (Inter + Manrope via next/font)

### Layout
- **Fixed sidebar** (280px) on desktop — navigation + brand + user info
- **Top header bar** — search, notification bell, help, new patient button, user avatar
- **Main content area** — scrollable, padding `p-6`
- **Responsive:** sidebar collapses to sheet drawer on mobile
- Header has `backdrop-blur` glass effect

### Reusable UI Patterns

**Status Badge** (`components/features/status-badge.tsx`):
- Color-coded badges for plan status (active=emerald, draft=gray, paused=amber, completed=blue, cancelled=red)
- Used across patient cards, plan headers, visit entries, reminder lists

**Cards** (`components/ui/card.tsx`):
- Used for patient cards, stat cards, form sections, detail views
- Consistent `CardHeader` + `CardContent` structure

**Tables:**
- Used in users page, audit log page
- Clean borders, hover states, responsive overflow

**Tabs** (`components/ui/tabs.tsx`):
- Patient detail (Treatment Plan / Visit History / Reminders)
- Settings (General / Reminders / Notifications)
- Reminders (All / Pending / Sent / Failed)

**Dialogs** (`components/ui/dialog.tsx`):
- New appointment, new user, edit user, new reminder, edit session
- Consistent `DialogHeader` + `DialogContent` + `DialogFooter`

**Forms:**
- Consistent input, label, select, textarea components
- Zod validation messages shown inline

**Timeline:**
- Visit history in patient detail
- Vertical timeline with dots and connecting lines

### Status Badges by Context

| Context | Statuses |
|---|---|
| **Plan** | Draft, Active, Paused, Completed, Cancelled |
| **Visit** | Scheduled, Arrived, In Treatment, Completed, Cancelled, No Show |
| **Reminder** | Pending, Sent, Failed, Paused |
| **Schedule Slot** | Available, Booked, Blocked, Completed |

### Responsive Behavior
- Sidebar: visible on `md+`, sheet drawer on mobile
- Patient list: 2-column grid on `xl+`, single column below
- Calendar: full functionality on desktop, simplified on mobile
- Tables: horizontal scroll on small screens
- Cards: stack vertically on mobile

---

## 11. Development and Deployment Notes

### How to Run Locally

```bash
# 1. Clone and install
cd clinic-mgmt
npm install

# 2. Set up environment
# Copy or edit .env with your Supabase credentials and Resend API key

# 3. Generate Prisma client
npx prisma generate

# 4. Run migrations
npx prisma migrate dev

# 5. Seed database
npm run seed

# 6. Start dev server
npm run dev

# 7. Open http://localhost:3000
# Login with: admin@zenflow.com / password123
```

### Environment Variables

See `.env` for all required variables:

```
# Supabase (PostgreSQL)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Database connection
DATABASE_URL
DIRECT_URL

# Email (Resend)
RESEND_API_KEY
FROM_EMAIL

# App
NEXT_PUBLIC_APP_URL

# Auth
JWT_SECRET

# Cron
CRON_SECRET
```

### Available Scripts

```bash
npm run dev      # Start development server (Next.js 16)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
npm run seed     # Seed/refresh demo data
```

### Database

- **Provider:** PostgreSQL (hosted on Supabase, region `ap-northeast-2` Seoul)
- **ORM:** Prisma 6 with `prisma-client-js` generator
- **Migrations:** Managed via `prisma migrate`
- **Seed:** `prisma/seed.js` creates 4 users, 6 patients, 4 treatment plans, 17 visits, schedule slots, 8 reminders, 20 audit logs, 18 settings

### Deployment Assumptions

- Next.js 16 supports deployment to Vercel, Netlify, or any Node.js host
- PostgreSQL must be accessible (Supabase, Neon, AWS RDS, etc.)
- Resend API key required for email reminders
- CRON endpoint should be called periodically (e.g., every 5-15 minutes) via Vercel CRON, `curl` from a scheduler, or uptime monitor
- Environment variables must be configured in the deployment environment

### Current Database

Development uses a Supabase Free plan PostgreSQL instance. The `DATABASE_URL` uses PgBouncer connection pooling (`?pgbouncer=true&connection_limit=1`). **This means only ONE simultaneous database connection is available** — parallel Prisma queries (`Promise.all`) cause `P2024` pool timeout errors because the second query waits for the only connection and the 10s pool timeout expires. All DB queries must run sequentially.

21 non-PK indexes have been added across all models to compensate — sequential scans would make sequential queries prohibitively slow as data grows. The `DIRECT_URL` bypasses PgBouncer for migrations.

---

## 12. Known Limitations

### Intentionally Not Included
- **Patient portal / self-service** — No patient-facing login or appointment booking interface
- **Online booking widget** — No public booking page for patients to self-schedule
- **Payment processing** — No billing, invoice, or payment integration
- **Insurance claims** — No insurance workflow or claim generation
- **Telemedicine** — No video/audio consultation features
- **Mobile app** — No native mobile application (responsive web only)
- **Multi-language** — English only
- **File uploads** — No document/image attachment for patient records
- **Real-time notifications** — No WebSocket or push notification system
- **Analytics / Reporting** — No dashboard charts beyond stat counters, no export to CSV/PDF (Export button in audit is UI only)
- **Bulk operations** — No batch patient import, bulk reminder creation, or mass actions
- **Audit log retention** — No log rotation or archival strategy

### Partially Implemented / Gaps
- **Global search** — Search bar in the header is present in the UI but not wired to any search logic.
- **Export** — Audit page has an Export button with no backend implementation.
- **Room tracking** — Calendar page references rooms (Room 1-4) but there is no Room model or database table — rooms are hardcoded strings.
- **Consent flags** — Patient model has `consentFlags` field but no structured consent management UI.
- **`plannedVisitDates` on TreatmentPlan** — Stored as a string (likely JSON) but no structured parsing or calendar integration.
- **`connection_limit=1`** — The number one constraint and most common source of runtime errors. Any parallel Prisma queries cause `P2024` timeout. All DB queries must run sequentially.
- **No mutation-based cache invalidation** — 15+ mutations don't call `clearCache()` so cached data can be up to 30-60s stale (dashboard stats, today schedule, patient detail, search results).
- **Middleware file named `proxy.ts` instead of `middleware.ts`** — Route protection is currently non-functional; Next.js never executes it.
- **`dispatch.ts` concurrency** — `Promise.allSettled` launches up to 50 concurrent reminder dispatches, each doing 2-3 sequential DB queries. With `connection_limit=1`, this causes severe queuing and likely pool timeouts.
- **CRON trigger not set up** — `/api/cron/process-reminders` has no external caller. Reminders are sent inline at creation/completion but ongoing processing won't happen.
- **Logout redirect fallback** — Uses `NEXT_PUBLIC_APP_URL` with fallback to `http://localhost:3000`. If missing in production, users redirect to localhost.

### Technical Debt
- **No automated tests** — No unit, integration, or E2E tests. Only build-time TypeScript and lint checks.
- **Cache has no cross-request persistence** — In-memory `Map` cache is per-server-instance. In a multi-server deployment (Vercel, multiple replicas), each instance has its own cache, reducing effectiveness.
- **Seed script is idempotent for users only** — Uses `upsert` for users but `create` for most other data (deleteMany + create pattern for full reseed).
- **`src/lib/supabase.ts` is present but unused** — Supabase clients are initialized but no code uses them directly; all DB access is through Prisma.
- **`updateTreatmentPlan` lacks server-side range validation** — `stagesTotal: 0, sittingsTotal: 0` can create a plan with 0 sessions (only client-side guards exist).

---

## 13. Future Roadmap

### Near-term (Logical Next Steps)

1. **Rename middleware `proxy.ts` → `middleware.ts`** — Enable route-level protection (currently non-functional).

2. **Fix `dispatch.ts` concurrency** — Replace `Promise.allSettled` with sequential processing to prevent pool timeouts on single-connection DB.

3. **Add mutation cache invalidation** — Call `clearCache()` on all 15+ mutations missing it (patient CRUD, plan CRUD, visits, bookings, schedule).

4. **Set up CRON trigger** — Configure cron-job.org (or Vercel CRON) to hit `GET /api/cron/process-reminders` every 5-15 minutes.

5. **Add range validation to `updateTreatmentPlan`** — Server-side guard for `stagesTotal`/`sittingsTotal` to prevent 0-session plans.

6. **Harden logout redirect** — Fix `NEXT_PUBLIC_APP_URL` fallback to avoid `localhost` in production.

7. **Global search** — Wire the header search bar to search patients, plans, visits, and users.

8. **Automated tests** — Add Vitest or Playwright tests for critical flows (login, patient CRUD, booking, arrive→complete).

### Medium-term

9. **Patient portal** — Simple patient-facing page to view upcoming appointments and confirm attendance.

10. **Export/Reporting** — Implement CSV export for patients, visits, audit logs.

11. **Bulk operations** — Import patients from CSV, bulk create reminders, mass status updates.

12. **File attachments** — Upload patient documents, consent forms, treatment diagrams.

13. **Treatment plan templates** — Reusable plan templates for common conditions.

14. **SMS channel (optional future)** — If budget permits, add Twilio or similar SMS integration as an opt-in channel.

15. **Mobile improvements** — PWA support, touch-optimized calendar interactions.

### Long-term

16. **Analytics dashboard** — Charts for visit trends, patient acquisition, treatment outcomes.

17. **Insurance/billing module** — Invoice generation, payment tracking.

18. **Multi-clinic support** — Tenant isolation for multi-location practices.

19. **API for third-party integrations** — REST API for EHR integration or booking widgets.

---

*This document reflects the codebase as of May 2026. All information is based on actual implementation, not planned features.*
