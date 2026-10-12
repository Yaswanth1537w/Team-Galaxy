import { AttendanceImportRow, Student } from '../types';

export interface ParseAndValidateResult {
  fileName: string;
  totalRows: number;
  validRows: AttendanceImportRow[];
  invalidRows: AttendanceImportRow[];
  duplicateRows: AttendanceImportRow[];
  warningRows: AttendanceImportRow[];
  detectedColumns: string[];
  columnMappings: Record<string, string>;
  canCommit: boolean;
}

export class ImportValidator {
  /**
   * Normalizes raw key names from Excel or CSV headers to standard field identifiers
   */
  public static detectMapping(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};

    headers.forEach(h => {
      const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

      if (clean.includes('roll') || clean === 'rollno' || clean === 'rollnumber' || clean === 'regno') {
        mapping['rollNumber'] = h;
      } else if (clean.includes('name') || clean === 'studentname') {
        mapping['studentName'] = h;
      } else if (clean.includes('email') || clean === 'mail') {
        mapping['universityEmail'] = h;
      } else if (clean.includes('dept') || clean.includes('department')) {
        mapping['department'] = h;
      } else if (clean.includes('branch') || clean.includes('program')) {
        mapping['branch'] = h;
      } else if (clean === 'year' || clean.includes('academicyear')) {
        mapping['academicYear'] = h;
      } else if (clean === 'sem' || clean.includes('semester')) {
        mapping['semester'] = h;
      } else if (clean === 'sec' || clean.includes('section')) {
        mapping['section'] = h;
      } else if (clean.includes('conducted') || clean.includes('totalclasses')) {
        mapping['classesConducted'] = h;
      } else if (clean.includes('attended') || clean.includes('present')) {
        mapping['classesAttended'] = h;
      } else if (clean.includes('percentage') || clean === 'attendance') {
        mapping['suppliedPercentage'] = h;
      } else if (clean.includes('date') || clean.includes('asof') || clean.includes('timestamp')) {
        mapping['dataAsOf'] = h;
      } else if (clean.includes('cgpa') || clean === 'gpa') {
        mapping['cgpa'] = h;
      } else if (clean.includes('backlog')) {
        mapping['backlogCount'] = h;
      }
    });

