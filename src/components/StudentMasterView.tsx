import React, { useState } from 'react';
import {
  Search,
  Filter,
  UserPlus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  HelpCircle,
  Download,
  GraduationCap,
  ChevronRight,
  X,
  FileText,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { Student, EligibilityResult, AttendanceRecord } from '../types';
import { useAuth } from '../context/AuthContext';

export const StudentMasterView: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterEligibility, setFilterEligibility] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'attendance' | 'academic' | 'verification'>('profile');

  const students = dataStore.getStudents();
  const config = dataStore.getConfig();

  // Proctor restriction: if currentUser is proctor, show only assigned students
  const filteredByRole = currentUser.role === 'proctor'
    ? students.filter(s => s.assignedProctorId === currentUser.id)
    : students;

  // Filter students based on UI selections
  const displayedStudents = filteredByRole.filter(student => {
    // Search query
    const matchSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;

    // Department filter
    if (filterDept !== 'all' && student.department !== filterDept) return false;

    // Academic Year filter
    if (filterYear !== 'all' && student.academicYear.toString() !== filterYear) return false;

    // Eligibility filter
    if (filterEligibility !== 'all') {
      const att = dataStore.getAttendanceForStudent(student.rollNumber);
      const elig = dataStore.calculateEligibility(student, att);
      if (elig.status !== filterEligibility) return false;
    }

    return true;
  });

  const uniqueDepts = Array.from(new Set(students.map(s => s.department)));

  // Render Status Badge
  const renderStatusBadge = (elig: EligibilityResult) => {
    switch (elig.status) {
      case 'Eligible':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle size={12} /> Eligible ({elig.calculatedPercentage}%)
          </span>
        );
      case 'Below Threshold':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <XCircle size={12} /> Deficit ({elig.calculatedPercentage}%)
          </span>
        );
      case 'Verification Required':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
            <ShieldAlert size={12} /> In Review
          </span>
        );
      case 'Outdated Data':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
            <Clock size={12} /> Outdated
          </span>
        );
      case 'Attendance Unavailable':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
            <HelpCircle size={12} /> Unavailable
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Master Database</h1>
          <p className="text-sm text-slate-500 mt-1">
            Institutional directory with linked attendance histories, verification flags, and mentors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser.role === 'proctor' && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold border border-indigo-200">
              Filtered: Assigned Mentee Students Only
            </span>
          )}
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by student name or roll number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Departments</option>
            {uniqueDepts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          {/* Academic Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          {/* Eligibility Filter */}
          <select
            value={filterEligibility}
            onChange={(e) => setFilterEligibility(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Eligibility Statuses</option>
            <option value="Eligible">Eligible (≥{config.minimumAttendanceThreshold}%)</option>
            <option value="Below Threshold">Below Threshold (&lt;{config.minimumAttendanceThreshold}%)</option>
            <option value="Verification Required">Verification Required</option>
            <option value="Outdated Data">Outdated Data</option>
            <option value="Attendance Unavailable">Unavailable</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Showing {displayedStudents.length} of {students.length} students
        </span>
      </div>

      {/* Main Student Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Roll Number</th>
                <th className="p-4">Student Name</th>
                <th className="p-4">Department & Branch</th>
                <th className="p-4">Year / Sem / Sec</th>
                <th className="p-4">Attendance & Eligibility</th>
                <th className="p-4">Assigned Proctor</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No student records matching current filters.
                  </td>
                </tr>
              ) : (
                displayedStudents.map(student => {
                  const att = dataStore.getAttendanceForStudent(student.rollNumber);
                  const elig = dataStore.calculateEligibility(student, att);

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-mono font-bold text-slate-900">{student.rollNumber}</td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{student.name}</div>
                        <div className="text-[11px] text-slate-400">{student.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800">{student.department}</div>
                        <div className="text-[11px] text-slate-500">{student.branch}</div>
                      </td>
                      <td className="p-4 font-medium">
                        Year {student.academicYear} · Sem {student.semester} · Sec {student.section}
                      </td>
                      <td className="p-4">
                        {renderStatusBadge(elig)}
                      </td>
                      <td className="p-4 text-slate-600">
                        {student.assignedProctorName}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg font-semibold transition-colors"
                        >
                          <Eye size={13} />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detailed Drawer / Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedStudent.name} ({selectedStudent.rollNumber})
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedStudent.department} · Batch {selectedStudent.admissionBatch}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-5 bg-white text-xs font-semibold gap-6">
              {[
                { id: 'profile', label: 'Student Profile' },
                { id: 'attendance', label: 'Attendance Intelligence' },
                { id: 'academic', label: 'Academic Standing' },
                { id: 'verification', label: 'Verification & Quality' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`py-3 border-b-2 transition-colors ${
                    activeTab === t.id
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {activeTab === 'profile' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">University Roll Number</span>
                    <span className="font-mono font-bold text-slate-900">{selectedStudent.rollNumber}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Email</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.email}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Department & Program</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.department} ({selectedStudent.branch})</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Cohort & Section</span>
                    <span className="font-semibold text-slate-900">Year {selectedStudent.academicYear}, Sem {selectedStudent.semester}, Sec {selectedStudent.section}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Assigned Proctor / Mentor</span>
                    <span className="font-semibold text-slate-900">{selectedStudent.assignedProctorName}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block mb-0.5">Account Status</span>
                    <span className="capitalize font-bold text-emerald-700">{selectedStudent.status}</span>
                  </div>
                </div>
              )}

              {activeTab === 'attendance' && (() => {
                const att = dataStore.getAttendanceForStudent(selectedStudent.rollNumber);
                const elig = dataStore.calculateEligibility(selectedStudent, att);
                return (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <span className="text-slate-400 block">Eligibility Outcome</span>
                        <div className="mt-1">{renderStatusBadge(elig)}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Calculated Ratio</span>
                        <span className="text-base font-bold text-slate-900">
                          {elig.classesAttended} / {elig.classesConducted} classes
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/50 space-y-2">
                      <span className="font-bold text-indigo-900 block">Explainable Eligibility Summary:</span>
                      <p className="text-slate-700 leading-relaxed">{elig.explanation}</p>
                      <div className="pt-2 border-t border-indigo-100/80 flex justify-between text-[11px] text-slate-500">
                        <span>Rule Engine: {elig.ruleVersion}</span>
                        <span>Evaluated: {new Date(elig.calculatedAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'academic' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 block">Cumulative CGPA</span>
                      <span className="text-xl font-bold text-slate-900 mt-1 block">{selectedStudent.cgpa ?? 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 block">Prev Semester GPA</span>
                      <span className="text-xl font-bold text-slate-900 mt-1 block">{selectedStudent.prevSemesterGpa ?? 'N/A'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <span className="text-slate-400 block">Active Backlogs</span>
                      <span className={`text-xl font-bold mt-1 block ${selectedStudent.backlogCount ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {selectedStudent.backlogCount ?? 0}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 italic">
                    * Policy reminder: Academic performance metrics are tracked separately and do not alter official attendance eligibility thresholds.
                  </p>
                </div>
              )}

              {activeTab === 'verification' && (() => {
                const cases = dataStore.getVerificationCases().filter(v => v.rollNumber === selectedStudent.rollNumber);
                return (
                  <div className="space-y-3">
                    {cases.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">No data quality or verification issues logged for this student.</p>
                    ) : (
                      cases.map(c => (
                        <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-1">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-indigo-600">{c.id}: {c.issueCategory}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">{c.status}</span>
                          </div>
                          <p className="text-slate-600">{c.reviewerRemarks}</p>
                          <div className="text-[10px] text-slate-400 pt-1">
                            Reviewer: {c.assignedReviewerName} · Created: {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
