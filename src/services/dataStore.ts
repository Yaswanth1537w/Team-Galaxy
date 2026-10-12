import {
  Student,
  AttendanceRecord,
  VerificationCase,
  EligibilityResult,
  EligibilityStatus,
  SystemConfig,
  AttendanceImportRow,
  AttendanceImportBatch,
  AuditLogEntry,
  EventRequestHandoff,
  NotificationItem,
  UserRole,
} from '../types';
import {
  INITIAL_STUDENTS,
  INITIAL_ATTENDANCE,
  INITIAL_VERIFICATION_CASES,
  INITIAL_EVENT_HANDOFFS,
} from '../data/initialData';

// Local storage persistent keys
const KEYS = {
  STUDENTS: 'cg_students_v2',
  ATTENDANCE: 'cg_attendance_v2',
  VERIFICATIONS: 'cg_verifications_v2',
  CONFIG: 'cg_config_v2',
  BATCHES: 'cg_import_batches_v2',
  AUDIT_LOGS: 'cg_audit_logs_v2',
  EVENT_REQUESTS: 'cg_event_requests_v2',
  NOTIFICATIONS: 'cg_notifications_v2',
};

export const DEFAULT_CONFIG: SystemConfig = {
  minimumAttendanceThreshold: 75.0,
  freshnessThresholdDays: 30,
  enforceStrictVerification: true,
  academicPolicyRequirement: false,
};

class DataStoreService {
  private inMemoryFallback: Record<string, string> = {};

