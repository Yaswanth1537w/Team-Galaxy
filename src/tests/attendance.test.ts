import { describe, it, expect } from 'vitest';
import { ImportValidator } from '../services/importValidator';
import { dataStore } from '../services/dataStore';
import { Student, AttendanceRecord } from '../types';

describe('ImportValidator Suite', () => {
  it('correctly maps fuzzy and standard spreadsheet headers', () => {
    const headers = ['Roll No', 'Student Name', 'Classes Conducted', 'Present Classes', 'Attendance %'];
    const mapping = ImportValidator.detectMapping(headers);

    expect(mapping['rollNumber']).toBe('Roll No');
    expect(mapping['studentName']).toBe('Student Name');
    expect(mapping['classesConducted']).toBe('Classes Conducted');
    expect(mapping['classesAttended']).toBe('Present Classes');
    expect(mapping['suppliedPercentage']).toBe('Attendance %');
  });

  it('detects missing roll number as an invalid error', () => {
    const rawRows = [{ 'Roll No': '', 'Classes Conducted': 100, 'Classes Attended': 80 }];
    const mapping = { rollNumber: 'Roll No', classesConducted: 'Classes Conducted', classesAttended: 'Classes Attended' };
    const res = ImportValidator.validateRows(rawRows, mapping, []);

    expect(res.invalidRows.length).toBe(1);
    expect(res.invalidRows[0].errors[0]).toContain('Missing Roll Number');
  });

  it('catches logical error when classes attended exceeds conducted', () => {
    const rawRows = [{ 'Roll No': '22CS0101', 'Classes Conducted': 80, 'Classes Attended': 95 }];
    const mapping = { rollNumber: 'Roll No', classesConducted: 'Classes Conducted', classesAttended: 'Classes Attended' };
    const res = ImportValidator.validateRows(rawRows, mapping, []);

    expect(res.invalidRows.length).toBe(1);
    expect(res.invalidRows[0].errors[0]).toContain('Classes Attended (95) cannot exceed Classes Conducted (80)');
  });

  it('detects duplicate roll numbers occurring within the same file', () => {
    const rawRows = [
      { 'Roll No': '22CS0101', 'Classes Conducted': 80, 'Classes Attended': 70 },
      { 'Roll No': '22CS0101', 'Classes Conducted': 80, 'Classes Attended': 75 },
    ];
    const mapping = { rollNumber: 'Roll No', classesConducted: 'Classes Conducted', classesAttended: 'Classes Attended' };
    const res = ImportValidator.validateRows(rawRows, mapping, []);

    expect(res.duplicateRows.length).toBe(1);
    expect(res.duplicateRows[0].errors[0]).toContain('Duplicate Roll Number in file');
  });

  it('flags warning when supplied percentage significantly conflicts with calculation', () => {
    const rawRows = [
      { 'Roll No': '22CS0101', 'Classes Conducted': 100, 'Classes Attended': 80, 'Pct': 65.0 },
    ];
    const mapping = { rollNumber: 'Roll No', classesConducted: 'Classes Conducted', classesAttended: 'Classes Attended', suppliedPercentage: 'Pct' };
    const res = ImportValidator.validateRows(rawRows, mapping, []);

    expect(res.warningRows.length).toBe(1);
    expect(res.warningRows[0].warnings.some(w => w.includes('Percentage Inconsistency'))).toBe(true);
  });
});

describe('Eligibility & Data Store Engine', () => {
  const dummyStudent: Student = {
    id: 'STU-TEST',
    rollNumber: 'TEST001',
    name: 'Test Student',
    email: 'test@campus.edu',
    department: 'CSE',
    branch: 'B.Tech CSE',
    academicYear: 3,
    semester: 6,
    section: 'A',
    admissionBatch: '2022-2026',
    graduationYear: 2026,
    assignedProctorId: 'PROC-01',
    assignedProctorName: 'Dr. Proctor',
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  };

  it('calculates 90% attendance as Eligible (>=75%)', () => {
    const att: AttendanceRecord = {
      id: 'ATT-1',
      studentId: 'STU-TEST',
      rollNumber: 'TEST001',
      classesConducted: 100,
      classesAttended: 90,
      calculatedPercentage: 90.0,
      dataAsOf: new Date().toISOString().split('T')[0],
      source: 'import',
      isFresh: true,
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    };

    const res = dataStore.calculateEligibility(dummyStudent, att);
    expect(res.status).toBe('Eligible');
    expect(res.calculatedPercentage).toBe(90.0);
    expect(res.differenceFromThreshold).toBe(15.0);
  });

  it('calculates 75% attendance exactly on boundary as Eligible', () => {
    const att: AttendanceRecord = {
      id: 'ATT-2',
      studentId: 'STU-TEST',
      rollNumber: 'TEST001',
      classesConducted: 80,
      classesAttended: 60,
      calculatedPercentage: 75.0,
      dataAsOf: new Date().toISOString().split('T')[0],
      source: 'import',
      isFresh: true,
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    };

    const res = dataStore.calculateEligibility(dummyStudent, att);
    expect(res.status).toBe('Eligible');
    expect(res.differenceFromThreshold).toBe(0.0);
  });

  it('flags below threshold correctly for 70% attendance', () => {
    const att: AttendanceRecord = {
      id: 'ATT-3',
      studentId: 'STU-TEST',
      rollNumber: 'TEST001',
      classesConducted: 100,
      classesAttended: 70,
      calculatedPercentage: 70.0,
      dataAsOf: new Date().toISOString().split('T')[0],
      source: 'import',
      isFresh: true,
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    };

    const res = dataStore.calculateEligibility(dummyStudent, att);
    expect(res.status).toBe('Below Threshold');
  });

  it('marks zero conducted classes as Attendance Unavailable', () => {
    const att: AttendanceRecord = {
      id: 'ATT-4',
      studentId: 'STU-TEST',
      rollNumber: 'TEST001',
      classesConducted: 0,
      classesAttended: 0,
      calculatedPercentage: null,
      dataAsOf: new Date().toISOString().split('T')[0],
      source: 'import',
      isFresh: true,
      createdAt: '2026-10-10',
      updatedAt: '2026-10-10',
    };

    const res = dataStore.calculateEligibility(dummyStudent, att);
    expect(res.status).toBe('Attendance Unavailable');
    expect(res.calculatedPercentage).toBeNull();
  });
});