    return mapping;
  }

  /**
   * Validates raw parsed objects against institutional rules and database integrity
   */
  public static validateRows(
    rawRows: Record<string, any>[],
    mapping: Record<string, string>,
    existingStudents: Student[]
  ): {
    rows: AttendanceImportRow[];
    validRows: AttendanceImportRow[];
    invalidRows: AttendanceImportRow[];
    duplicateRows: AttendanceImportRow[];
    warningRows: AttendanceImportRow[];
  } {
    const seenRollNumbersInFile = new Set<string>();
    const allValidatedRows: AttendanceImportRow[] = [];

    const getVal = (row: Record<string, any>, key: string) => {
      const header = mapping[key];
      return header ? row[header] : undefined;
    };

    rawRows.forEach((raw, idx) => {
      const rowNumber = idx + 2; // 1-based, accounting for header row
      const errors: string[] = [];
      const warnings: string[] = [];

      // Extract roll number
      const rawRoll = getVal(raw, 'rollNumber');
      const rollNumber = rawRoll ? String(rawRoll).trim().toUpperCase() : '';

      if (!rollNumber) {
        errors.push('Missing Roll Number: Every student attendance record must contain a unique roll number.');
      }

      // Check duplicates within the uploaded file
      let isDuplicateInFile = false;
      if (rollNumber) {
        if (seenRollNumbersInFile.has(rollNumber)) {
          errors.push(`Duplicate Roll Number in file: "${rollNumber}" appears more than once in this spreadsheet.`);
          isDuplicateInFile = true;
        } else {
          seenRollNumbersInFile.add(rollNumber);
        }
      }

      // Check if student exists in master database
      const existingStudent = existingStudents.find(s => s.rollNumber.toUpperCase() === rollNumber);
      if (rollNumber && !existingStudent) {
        warnings.push(`Unmatched Student: Roll number ${rollNumber} not registered in current master database. Profile will be auto-provisioned if student name is provided.`);
      }

      // Student Name & Email validation (if provided)
      const studentName = getVal(raw, 'studentName') ? String(getVal(raw, 'studentName')).trim() : undefined;
      const email = getVal(raw, 'universityEmail') ? String(getVal(raw, 'universityEmail')).trim() : undefined;
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        warnings.push(`Invalid Email Format: "${email}" is not a well-formed institutional email address.`);
      }

      // Class counts validation
      const rawConducted = getVal(raw, 'classesConducted');
      const rawAttended = getVal(raw, 'classesAttended');

      let classesConducted: number | undefined;
      let classesAttended: number | undefined;

      if (rawConducted !== undefined && rawConducted !== '' && rawConducted !== null) {
        const parsed = Number(rawConducted);
        if (isNaN(parsed) || parsed < 0) {
          errors.push(`Invalid Classes Conducted: "${rawConducted}" must be a non-negative number.`);
        } else {
          classesConducted = Math.floor(parsed);
        }
      }

      if (rawAttended !== undefined && rawAttended !== '' && rawAttended !== null) {
        const parsed = Number(rawAttended);
        if (isNaN(parsed) || parsed < 0) {
          errors.push(`Invalid Classes Attended: "${rawAttended}" must be a non-negative number.`);
        } else {
          classesAttended = Math.floor(parsed);
        }
      }

      // Invariant: Attended cannot exceed Conducted
      if (classesConducted !== undefined && classesAttended !== undefined) {
        if (classesAttended > classesConducted) {
          errors.push(`Logical Error: Classes Attended (${classesAttended}) cannot exceed Classes Conducted (${classesConducted}).`);
        }
      }

      // Supplied percentage consistency check
      const rawSupplied = getVal(raw, 'suppliedPercentage');
      let suppliedPercentage: number | undefined;
      if (rawSupplied !== undefined && rawSupplied !== '' && rawSupplied !== null) {
        const parsedSupplied = parseFloat(String(rawSupplied).replace('%', ''));
        if (isNaN(parsedSupplied) || parsedSupplied < 0 || parsedSupplied > 100) {
          errors.push(`Invalid Supplied Percentage: "${rawSupplied}" must be a numeric value between 0 and 100.`);
        } else {
          suppliedPercentage = Number(parsedSupplied.toFixed(2));
          // If both counts and supplied percentage are given, check consistency!
          if (classesConducted && classesConducted > 0 && classesAttended !== undefined) {
            const authoritative = Number(((classesAttended / classesConducted) * 100).toFixed(1));
            const suppliedRounded = Number(suppliedPercentage.toFixed(1));
            if (Math.abs(authoritative - suppliedRounded) > 1.5) {
              warnings.push(`Percentage Inconsistency: Supplied percentage (${suppliedPercentage}%) conflicts with calculated ratio (${authoritative}% from ${classesAttended}/${classesConducted}). Authoritative calculated value will be used.`);
            }
          }
        }
      }

      // Academic fields validation
      const rawYear = getVal(raw, 'academicYear');
      const academicYear = rawYear ? Number(rawYear) : undefined;
      if (academicYear !== undefined && (isNaN(academicYear) || academicYear < 1 || academicYear > 5)) {
        warnings.push(`Academic Year "${rawYear}" is unusual (expected 1-4).`);
      }

      const rawSem = getVal(raw, 'semester');
      const semester = rawSem ? Number(rawSem) : undefined;
      if (semester !== undefined && (isNaN(semester) || semester < 1 || semester > 8)) {
        warnings.push(`Semester "${rawSem}" should normally be between 1 and 8.`);
      }

      const rawCgpa = getVal(raw, 'cgpa');
      let cgpa: number | undefined;
      if (rawCgpa !== undefined && rawCgpa !== '') {
        const parsed = Number(rawCgpa);
        if (isNaN(parsed) || parsed < 0 || parsed > 10) {
          warnings.push(`CGPA "${rawCgpa}" outside valid range 0.0 - 10.0.`);
        } else {
          cgpa = parsed;
        }
      }

      const rawBacklogs = getVal(raw, 'backlogCount');
      let backlogCount: number | undefined;
      if (rawBacklogs !== undefined && rawBacklogs !== '') {
        const parsed = Number(rawBacklogs);
        if (!isNaN(parsed) && parsed >= 0) {
          backlogCount = Math.floor(parsed);
        }
      }

      // Data as of date validation
      const rawDate = getVal(raw, 'dataAsOf');
      let dataAsOf: string | undefined;
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) {
          warnings.push(`Invalid Date Format: "${rawDate}". Today's date will be applied if not corrected.`);
        } else {
          dataAsOf = parsedDate.toISOString().split('T')[0];
        }
      }

      // Determine row status
      let status: 'valid' | 'invalid' | 'warning' | 'duplicate' = 'valid';
      if (errors.length > 0) {
        status = isDuplicateInFile ? 'duplicate' : 'invalid';
      } else if (warnings.length > 0) {
        status = 'warning';
      }

      const validatedRow: AttendanceImportRow = {
        rowNumber,
        rollNumber: rollNumber || 'UNKNOWN',
        studentName,
        universityEmail: email,
        department: getVal(raw, 'department') ? String(getVal(raw, 'department')).trim() : undefined,
        branch: getVal(raw, 'branch') ? String(getVal(raw, 'branch')).trim() : undefined,
        academicYear,
        semester,
        section: getVal(raw, 'section') ? String(getVal(raw, 'section')).trim().toUpperCase() : undefined,
        admissionBatch: getVal(raw, 'admissionBatch') ? String(getVal(raw, 'admissionBatch')).trim() : undefined,
        graduationYear: getVal(raw, 'graduationYear') ? Number(getVal(raw, 'graduationYear')) : undefined,
        classesConducted,
        classesAttended,
        suppliedPercentage,
        dataAsOf,
        cgpa,
        backlogCount,
        status,
        errors,
        warnings,
        isEligibleForImport: errors.length === 0,
      };

      allValidatedRows.push(validatedRow);
    });

    const validRows = allValidatedRows.filter(r => r.status === 'valid');
    const warningRows = allValidatedRows.filter(r => r.status === 'warning');
    const invalidRows = allValidatedRows.filter(r => r.status === 'invalid');
    const duplicateRows = allValidatedRows.filter(r => r.status === 'duplicate');

    return {
      rows: allValidatedRows,
      validRows: [...validRows, ...warningRows], // rows with only warnings are eligible
      invalidRows,
      duplicateRows,
      warningRows,
    };
  }

  /**
   * Generates downloadable CSV template content
   */
  public static getCsvTemplate(type: 'attendance' | 'student_master' = 'attendance'): string {
    if (type === 'student_master') {
      return `Roll Number,Student Name,University Email,Department,Branch,Academic Year,Semester,Section,Admission Batch,Graduation Year,CGPA,Backlog Count
22CS0150,Kiran Kumar,kiran.22cs@campus.edu,Computer Science & Engineering,B.Tech CSE,3,6,A,2022-2026,2026,8.45,0
22CS0151,Sneha Sharma,sneha.22cs@campus.edu,Computer Science & Engineering,B.Tech CSE,3,6,B,2022-2026,2026,7.80,1
22EC0250,Vipin Roy,vipin.22ec@campus.edu,Electronics & Communication,B.Tech ECE,3,6,A,2022-2026,2026,8.10,0`;
    }

    return `Roll Number,Student Name,Department,Classes Conducted,Classes Attended,Supplied Percentage,Data As Of,Academic Year,Semester,Section
22CS0101,Aarav Sharma,Computer Science & Engineering,100,92,92.0,2026-10-12,3,6,A
22CS0102,Ananya Reddy,Computer Science & Engineering,100,69,69.0,2026-10-12,3,6,A
22CS0103,Bhavya Patel,Computer Science & Engineering,80,60,75.0,2026-10-12,3,6,B
22EC0201,Divya Nair,Electronics & Communication,90,82,91.1,2026-10-12,3,6,A
24CS0001,Samyukta Iyer,Computer Science & Engineering,50,45,90.0,2026-10-12,1,2,A`;
  }
}
