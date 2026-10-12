-- ==============================================================================
-- CAMPUSGATE: STUDENT DATA MANAGEMENT, ATTENDANCE & VERIFICATION SCHEMA
-- Database: PostgreSQL 15+ (Supabase / RDS Compatible)
-- Version: 2.1.0
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES & ROLES
CREATE TYPE user_role AS ENUM (
  'student',
  'proctor',
  'technical_incharge',
  'verifier',
  'admin'
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE, -- Foreign key to auth.users if Supabase Auth is enabled
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  department VARCHAR(100),
  phone_number VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STUDENT MASTER TABLE
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  university_email VARCHAR(255) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  academic_year SMALLINT NOT NULL CHECK (academic_year BETWEEN 1 AND 5),
  semester SMALLINT NOT NULL CHECK (semester BETWEEN 1 AND 10),
  section VARCHAR(10) NOT NULL,
  admission_batch VARCHAR(20) NOT NULL,
  graduation_year INT NOT NULL,
  assigned_proctor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  account_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'inactive', 'suspended')),
  cgpa NUMERIC(4, 2) CHECK (cgpa >= 0.0 AND cgpa <= 10.0),
  backlog_count SMALLINT DEFAULT 0 CHECK (backlog_count >= 0),
  prev_semester_gpa NUMERIC(4, 2),
  phone_number VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students (roll_number);
CREATE INDEX IF NOT EXISTS idx_students_dept_year ON students (department, academic_year);
CREATE INDEX IF NOT EXISTS idx_students_proctor ON students (assigned_proctor_id);

-- 3. ATTENDANCE IMPORT BATCHES
CREATE TABLE IF NOT EXISTS attendance_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_reference_code VARCHAR(100) UNIQUE NOT NULL,
  source_file_name VARCHAR(255) NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_rows INT NOT NULL DEFAULT 0,
  valid_rows INT NOT NULL DEFAULT 0,
  invalid_rows INT NOT NULL DEFAULT 0,
  imported_rows INT NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ATTENDANCE RECORDS (OFFICIAL ATTENDANCE LOGS)
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) NOT NULL,
  classes_conducted INT NOT NULL CHECK (classes_conducted >= 0),
  classes_attended INT NOT NULL CHECK (classes_attended >= 0),
  calculated_percentage NUMERIC(5, 2) CHECK (calculated_percentage >= 0.0 AND calculated_percentage <= 100.0),
  supplied_percentage NUMERIC(5, 2),
  data_as_of DATE NOT NULL,
  import_batch_id UUID REFERENCES attendance_import_batches(id) ON DELETE SET NULL,
  source VARCHAR(50) NOT NULL DEFAULT 'import',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_attended_le_conducted CHECK (classes_attended <= classes_conducted)
);

CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_roll ON attendance_records (roll_number);

-- 5. SYSTEM CONFIGURATION & THRESHOLDS
CREATE TABLE IF NOT EXISTS system_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  minimum_attendance_threshold NUMERIC(5, 2) NOT NULL DEFAULT 75.0,
  freshness_threshold_days INT NOT NULL DEFAULT 30,
  enforce_strict_verification BOOLEAN NOT NULL DEFAULT TRUE,
  academic_policy_requirement BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. VERIFICATION CASES (AUDIT & DISCREPANCY QUEUE)
CREATE TYPE verification_status_type AS ENUM (
  'Open',
  'Assigned',
  'Under Review',
  'Needs Correction',
  'Awaiting Reverification',
  'Verified',
  'Unable to Verify',
  'Closed'
);

CREATE TABLE IF NOT EXISTS verification_cases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_reference_id VARCHAR(50) UNIQUE NOT NULL, -- e.g. VER-2026-001
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) NOT NULL,
  issue_category VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  supporting_doc_name VARCHAR(255),
  supporting_doc_url TEXT,
  assigned_reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status verification_status_type NOT NULL DEFAULT 'Open',
  reviewer_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_cases (status);
CREATE INDEX IF NOT EXISTS idx_verification_student ON verification_cases (student_id);

-- 7. VERIFICATION COMMENTS & DIALOGUE
CREATE TABLE IF NOT EXISTS verification_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  case_id UUID NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name VARCHAR(255) NOT NULL,
  author_role user_role NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. SHARED EVENT REQUESTS & PROCTOR HANDOFF
CREATE TABLE IF NOT EXISTS event_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_reference_code VARCHAR(100) UNIQUE NOT NULL, -- e.g. EVT-REQ-2026-101
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_name VARCHAR(255) NOT NULL,
  event_category VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  proctor_recommendation VARCHAR(50) CHECK (proctor_recommendation IN ('Recommended', 'Rejected', 'Needs Clarification')),
  proctor_remarks TEXT,
  proctor_reviewed_at TIMESTAMPTZ,
  technical_incharge_decision VARCHAR(50) DEFAULT 'Pending' CHECK (technical_incharge_decision IN ('Approved', 'Rejected', 'Pending')),
  technical_incharge_remarks TEXT,
  technical_incharge_decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. IMMUTABLE AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name VARCHAR(255) NOT NULL,
  actor_role user_role NOT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs (created_at DESC);