  private hasStorage(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = this.hasStorage()
        ? window.localStorage.getItem(key)
        : this.inMemoryFallback[key];
      if (!item) return defaultValue;
      return JSON.parse(item) as T;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      const serialized = JSON.stringify(value);
      if (this.hasStorage()) {
        window.localStorage.setItem(key, serialized);
      } else {
        this.inMemoryFallback[key] = serialized;
      }
    } catch (e) {
      console.error(`Failed to persist key ${key}:`, e);
    }
  }

  public init() {
    if (!this.get(KEYS.STUDENTS, null)) {
      this.set(KEYS.STUDENTS, INITIAL_STUDENTS);
    }
    if (!this.get(KEYS.ATTENDANCE, null)) {
      this.set(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    }
    if (!this.get(KEYS.VERIFICATIONS, null)) {
      this.set(KEYS.VERIFICATIONS, INITIAL_VERIFICATION_CASES);
    }
    if (!this.get(KEYS.EVENT_REQUESTS, null)) {
      this.set(KEYS.EVENT_REQUESTS, INITIAL_EVENT_HANDOFFS);
    }
    if (!this.get(KEYS.CONFIG, null)) {
      this.set(KEYS.CONFIG, DEFAULT_CONFIG);
    }
    if (!this.get(KEYS.BATCHES, null)) {
      this.set(KEYS.BATCHES, [
        {
          id: 'BATCH-INITIAL',
          fileName: 'Master_Attendance_Sem_6_Oct2026.xlsx',
          totalRows: 26,
          validRows: 26,
          invalidRows: 0,
          duplicateRows: 0,
          warningRows: 0,
          importedRows: 26,
          uploadedBy: 'Prof. Sharma (Admin)',
          status: 'completed',
          createdAt: '2026-10-05T08:00:00Z',
          notes: 'Standard batch import via automated registrar synchronization',
        },
      ]);
    }
    if (!this.get(KEYS.AUDIT_LOGS, null)) {
      this.set(KEYS.AUDIT_LOGS, [
        {
          id: 'AUD-001',
          actorId: 'ADMIN-01',
          actorName: 'System Registrar',
          actorRole: 'admin',
          action: 'BATCH_IMPORT_COMMITTED',
          entityType: 'import',
          entityId: 'BATCH-INITIAL',
          details: 'Successfully imported 26 student attendance records from Master_Attendance_Sem_6_Oct2026.xlsx',
          timestamp: '2026-10-05T08:00:00Z',
        },
      ]);
    }
    if (!this.get(KEYS.NOTIFICATIONS, null)) {
      this.set(KEYS.NOTIFICATIONS, [
        {
          id: 'NOTIF-001',
          title: 'System Initialized',
          message: 'CampusGate Student Intelligence & Verification Hub loaded successfully.',
          category: 'import',
          timestamp: new Date().toISOString(),
          isRead: false,
        },
      ]);
    }
  }

  // --- CONFIGURATION ---
  public getConfig(): SystemConfig {
    return this.get<SystemConfig>(KEYS.CONFIG, DEFAULT_CONFIG);
  }

  public updateConfig(config: Partial<SystemConfig>, actorRole: UserRole = 'admin'): SystemConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    this.set(KEYS.CONFIG, updated);
    this.logAudit({
      actorId: 'CURRENT_USER',
      actorName: 'System User',
      actorRole,
      action: 'CONFIG_UPDATED',
      entityType: 'config',
      entityId: 'SYSTEM_SETTINGS',
      details: `Threshold updated to ${updated.minimumAttendanceThreshold}%, freshness to ${updated.freshnessThresholdDays} days.`,
    });
    return updated;
  }

  // --- STUDENTS ---
  public getStudents(): Student[] {
    return this.get<Student[]>(KEYS.STUDENTS, INITIAL_STUDENTS);
  }

  public getStudentById(id: string): Student | undefined {
    return this.getStudents().find(s => s.id === id || s.rollNumber.toLowerCase() === id.toLowerCase());
  }

  public saveStudent(student: Student, actorRole: UserRole = 'admin'): Student {
    const list = this.getStudents();
    const existingIndex = list.findIndex(s => s.id === student.id || s.rollNumber.toLowerCase() === student.rollNumber.toLowerCase());
    
    if (existingIndex >= 0) {
      list[existingIndex] = { ...student, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...student, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(KEYS.STUDENTS, list);
    
    this.logAudit({
      actorId: 'CURRENT_USER',
      actorName: 'Administrative Coordinator',
      actorRole,
      action: existingIndex >= 0 ? 'STUDENT_UPDATED' : 'STUDENT_CREATED',
      entityType: 'student',
      entityId: student.id,
      details: `Saved student master profile for ${student.name} (${student.rollNumber}).`,
    });
    
    return student;
  }

  public deactivateStudent(id: string, actorRole: UserRole = 'admin'): void {
    const list = this.getStudents();
    const idx = list.findIndex(s => s.id === id);
    if (idx >= 0) {
      list[idx].status = 'inactive';
      this.set(KEYS.STUDENTS, list);
      this.logAudit({
        actorId: 'CURRENT_USER',
        actorName: 'Administrator',
        actorRole,
        action: 'STUDENT_DEACTIVATED',
        entityType: 'student',
        entityId: id,
        details: `Student account marked inactive: ${list[idx].rollNumber}`,
      });
    }
  }

  // --- ATTENDANCE ---
  public getAttendanceRecords(): AttendanceRecord[] {
    return this.get<AttendanceRecord[]>(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  }

  public getAttendanceForStudent(rollNumber: string): AttendanceRecord | undefined {
    return this.getAttendanceRecords().find(a => a.rollNumber.toLowerCase() === rollNumber.toLowerCase());
  }

  // --- ELIGIBILITY ENGINE ---
  public calculateEligibility(student: Student, attendance?: AttendanceRecord): EligibilityResult {
    const config = this.getConfig();
    const now = new Date();
    
    if (!attendance) {
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        classesConducted: 0,
        classesAttended: 0,
        calculatedPercentage: null,
        configuredThreshold: config.minimumAttendanceThreshold,
        differenceFromThreshold: null,
        status: 'Attendance Unavailable',
        dataAsOf: 'N/A',
        lastImportDate: 'Never',
        dataFreshnessDays: -1,
        isOutdated: false,
        explanation: 'No official attendance records have been registered or imported for this student.',
        ruleVersion: `v3.0-TH-${config.minimumAttendanceThreshold}`,
        calculatedAt: now.toISOString(),
        hasVerificationBlocker: false,
      };
    }

    // Zero classes conducted check
    if (attendance.classesConducted === 0) {
      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        classesConducted: 0,
        classesAttended: 0,
        calculatedPercentage: null,
        configuredThreshold: config.minimumAttendanceThreshold,
        differenceFromThreshold: null,
        status: 'Attendance Unavailable',
        dataAsOf: attendance.dataAsOf,
        lastImportDate: attendance.updatedAt,
        dataFreshnessDays: 0,
        isOutdated: false,
        explanation: 'Classes conducted is 0. Cannot compute percentage without completed sessions.',
        ruleVersion: `v3.0-TH-${config.minimumAttendanceThreshold}`,
        calculatedAt: now.toISOString(),
        hasVerificationBlocker: false,
      };
    }

    // Calculate percentage rigorously
    const calculated = Number(((attendance.classesAttended / attendance.classesConducted) * 100).toFixed(2));
    
    // Check data freshness
    const recordDate = new Date(attendance.dataAsOf);
    const diffTime = Math.abs(now.getTime() - recordDate.getTime());
    const freshnessDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const isOutdated = freshnessDays > config.freshnessThresholdDays;

    // Check verification issues
    const activeVerifications = this.getVerificationCases().filter(
      v => v.rollNumber.toLowerCase() === student.rollNumber.toLowerCase() &&
           ['Open', 'Assigned', 'Under Review', 'Needs Correction', 'Awaiting Reverification'].includes(v.status)
    );
    const hasVerificationBlocker = activeVerifications.length > 0;

    let status: EligibilityStatus = 'Eligible';
    let explanation = '';

    if (hasVerificationBlocker) {
      status = 'Verification Required';
      explanation = `Active verification hold [${activeVerifications[0].id}: ${activeVerifications[0].issueCategory}] requires reviewer clearance before event recommendation.`;
    } else if (isOutdated) {
      status = 'Outdated Data';
      explanation = `Attendance record is ${freshnessDays} days old (threshold: ${config.freshnessThresholdDays} days). Updated attendance import required.`;
    } else if (calculated < config.minimumAttendanceThreshold) {
      status = 'Below Threshold';
      const deficit = (config.minimumAttendanceThreshold - calculated).toFixed(1);
      explanation = `Current attendance (${calculated}%) is below the configured institutional requirement of ${config.minimumAttendanceThreshold}% (${deficit}% deficit).`;
    } else {
      status = 'Eligible';
      const surplus = (calculated - config.minimumAttendanceThreshold).toFixed(1);
      explanation = `Attendance (${calculated}%) meets the ${config.minimumAttendanceThreshold}% requirement (+${surplus}% above threshold).`;
    }

    return {
      studentId: student.id,
      rollNumber: student.rollNumber,
      classesConducted: attendance.classesConducted,
      classesAttended: attendance.classesAttended,
      calculatedPercentage: calculated,
      configuredThreshold: config.minimumAttendanceThreshold,
      differenceFromThreshold: Number((calculated - config.minimumAttendanceThreshold).toFixed(2)),
      status,
      dataAsOf: attendance.dataAsOf,
      lastImportDate: attendance.updatedAt,
      dataFreshnessDays: freshnessDays,
      isOutdated,
      explanation,
      ruleVersion: `v3.0-TH-${config.minimumAttendanceThreshold}`,
      calculatedAt: now.toISOString(),
      hasVerificationBlocker,
    };
  }

  // --- VERIFICATION CASES ---
  public getVerificationCases(): VerificationCase[] {
    return this.get<VerificationCase[]>(KEYS.VERIFICATIONS, INITIAL_VERIFICATION_CASES);
  }

  public saveVerificationCase(item: VerificationCase, actorRole: UserRole = 'verifier'): VerificationCase {
    const list = this.getVerificationCases();
    const idx = list.findIndex(v => v.id === item.id);
    if (idx >= 0) {
      list[idx] = { ...item, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({ ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }
    this.set(KEYS.VERIFICATIONS, list);

    this.logAudit({
      actorId: 'CURRENT_USER',
      actorName: 'Authorized Verifier',
      actorRole,
      action: idx >= 0 ? 'VERIFICATION_UPDATED' : 'VERIFICATION_CREATED',
      entityType: 'verification',
      entityId: item.id,
      details: `Case ${item.id} status set to "${item.status}" for ${item.studentName} (${item.rollNumber}). Remarks: ${item.reviewerRemarks || 'None'}`,
    });

    this.addNotification({
      title: `Verification Case ${item.status}: ${item.id}`,
      message: `${item.studentName} (${item.rollNumber}) updated by ${item.assignedReviewerName}.`,
      category: 'verification',
      link: '/verification',
    });

    return item;
  }

  public addVerificationComment(caseId: string, authorName: string, authorRole: UserRole, text: string): void {
    const list = this.getVerificationCases();
    const c = list.find(v => v.id === caseId);
    if (c) {
      const newComment = {
        id: `COMM-${Date.now()}`,
        verificationCaseId: caseId,
        authorId: 'CURRENT_USER',
        authorName,
        authorRole,
        text,
        createdAt: new Date().toISOString(),
      };
      c.comments = [...(c.comments || []), newComment];
      c.updatedAt = new Date().toISOString();
      this.set(KEYS.VERIFICATIONS, list);

      this.logAudit({
        actorId: 'CURRENT_USER',
        actorName: authorName,
        actorRole: authorRole,
        action: 'VERIFICATION_COMMENT_ADDED',
        entityType: 'verification',
        entityId: caseId,
        details: `Note added to ${caseId}: "${text.slice(0, 50)}..."`,
      });
    }
  }

  // --- EVENT HANDOFFS (PROCTOR WORKFLOW) ---
  public getEventRequests(): EventRequestHandoff[] {
    return this.get<EventRequestHandoff[]>(KEYS.EVENT_REQUESTS, INITIAL_EVENT_HANDOFFS);
  }

  public updateProctorRecommendation(
    requestId: string,
    recommendation: 'Recommended' | 'Rejected' | 'Needs Clarification',
    remarks: string,
    proctorName: string
  ): void {
    const list = this.getEventRequests();
    const req = list.find(r => r.requestId === requestId);
    if (req) {
      req.proctorRecommendation = recommendation;
      req.proctorRemarks = remarks;
      req.proctorReviewedAt = new Date().toISOString();
      this.set(KEYS.EVENT_REQUESTS, list);

      this.logAudit({
        actorId: 'PROCTOR_USER',
        actorName: proctorName,
        actorRole: 'proctor',
        action: 'PROCTOR_RECOMMENDATION_SUBMITTED',
        entityType: 'verification',
        entityId: requestId,
        details: `Proctor ${proctorName} submitted recommendation: ${recommendation} for student ${req.studentName} (${req.rollNumber}). Remarks: ${remarks}`,
      });

      this.addNotification({
        title: `Proctor Review: ${recommendation}`,
        message: `${proctorName} recommended ${recommendation} for ${req.studentName} on ${req.eventName}.`,
        category: 'proctor',
      });
    }
  }

  public updateTechnicalInchargeDecision(
    requestId: string,
    decision: 'Approved' | 'Rejected',
    remarks: string,
    inchargeName: string
  ): void {
    const list = this.getEventRequests();
    const req = list.find(r => r.requestId === requestId);
    if (req) {
      req.technicalInchargeDecision = decision;
      req.technicalInchargeRemarks = remarks;
      req.technicalInchargeDecidedAt = new Date().toISOString();
      this.set(KEYS.EVENT_REQUESTS, list);

      this.logAudit({
        actorId: 'TECH_HEAD',
        actorName: inchargeName,
        actorRole: 'technical_incharge',
        action: 'FINAL_EVENT_DECISION',
        entityType: 'verification',
        entityId: requestId,
        details: `Technical-Event In-Charge final decision: ${decision} for ${req.studentName}. Remarks: ${remarks}`,
      });

      this.addNotification({
        title: `Final Event Decision: ${decision}`,
        message: `Event request for ${req.studentName} was ${decision} by ${inchargeName}.`,
        category: 'proctor',
      });
    }
  }

  // --- IMPORT BATCHES & SAFE COMMIT ---
  public getImportBatches(): AttendanceImportBatch[] {
    return this.get<AttendanceImportBatch[]>(KEYS.BATCHES, []);
  }

  public commitImportBatch(
    fileName: string,
    validRows: AttendanceImportRow[],
    uploader: string,
    uploaderRole: UserRole = 'technical_incharge'
  ): { batchId: string; importedCount: number } {
    const batchId = `BATCH-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const students = this.getStudents();
    const attendanceRecords = this.getAttendanceRecords();

    let importedCount = 0;

    for (const row of validRows) {
      if (!row.isEligibleForImport) continue;

      let student = students.find(s => s.rollNumber.toLowerCase() === row.rollNumber.toLowerCase());

      // If student does not exist, safely register student profile if required metadata exists
      if (!student && row.studentName) {
        student = {
          id: `STU-GEN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          rollNumber: row.rollNumber,
          name: row.studentName,
          email: row.universityEmail || `${row.rollNumber.toLowerCase()}@campus.edu`,
          department: row.department || 'Engineering',
          branch: row.branch || 'B.Tech General',
          academicYear: row.academicYear || 1,
          semester: row.semester || 1,
          section: row.section || 'A',
          admissionBatch: row.admissionBatch || '2024-2028',
          graduationYear: row.graduationYear || 2028,
          assignedProctorId: 'PROC-01',
          assignedProctorName: 'Dr. Ramesh Kumar (CSE)',
          status: 'active',
          cgpa: row.cgpa,
          backlogCount: row.backlogCount,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        students.push(student);
      }

      if (row.classesConducted !== undefined && row.classesAttended !== undefined) {
        const calculatedPercentage = row.classesConducted > 0 
          ? Number(((row.classesAttended / row.classesConducted) * 100).toFixed(2))
          : null;

        const existingAttIdx = attendanceRecords.findIndex(a => a.rollNumber.toLowerCase() === row.rollNumber.toLowerCase());
        
        const newRecord: AttendanceRecord = {
          id: existingAttIdx >= 0 ? attendanceRecords[existingAttIdx].id : `ATT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          studentId: student ? student.id : `STU-UNLINKED-${row.rollNumber}`,
          rollNumber: row.rollNumber,
          classesConducted: row.classesConducted,
          classesAttended: row.classesAttended,
          calculatedPercentage,
          suppliedPercentage: row.suppliedPercentage ?? null,
          dataAsOf: row.dataAsOf || nowIso.split('T')[0],
          importBatchId: batchId,
          source: 'import',
          isFresh: true,
          createdAt: existingAttIdx >= 0 ? attendanceRecords[existingAttIdx].createdAt : nowIso,
          updatedAt: nowIso,
        };

        if (existingAttIdx >= 0) {
          attendanceRecords[existingAttIdx] = newRecord;
        } else {
          attendanceRecords.push(newRecord);
        }

        importedCount++;
      }
    }

    // Persist records
    this.set(KEYS.STUDENTS, students);
    this.set(KEYS.ATTENDANCE, attendanceRecords);

    // Save batch summary
    const newBatch: AttendanceImportBatch = {
      id: batchId,
      fileName,
      totalRows: validRows.length,
      validRows: validRows.length,
      invalidRows: 0,
      duplicateRows: 0,
      warningRows: 0,
      importedRows: importedCount,
      uploadedBy: uploader,
      status: 'completed',
      createdAt: nowIso,
      notes: `Imported by ${uploader} (${uploaderRole}) via safe validation pipeline.`,
    };

    const batches = this.getImportBatches();
    batches.unshift(newBatch);
    this.set(KEYS.BATCHES, batches);

    this.logAudit({
      actorId: 'CURRENT_USER',
      actorName: uploader,
      actorRole: uploaderRole,
      action: 'ATTENDANCE_IMPORT_COMMITTED',
      entityType: 'import',
      entityId: batchId,
      details: `Committed batch ${batchId} from file "${fileName}". Successfully imported ${importedCount} records into master attendance database.`,
    });

    this.addNotification({
      title: 'Attendance Import Succeeded',
      message: `${importedCount} records successfully imported from ${fileName}.`,
      category: 'import',
      link: '/attendance',
    });

    return { batchId, importedCount };
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLogEntry[] {
    return this.get<AuditLogEntry[]>(KEYS.AUDIT_LOGS, []);
  }

  public logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const list = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    list.unshift(newEntry);
    this.set(KEYS.AUDIT_LOGS, list.slice(0, 300)); // maintain latest 300 entries
  }

  // --- NOTIFICATIONS ---
  public getNotifications(): NotificationItem[] {
    return this.get<NotificationItem[]>(KEYS.NOTIFICATIONS, []);
  }

  public addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'>): void {
    const list = this.getNotifications();
    list.unshift({
      ...item,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
    this.set(KEYS.NOTIFICATIONS, list.slice(0, 50));
  }

  public markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const n = list.find(i => i.id === id);
    if (n) {
      n.isRead = true;
      this.set(KEYS.NOTIFICATIONS, list);
    }
  }

  // --- RESET TO DEMO FACTORY ---
  public resetToFactoryDemo(): void {
    this.set(KEYS.STUDENTS, INITIAL_STUDENTS);
    this.set(KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
    this.set(KEYS.VERIFICATIONS, INITIAL_VERIFICATION_CASES);
    this.set(KEYS.EVENT_REQUESTS, INITIAL_EVENT_HANDOFFS);
    this.set(KEYS.CONFIG, DEFAULT_CONFIG);
  }
}

export const dataStore = new DataStoreService();
dataStore.init();
