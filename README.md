# CampusGate — Student Data Intelligence & Verification Hub

> **Project 3 of Pixel to Product 2026:** Technical Event Participation Approval and Attendance Monitoring Portal.
> Built as an institutional mediator bridging the Student, Verification Reviewers, Faculty Proctors, and Technical-Event In-Charge approval stages.

---

## 🏛️ System Overview

The **Student Data Intelligence & Verification Hub** provides a single source of truth for:
1. **Student Master Information**: Profile fields, academic year, semester, section, and mentor assignments.
2. **Excel (.xlsx, .xls) and CSV Import Center**: Multi-step column detection, row diagnosis, and safe batch commits.
3. **Attendance Intelligence Engine**: Invariant calculations (`(Attended / Conducted) * 100`), zero-conducted handling (`Unavailable`), configurable institutional thresholds (default 75%), and data freshness policies.
4. **Verification Queue**: Review workflow for flagged discrepancies (attendance mismatch, missing documents, outdated records) with full comment threads and separation of duties.
5. **Proctor & Technical Head Handoff**: Verified attendance dossiers for faculty mentors and authoritative approval decisions for Technical Heads.
6. **Reports, Dashboards, and Immutability Logs**: Recharts analytics, instant Excel/CSV data exports, and audit logging.

---

## 🚀 Quickstart & Local Execution

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Run Unit and Verification Tests
```bash
npx vitest run
```

### 4. Build for Production
```bash
npm run build
```

---

## 📊 Role-Based Access Control (RBAC) Simulation

Use the top-right header role selector to test all actor perspectives:
- **Technical-Event In-Charge (`technical_incharge`)**: Imports attendance spreadsheets, adjusts minimum thresholds, and authorizes final event permissions.
- **Assigned Proctor / Mentor (`proctor`)**: Sees only assigned mentee students, inspects attendance dossiers, and submits recommendations (`Recommended`, `Rejected`, `Needs Clarification`).
- **Authorized Verifier (`verifier`)**: Coordinates open issues in the verification queue, inspects medical/OD certificates, and sets verification status.
- **Student Portal (`student`)**: Aarav Sharma (22CS0101) personal portal showing attendance percentage, explainable eligibility breakdown, and event application status.
- **Institutional Admin (`admin`)**: Accesses master database, system configuration, and audit logs.

---

## 📑 Testing Excel and CSV Imports

1. Navigate to **"Excel & CSV Import Center"** (`#import`).
2. Download one of the official templates:
   - `attendance_template_v2.csv`
   - `student_master_template_v2.csv`
3. Upload the template or any `.xlsx` / `.csv` file.
4. **Step B**: Map detected spreadsheet headers to target database fields (e.g., Roll Number, Conducted, Attended).
5. **Step C & D**: Review the row-by-row health diagnosis:
   - Missing roll numbers
   - Classes attended exceeding classes conducted
   - Conflicting supplied percentages
   - Duplicates within spreadsheet
6. Check the explicit confirmation box and click **"Safely Commit Batch to Master Database"**.
7. The Dashboard, Master Database, Proctor Handoffs, and Verification Queue immediately update.

---

## 🗄️ Database Architecture & Migrations

- The complete PostgreSQL schema migration is available at:
  [`supabase/migrations/20261012_student_attendance_schema.sql`](file:///c:/Users/Yaswanth/Documents/CampusGate/supabase/migrations/20261012_student_attendance_schema.sql)
- Includes entities for `profiles`, `students`, `attendance_records`, `attendance_import_batches`, `system_configurations`, `verification_cases`, `verification_comments`, `event_requests`, and `audit_logs`.
- Copy `.env.example` to `.env` to connect live Supabase credentials when ready.

---

## 🔗 Teammate Frontend Integration Endpoints

All data and business logic are cleanly decoupled into typed service layers:
- Data Store: [`src/services/dataStore.ts`](file:///c:/Users/Yaswanth/Documents/CampusGate/src/services/dataStore.ts)
- Import Validator: [`src/services/importValidator.ts`](file:///c:/Users/Yaswanth/Documents/CampusGate/src/services/importValidator.ts)
- Types & Interfaces: [`src/types/index.ts`](file:///c:/Users/Yaswanth/Documents/CampusGate/src/types/index.ts)
