import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Printer,
  Table,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { dataStore } from '../services/dataStore';

export const ReportsAndExportsView: React.FC = () => {
  const [reportType, setReportType] = useState<string>('eligibility');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');

  const students = dataStore.getStudents();
  const config = dataStore.getConfig();
  const verifications = dataStore.getVerificationCases();
  const importBatches = dataStore.getImportBatches();

  // Filter students based on UI selections
  const filteredStudents = students.filter(s => {
    if (filterDept !== 'all' && s.department !== filterDept) return false;
    if (filterYear !== 'all' && s.academicYear.toString() !== filterYear) return false;
    return true;
  });

  const uniqueDepts = Array.from(new Set(students.map(s => s.department)));

  // Generate dynamic report rows
  const reportRows = filteredStudents.map(student => {
    const att = dataStore.getAttendanceForStudent(student.rollNumber);
    const elig = dataStore.calculateEligibility(student, att);

    return {
      rollNumber: student.rollNumber,
      name: student.name,
      department: student.department,
      branch: student.branch,
      academicYear: `Year ${student.academicYear}`,
      semester: `Sem ${student.semester}`,
      section: student.section,
      classesConducted: elig.classesConducted,
      classesAttended: elig.classesAttended,
      percentage: elig.calculatedPercentage !== null ? `${elig.calculatedPercentage}%` : 'Unavailable',
      status: elig.status,
      proctor: student.assignedProctorName,
      dataAsOf: elig.dataAsOf,
    };
  });

  // Export to Excel handler
  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance_Report');
    XLSX.writeFile(wb, `CampusGate_Attendance_Report_${Date.now()}.xlsx`);
  };

  // Export to CSV handler
  const handleExportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(reportRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CampusGate_Attendance_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print view handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Institutional Reports & Data Exports</h1>
          <p className="text-sm text-slate-500 mt-1">
            Export structured datasets for accreditation, semester audits, and technical event permissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <FileSpreadsheet size={15} /> Export Excel (.xlsx)
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Printer size={15} /> Print Summary
          </button>
        </div>
      </div>

      {/* Filter and Configuration Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 font-semibold"
          >
            <option value="eligibility">Official Attendance Eligibility Report</option>
            <option value="below_threshold">Students Below Attendance Threshold</option>
            <option value="verification">Verification Issues & Turnaround Times</option>
            <option value="import_batches">Attendance Import Batch History</option>
          </select>

          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Departments</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Academic Cohorts</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Reporting on {reportRows.length} live records
        </span>
      </div>

      {/* Printable Report Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden p-6">
        <div className="border-b border-slate-200 pb-4 mb-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              CampusGate Academic Attendance Audit Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured Institutional Eligibility Threshold: <strong>{config.minimumAttendanceThreshold}%</strong> · Generated: {new Date().toLocaleString()}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <span>ISO Compliant Data Store</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Roll Number</th>
                <th className="p-3">Student Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Cohort</th>
                <th className="p-3">Conducted</th>
                <th className="p-3">Attended</th>
                <th className="p-3">Calculated %</th>
                <th className="p-3">Eligibility Status</th>
                <th className="p-3">Assigned Proctor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reportRows.map(row => (
                <tr key={row.rollNumber} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-bold text-slate-900">{row.rollNumber}</td>
                  <td className="p-3 font-semibold text-slate-900">{row.name}</td>
                  <td className="p-3 text-slate-600">{row.department}</td>
                  <td className="p-3">{row.academicYear} / {row.section}</td>
                  <td className="p-3">{row.classesConducted}</td>
                  <td className="p-3">{row.classesAttended}</td>
                  <td className="p-3 font-bold">{row.percentage}</td>
                  <td className="p-3 font-semibold">
                    {row.status === 'Eligible' && <span className="text-emerald-700">Eligible</span>}
                    {row.status === 'Below Threshold' && <span className="text-rose-700">Below Threshold</span>}
                    {row.status === 'Verification Required' && <span className="text-amber-700">Verification Required</span>}
                    {row.status === 'Outdated Data' && <span className="text-orange-700">Outdated</span>}
                    {row.status === 'Attendance Unavailable' && <span className="text-slate-400">Unavailable</span>}
                  </td>
                  <td className="p-3 text-slate-600">{row.proctor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
