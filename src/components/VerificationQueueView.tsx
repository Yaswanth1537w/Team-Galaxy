import React, { useState } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  UserCheck,
  Send,
  FileText,
  X,
  ExternalLink,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { VerificationCase, VerificationStatus, IssueCategory, IssueSeverity } from '../types';
import { useAuth } from '../context/AuthContext';

export const VerificationQueueView: React.FC = () => {
  const { currentUser } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCase, setSelectedCase] = useState<VerificationCase | null>(null);
  const [commentText, setCommentText] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<VerificationStatus>('Under Review');
  const [updateRemarks, setUpdateRemarks] = useState<string>('');

  const verificationCases = dataStore.getVerificationCases();

  // Filter cases
  const displayedCases = verificationCases.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && c.severity !== filterSeverity) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match =
        c.id.toLowerCase().includes(q) ||
        c.rollNumber.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.issueCategory.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Action: Add Comment
  const handleAddComment = () => {
    if (!selectedCase || !commentText.trim()) return;

    dataStore.addVerificationComment(
      selectedCase.id,
      currentUser.name,
      currentUser.role,
      commentText.trim()
    );

    // Refresh selected case
    const updated = dataStore.getVerificationCases().find(c => c.id === selectedCase.id);
    if (updated) setSelectedCase(updated);
    setCommentText('');
  };

  // Action: Update Verification Status & Remarks
  const handleUpdateStatus = () => {
    if (!selectedCase) return;

    // RBAC: Students cannot verify their own records
    if (currentUser.role === 'student') {
      alert('Unauthorized: Students cannot verify or resolve their own records.');
      return;
    }

    const updatedCase: VerificationCase = {
      ...selectedCase,
      status: updateStatus,
      reviewerRemarks: updateRemarks || selectedCase.reviewerRemarks,
      assignedReviewerName: currentUser.name,
      assignedReviewerId: currentUser.id,
      updatedAt: new Date().toISOString(),
    };

    dataStore.saveVerificationCase(updatedCase, currentUser.role);
    setSelectedCase(updatedCase);
    alert(`Verification status updated to "${updateStatus}" for ${selectedCase.rollNumber}.`);
  };

  const getSeverityBadge = (sev: IssueSeverity) => {
    switch (sev) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Critical</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800">High</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Medium</span>;
      case 'low':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Low</span>;
    }
  };

  const getStatusBadge = (st: VerificationStatus) => {
    switch (st) {
      case 'Verified':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Verified</span>;
      case 'Needs Correction':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Needs Correction</span>;
      case 'Under Review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">Under Review</span>;
      case 'Awaiting Reverification':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">Awaiting Reverification</span>;
      case 'Open':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Open</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Verification Coordination Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorized reviewer audit workspace for flagged attendance discrepancies and evidentiary documents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg font-semibold border border-slate-200">
            Authorized Personnel: {currentUser.name} ({currentUser.role})
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search case ID, roll number, issue category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Under Review">Under Review</option>
            <option value="Needs Correction">Needs Correction</option>
            <option value="Awaiting Reverification">Awaiting Reverification</option>
            <option value="Verified">Verified</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          {displayedCases.length} active verification items
        </span>
      </div>

      {/* Cases Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Case ID</th>
                <th className="p-4">Student & Roll No</th>
                <th className="p-4">Issue Category</th>
                <th className="p-4">Severity</th>
                <th className="p-4">Data Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Reviewer</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedCases.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono font-bold text-indigo-600">{item.id}</td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{item.studentName}</span>
                    <span className="font-mono text-slate-500 text-[11px]">{item.rollNumber}</span>
                  </td>
                  <td className="p-4 font-medium text-slate-800">{item.issueCategory}</td>
                  <td className="p-4">{getSeverityBadge(item.severity)}</td>
                  <td className="p-4 text-slate-500">{item.dataSource}</td>
                  <td className="p-4">{getStatusBadge(item.status)}</td>
                  <td className="p-4 text-slate-600">{item.assignedReviewerName}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedCase(item);
                        setUpdateStatus(item.status);
                        setUpdateRemarks(item.reviewerRemarks);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition-colors"
                    >
                      Inspect & Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Review & Decision Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600">{selectedCase.id}</span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {selectedCase.issueCategory} — {selectedCase.studentName}
                </h2>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block mb-0.5">Roll Number</span>
                  <span className="font-mono font-bold text-slate-900">{selectedCase.rollNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Recorded Attendance</span>
                  <span className="font-bold text-slate-900">
                    {selectedCase.attendancePercentage !== null ? `${selectedCase.attendancePercentage}%` : 'Unavailable'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Data Date</span>
                  <span className="font-medium text-slate-800">{selectedCase.attendanceDataDate}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Current Severity</span>
                  <div>{getSeverityBadge(selectedCase.severity)}</div>
                </div>
              </div>

              {/* Supporting Document */}
              {selectedCase.supportingDocName && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-900">
                    <FileText size={16} />
                    <span className="font-semibold">{selectedCase.supportingDocName}</span>
                  </div>
                  <span className="text-[11px] text-indigo-600 font-bold">Attached Proof</span>
                </div>
              )}

              {/* Reviewer Status Update Form */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900">Set Official Verification Outcome</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Verification Status</label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value as VerificationStatus)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 font-medium"
                    >
                      <option value="Open">Open</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Needs Correction">Needs Correction</option>
                      <option value="Awaiting Reverification">Awaiting Reverification</option>
                      <option value="Verified">Verified</option>
                      <option value="Unable to Verify">Unable to Verify</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-semibold">Authorized Reviewer</label>
                    <input
                      type="text"
                      disabled
                      value={currentUser.name}
                      className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-slate-600 font-medium cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-semibold">Official Reviewer Remarks & Findings</label>
                  <textarea
                    rows={2}
                    value={updateRemarks}
                    onChange={(e) => setUpdateRemarks(e.target.value)}
                    placeholder="Provide detailed justification for verification outcome..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 placeholder-slate-400"
                  />
                </div>

                <button
                  onClick={handleUpdateStatus}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
                >
                  Save Verification Decision
                </button>
              </div>

              {/* Audit Comments Trail */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-900">Case Activity & Comments History</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedCase.comments.length === 0 ? (
                    <p className="text-slate-400 italic">No notes logged yet.</p>
                  ) : (
                    selectedCase.comments.map(c => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                        <div className="flex justify-between text-[11px]">
                          <span className="font-bold text-slate-800">{c.authorName} ({c.authorRole})</span>
                          <span className="text-slate-400">{new Date(c.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-slate-700">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Comment Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add an internal reviewer comment..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 placeholder-slate-400"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg flex items-center gap-1 font-semibold"
                  >
                    <Send size={12} /> Post
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedCase(null)}
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
