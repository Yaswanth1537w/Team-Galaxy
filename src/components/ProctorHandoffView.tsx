import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  FileText,
  UserCheck,
  Send,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { EventRequestHandoff } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProctorHandoffView: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedRequest, setSelectedRequest] = useState<EventRequestHandoff | null>(null);
  
  // Proctor Recommendation Form
  const [proctorRec, setProctorRec] = useState<'Recommended' | 'Rejected' | 'Needs Clarification'>('Recommended');
  const [proctorRemarks, setProctorRemarks] = useState('');

  // Technical In-Charge Decision Form
  const [techDecision, setTechDecision] = useState<'Approved' | 'Rejected'>('Approved');
  const [techRemarks, setTechRemarks] = useState('');

  const eventRequests = dataStore.getEventRequests();

  // If role is proctor, filter requests only for assigned students
  const filteredRequests = currentUser.role === 'proctor'
    ? eventRequests.filter(req => {
        const student = dataStore.getStudentById(req.studentId);
        return student?.assignedProctorId === currentUser.id;
      })
    : eventRequests;

  const handleSaveProctorRecommendation = () => {
    if (!selectedRequest) return;
    if (currentUser.role !== 'proctor' && currentUser.role !== 'admin') {
      alert('Only assigned proctors or administrators can submit proctor recommendations.');
      return;
    }

    dataStore.updateProctorRecommendation(
      selectedRequest.requestId,
      proctorRec,
      proctorRemarks,
      currentUser.name
    );

    const updated = dataStore.getEventRequests().find(r => r.requestId === selectedRequest.requestId);
    if (updated) setSelectedRequest(updated);
    alert('Proctor recommendation successfully registered!');
  };

  const handleSaveTechnicalDecision = () => {
    if (!selectedRequest) return;
    if (currentUser.role !== 'technical_incharge' && currentUser.role !== 'admin') {
      alert('Only Technical-Event In-Charges or administrators can make final event decisions.');
      return;
    }

    dataStore.updateTechnicalInchargeDecision(
      selectedRequest.requestId,
      techDecision,
      techRemarks,
      currentUser.name
    );

    const updated = dataStore.getEventRequests().find(r => r.requestId === selectedRequest.requestId);
    if (updated) setSelectedRequest(updated);
    alert('Final Technical In-Charge decision successfully recorded!');
  };

  return (
    <div className="space-y-6">
      {/* Title & Guidelines Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Proctor Handoff & Shared Workflow</h1>
          <p className="text-sm text-slate-500 mt-1">
            Bridging student event nominations with verified attendance records, mentor recommendations, and technical head sanction.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold border border-indigo-200">
            Active Role: {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Role-specific Notice Banner */}
      {currentUser.role === 'proctor' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
          <UserCheck size={18} className="text-emerald-600 shrink-0" />
          <span>
            <strong>Proctor Mode:</strong> Showing only event requests submitted by your assigned mentee students. You can review attendance and recommend approval, rejection, or request clarification. Final sanctions are made by the Technical-Event In-Charge.
          </span>
        </div>
      )}

      {currentUser.role === 'technical_incharge' && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center gap-3 text-xs text-purple-800">
          <ShieldCheck size={18} className="text-purple-600 shrink-0" />
          <span>
            <strong>Technical-Event In-Charge Mode:</strong> You have authoritative jurisdiction over final event permissions. Inspect the proctor recommendation, attendance eligibility calculation, and any outstanding verification cases before approving.
          </span>
        </div>
      )}

      {/* Event Handoff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Request ID</th>
                <th className="p-4">Student & Roll No</th>
                <th className="p-4">Event Details</th>
                <th className="p-4">Live Attendance Status</th>
                <th className="p-4">Proctor Recommendation</th>
                <th className="p-4">Final Tech Head Decision</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map(req => {
                const elig = req.eligibility;
                return (
                  <tr key={req.requestId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-indigo-600">{req.requestId}</td>
                    <td className="p-4">
                      <span className="font-bold text-slate-900 block">{req.studentName}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{req.rollNumber}</span>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-slate-900 block">{req.eventName}</span>
                      <span className="text-[11px] text-slate-500">{req.eventCategory} · {req.eventDate}</span>
                    </td>
                    <td className="p-4">
                      {elig.status === 'Eligible' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                          ✓ Eligible ({elig.calculatedPercentage}%)
                        </span>
                      )}
                      {elig.status === 'Below Threshold' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                          ✕ Deficit ({elig.calculatedPercentage}%)
                        </span>
                      )}
                      {elig.status === 'Verification Required' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px]">
                          ⚠ In Review ({elig.calculatedPercentage}%)
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {req.proctorRecommendation === 'Recommended' && (
                        <span className="text-emerald-700 font-bold">Recommended</span>
                      )}
                      {req.proctorRecommendation === 'Rejected' && (
                        <span className="text-rose-700 font-bold">Rejected</span>
                      )}
                      {req.proctorRecommendation === 'Needs Clarification' && (
                        <span className="text-amber-700 font-bold">Needs Clarification</span>
                      )}
                      {!req.proctorRecommendation && (
                        <span className="text-slate-400 italic">Pending Review</span>
                      )}
                    </td>
                    <td className="p-4">
                      {req.technicalInchargeDecision === 'Approved' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px]">
                          Approved
                        </span>
                      )}
                      {req.technicalInchargeDecision === 'Rejected' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px]">
                          Rejected
                        </span>
                      )}
                      {(!req.technicalInchargeDecision || req.technicalInchargeDecision === 'Pending') && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-bold text-[11px]">
                          Awaiting Decision
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setProctorRec(req.proctorRecommendation || 'Recommended');
                          setProctorRemarks(req.proctorRemarks || '');
                          setTechDecision((req.technicalInchargeDecision as any) || 'Approved');
                          setTechRemarks(req.technicalInchargeRemarks || '');
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition-colors"
                      >
                        Inspect Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Eligibility Dossier Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">{selectedRequest.requestId}</span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedRequest.studentName} — {selectedRequest.eventName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Live Attendance Dossier */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <span className="font-bold text-indigo-900 block">Verified Student Attendance Dossier:</span>
                <div className="grid grid-cols-3 gap-2 py-2">
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block">Classes Ratio</span>
                    <span className="font-bold text-slate-900">
                      {selectedRequest.eligibility.classesAttended} / {selectedRequest.eligibility.classesConducted}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block">Percentage</span>
                    <span className="font-bold text-indigo-700">
                      {selectedRequest.eligibility.calculatedPercentage}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-indigo-100">
                    <span className="text-slate-400 block">Required Threshold</span>
                    <span className="font-bold text-slate-900">
                      {selectedRequest.eligibility.configuredThreshold}%
                    </span>
                  </div>
                </div>
                <p className="text-slate-700">{selectedRequest.eligibility.explanation}</p>
              </div>

              {/* Supporting Docs */}
              <div>
                <span className="font-bold text-slate-900 block mb-2">Supporting Event Documents</span>
                <div className="space-y-1.5">
                  {selectedRequest.supportingDocuments.map((doc, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-indigo-600" />
                        <span className="font-semibold text-slate-800">{doc.name}</span>
                      </div>
                      <span className="text-indigo-600 text-[11px] font-semibold cursor-pointer hover:underline">
                        Download / View
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Proctor Action Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <UserCheck size={16} className="text-indigo-600" />
                  Stage 1: Proctor Recommendation
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Recommendation</label>
                    <select
                      value={proctorRec}
                      onChange={(e) => setProctorRec(e.target.value as any)}
                      disabled={currentUser.role !== 'proctor' && currentUser.role !== 'admin'}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
                    >
                      <option value="Recommended">Recommended (Approve)</option>
                      <option value="Rejected">Rejected (Do Not Approve)</option>
                      <option value="Needs Clarification">Needs Clarification</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Proctor Notes</label>
                    <input
                      type="text"
                      value={proctorRemarks}
                      onChange={(e) => setProctorRemarks(e.target.value)}
                      disabled={currentUser.role !== 'proctor' && currentUser.role !== 'admin'}
                      placeholder="Enter mentor remarks..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
                    />
                  </div>
                </div>

                {(currentUser.role === 'proctor' || currentUser.role === 'admin') && (
                  <button
                    onClick={handleSaveProctorRecommendation}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Submit Proctor Recommendation
                  </button>
                )}
              </div>

              {/* Technical In-Charge Final Sanction Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-purple-600" />
                  Stage 2: Technical-Event In-Charge Final Decision
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Final Sanction</label>
                    <select
                      value={techDecision}
                      onChange={(e) => setTechDecision(e.target.value as any)}
                      disabled={currentUser.role !== 'technical_incharge' && currentUser.role !== 'admin'}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
                    >
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Institutional Remarks</label>
                    <input
                      type="text"
                      value={techRemarks}
                      onChange={(e) => setTechRemarks(e.target.value)}
                      disabled={currentUser.role !== 'technical_incharge' && currentUser.role !== 'admin'}
                      placeholder="Official sanction notes..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800"
                    />
                  </div>
                </div>

                {(currentUser.role === 'technical_incharge' || currentUser.role === 'admin') && (
                  <button
                    onClick={handleSaveTechnicalDecision}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs"
                  >
                    Authorize Final Decision
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedRequest(null)}
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
