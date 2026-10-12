import React, { useState } from 'react';
import {
  Users,
  FileCheck2,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Filter,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { dataStore } from '../services/dataStore';
import { useAuth } from '../context/AuthContext';

export const DashboardView: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const students = dataStore.getStudents();
  const attendanceRecords = dataStore.getAttendanceRecords();
  const verificationCases = dataStore.getVerificationCases();
  const importBatches = dataStore.getImportBatches();
  const config = dataStore.getConfig();

  // Filters state
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  // Filter students based on selection
  const filteredStudents = students.filter(s => {
    if (selectedDept !== 'all' && s.department !== selectedDept) return false;
    if (selectedYear !== 'all' && s.academicYear.toString() !== selectedYear) return false;
    return true;
  });

  // Calculate live database-derived metrics
  const totalActiveStudents = filteredStudents.filter(s => s.status === 'active').length;

  let totalValidAttendanceCount = 0;
  let sumAttendancePct = 0;
  let meetingThresholdCount = 0;
  let belowThresholdCount = 0;
  let missingAttendanceCount = 0;
  let outdatedAttendanceCount = 0;

  filteredStudents.forEach(student => {
    const att = dataStore.getAttendanceForStudent(student.rollNumber);
    const elig = dataStore.calculateEligibility(student, att);

    if (elig.status === 'Attendance Unavailable') {
      missingAttendanceCount++;
    } else if (elig.status === 'Outdated Data') {
      outdatedAttendanceCount++;
    } else if (elig.calculatedPercentage !== null) {
      totalValidAttendanceCount++;
      sumAttendancePct += elig.calculatedPercentage;
      if (elig.calculatedPercentage >= config.minimumAttendanceThreshold) {
        meetingThresholdCount++;
      } else {
        belowThresholdCount++;
      }
    }
  });

  const averageAttendance = totalValidAttendanceCount > 0
    ? (sumAttendancePct / totalValidAttendanceCount).toFixed(1)
    : 'N/A';

  const pendingVerificationCount = verificationCases.filter(
    v => ['Open', 'Assigned', 'Under Review', 'Needs Correction', 'Awaiting Reverification'].includes(v.status)
  ).length;

  const lastImport = importBatches.length > 0 ? importBatches[0] : null;

  // Chart 1: Eligibility distribution data
  const eligibilityPieData = [
    { name: 'Eligible (>=75%)', value: meetingThresholdCount, color: '#10b981' },
    { name: 'Below Threshold (<75%)', value: belowThresholdCount, color: '#f43f5e' },
    { name: 'Unavailable', value: missingAttendanceCount, color: '#94a3b8' },
    { name: 'Outdated Data', value: outdatedAttendanceCount, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  // Chart 2: Department-wise Average Attendance
  const departments = Array.from(new Set(students.map(s => s.department)));
  const deptBarData = departments.map(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    let totalPct = 0;
    let count = 0;
    deptStudents.forEach(s => {
      const att = dataStore.getAttendanceForStudent(s.rollNumber);
      if (att && att.calculatedPercentage !== null) {
        totalPct += att.calculatedPercentage;
        count++;
      }
    });
    return {
      name: dept.split(' ')[0], // short name
      fullName: dept,
      avg: count > 0 ? Number((totalPct / count).toFixed(1)) : 0,
      studentsCount: deptStudents.length,
    };
  });

  // Chart 3: Year-wise Student Counts
  const yearDistribution = [1, 2, 3, 4].map(yr => ({
    year: `Year ${yr}`,
    students: students.filter(s => s.academicYear === yr).length,
  }));

  // Unique departments for filter dropdown
  const uniqueDepts = Array.from(new Set(students.map(s => s.department)));

  return (
    <div className="space-y-6">
      {/* Header and Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Administrative Intelligence Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time verification metrics, institutional attendance analytics, and workflow handoffs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Configured Threshold: {config.minimumAttendanceThreshold}%
          </span>
          <button
            onClick={() => onNavigate('import')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            + Import Attendance
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-sm">
        <div className="flex items-center gap-2 text-slate-600 font-medium">
          <Filter size={16} />
          <span>Filters:</span>
        </div>
        <div>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Departments ({students.length})</option>
            {uniqueDepts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Academic Years</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
            <option value="4">4th Year</option>
          </select>
        </div>
        {(selectedDept !== 'all' || selectedYear !== 'all') && (
          <button
            onClick={() => { setSelectedDept('all'); setSelectedYear('all'); }}
            className="text-xs text-indigo-600 hover:underline font-semibold"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Live Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Students */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Students</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalActiveStudents}</span>
            <span className="text-xs text-slate-400">master records</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Across 5 engineering branches
          </p>
        </div>

        {/* Average Attendance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Attendance</span>
            <TrendingUp size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{averageAttendance}%</span>
            <span className="text-xs text-emerald-600 font-semibold">Live aggregate</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Computed from {totalValidAttendanceCount} valid records
          </p>
        </div>

        {/* Meeting Threshold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Eligible (≥{config.minimumAttendanceThreshold}%)</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{meetingThresholdCount}</span>
            <span className="text-xs text-slate-400">students</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Qualified for event nomination
          </p>
        </div>

        {/* Below Threshold */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Below Threshold (&lt;{config.minimumAttendanceThreshold}%)</span>
            <XCircle size={18} className="text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-rose-600">{belowThresholdCount}</span>
            <span className="text-xs text-slate-400">students</span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Attendance deficit detected
          </p>
        </div>
      </div>

      {/* Secondary Operational Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Verification Queue items */}
        <div 
          onClick={() => onNavigate('verification')}
          className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl cursor-pointer hover:bg-amber-100/50 transition-colors flex items-center justify-between"
        >
          <div>
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Verification Queue</span>
            <span className="text-2xl font-black text-amber-900 mt-1 block">{pendingVerificationCount} pending</span>
            <span className="text-xs text-amber-700">Requires reviewer action</span>
          </div>
          <ShieldAlert size={28} className="text-amber-600" />
        </div>

        {/* Missing Attendance */}
        <div className="bg-slate-100/80 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Missing Attendance</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{missingAttendanceCount}</span>
            <span className="text-xs text-slate-500">0 recorded classes</span>
          </div>
          <HelpCircle size={28} className="text-slate-400" />
        </div>

        {/* Outdated Attendance */}
        <div className="bg-orange-50/60 border border-orange-200/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-orange-800 uppercase tracking-wider block">Outdated Data</span>
            <span className="text-2xl font-black text-orange-900 mt-1 block">{outdatedAttendanceCount}</span>
            <span className="text-xs text-orange-700">&gt;{config.freshnessThresholdDays} days old</span>
          </div>
          <Clock size={28} className="text-orange-500" />
        </div>

        {/* Last Batch Import Date */}
        <div className="bg-indigo-50/60 border border-indigo-200/80 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-indigo-800 uppercase tracking-wider block">Latest Batch Sync</span>
            <span className="text-sm font-bold text-indigo-950 mt-1 block truncate max-w-[150px]">
              {lastImport ? lastImport.fileName : 'None'}
            </span>
            <span className="text-xs text-indigo-700">
              {lastImport ? new Date(lastImport.createdAt).toLocaleDateString() : 'Awaiting upload'}
            </span>
          </div>
          <FileCheck2 size={28} className="text-indigo-600" />
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Eligibility Breakdown Pie */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Attendance Eligibility Breakdown</h2>
              <p className="text-xs text-slate-500">Proportion of student body meeting requirements</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={eligibilityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {eligibilityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Students`, name]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department-wise Average Attendance Bar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Department Attendance Averages</h2>
              <p className="text-xs text-slate-500">Benchmark across academic faculties</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Avg Attendance']}
                  labelFormatter={(name) => {
                    const found = deptBarData.find(d => d.name === name);
                    return found ? found.fullName : name;
                  }}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="avg" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Year-wise Student Counts & Recent Audit Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Year-wise Student Enrollment */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-1">
          <h2 className="text-base font-bold text-slate-900 mb-1">Academic Year Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Active enrolled undergraduate cohorts</p>
          <div className="space-y-3">
            {yearDistribution.map(item => (
              <div key={item.year} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                  <span>{item.year}</span>
                  <span>{item.students} students</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(item.students / (students.length || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Action Navigation Panels */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-1">Operational Workflows & Quick Links</h2>
          <p className="text-xs text-slate-500 mb-4">Jump directly into high-priority coordination tasks</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => onNavigate('import')}
              className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-indigo-600 mb-2">
                <FileCheck2 size={20} />
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Attendance Import Center</h3>
              <p className="text-xs text-slate-500 mt-1">Multi-step preview, validation, and safe database commit.</p>
            </div>

            <div
              onClick={() => onNavigate('verification')}
              className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/50 hover:bg-amber-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <AlertTriangle size={20} />
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Verification Queue</h3>
              <p className="text-xs text-slate-500 mt-1">Review flagged attendance discrepancies and documents.</p>
            </div>

            <div
              onClick={() => onNavigate('proctor')}
              className="p-4 rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/50 hover:bg-emerald-50/30 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <CheckCircle2 size={20} />
                <ArrowUpRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Proctor Handoff</h3>
              <p className="text-xs text-slate-500 mt-1">Verified attendance summaries for proctor and technical heads.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
