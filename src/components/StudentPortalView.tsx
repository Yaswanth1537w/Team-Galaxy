import React from 'react';
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  Calendar,
  BookOpen,
  Award,
  AlertCircle,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { useAuth } from '../context/AuthContext';

export const StudentPortalView: React.FC = () => {
  const { currentUser, currentStudentProfile } = useAuth();
  const config = dataStore.getConfig();

  if (!currentStudentProfile) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
        <h2 className="text-lg font-bold text-slate-800">No Student Profile Linked</h2>
        <p className="text-xs text-slate-500 mt-1">Switch to Student Portal role from the top-right header selector.</p>
      </div>
    );
  }

  const att = dataStore.getAttendanceForStudent(currentStudentProfile.rollNumber);
  const elig = dataStore.calculateEligibility(currentStudentProfile, att);
  const myRequests = dataStore.getEventRequests().filter(r => r.rollNumber === currentStudentProfile.rollNumber);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
              Student Attendance & Eligibility Portal
            </span>
            <h1 className="text-2xl font-bold mt-1">{currentStudentProfile.name}</h1>
            <p className="text-xs text-indigo-200 mt-1">
              {currentStudentProfile.rollNumber} · {currentStudentProfile.department} · Year {currentStudentProfile.academicYear} (Sec {currentStudentProfile.section})
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-indigo-300 block">Assigned Faculty Mentor</span>
            <span className="text-sm font-semibold">{currentStudentProfile.assignedProctorName}</span>
          </div>
        </div>
      </div>

      {/* Primary Attendance Eligibility Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Current Semester Attendance Standing</h2>
            <p className="text-xs text-slate-500">Evaluated against the {config.minimumAttendanceThreshold}% institutional event policy</p>
          </div>

          <div>
            {elig.status === 'Eligible' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <CheckCircle2 size={16} /> Eligible for Technical Events ({elig.calculatedPercentage}%)
              </span>
            )}
            {elig.status === 'Below Threshold' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                <XCircle size={16} /> Below Threshold ({elig.calculatedPercentage}%)
              </span>
            )}
            {elig.status === 'Verification Required' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                <ShieldAlert size={16} /> Verification In Progress
              </span>
            )}
            {elig.status === 'Attendance Unavailable' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                <HelpCircle size={16} /> Attendance Unavailable
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-xs text-slate-400 block">Classes Conducted</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{elig.classesConducted}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-xs text-slate-400 block">Classes Attended</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{elig.classesAttended}</span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-xs text-slate-400 block">Attendance %</span>
            <span className={`text-2xl font-bold mt-1 block ${elig.calculatedPercentage && elig.calculatedPercentage >= config.minimumAttendanceThreshold ? 'text-emerald-600' : 'text-rose-600'}`}>
              {elig.calculatedPercentage !== null ? `${elig.calculatedPercentage}%` : 'N/A'}
            </span>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <span className="text-xs text-slate-400 block">Required Benchmark</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{config.minimumAttendanceThreshold}%</span>
          </div>
        </div>

        {/* Explainability Explanation */}
        <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs">
          <span className="font-bold text-indigo-950 block mb-1">Official Policy Evaluation:</span>
          <p className="text-slate-700 leading-relaxed">{elig.explanation}</p>
          <div className="mt-2 text-[11px] text-slate-400">
            Last registrar update: {elig.dataAsOf} · Evaluated by Engine: {elig.ruleVersion}
          </div>
        </div>
      </div>

      {/* My Event Nominations History */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">My Technical Event Approval Applications</h2>
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Event Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Proctor Recommendation</th>
                <th className="p-3">Technical Head Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myRequests.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-slate-400">
                    No active event requests found.
                  </td>
                </tr>
              ) : (
                myRequests.map(r => (
                  <tr key={r.requestId}>
                    <td className="p-3 font-semibold text-slate-900">{r.eventName}</td>
                    <td className="p-3 text-slate-500">{r.eventCategory}</td>
                    <td className="p-3">
                      <span className="font-bold text-emerald-700">{r.proctorRecommendation || 'Pending'}</span>
                      {r.proctorRemarks && <p className="text-[11px] text-slate-500 italic mt-0.5">"{r.proctorRemarks}"</p>}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-purple-700">{r.technicalInchargeDecision || 'Pending'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
