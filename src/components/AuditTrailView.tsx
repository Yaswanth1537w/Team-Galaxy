import React, { useState } from 'react';
import {
  History,
  ShieldCheck,
  Search,
  Filter,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { AuditLogEntry } from '../types';

export const AuditTrailView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const logs = dataStore.getAuditLogs();

  const filteredLogs = logs.filter(l => {
    if (filterType !== 'all' && l.entityType !== filterType) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        l.action.toLowerCase().includes(q) ||
        l.actorName.toLowerCase().includes(q) ||
        l.details.toLowerCase().includes(q) ||
        l.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Audit Trail & Immutability Log</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident logs of every attendance batch import, eligibility threshold modification, and verifier decision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            Immutable Sequence: {logs.length} logged events
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search actions, actor, details, or batch ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
          >
            <option value="all">All Entities</option>
            <option value="import">Import Batches</option>
            <option value="verification">Verification Actions</option>
            <option value="student">Student Master</option>
            <option value="config">System Configuration</option>
          </select>
        </div>

        <span className="text-slate-500 font-medium">
          Showing {filteredLogs.length} audit records
        </span>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Actor & Role</th>
                <th className="p-4">Action Type</th>
                <th className="p-4">Entity</th>
                <th className="p-4">Audit Details & Cryptographic Context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="font-bold text-slate-900 block">{log.actorName}</span>
                    <span className="text-[11px] text-slate-400 capitalize">{log.actorRole.replace('_', ' ')}</span>
                  </td>
                  <td className="p-4">
                    <span className="font-mono font-bold text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded-md">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-slate-600">
                    {log.entityType.toUpperCase()}:{log.entityId}
                  </td>
                  <td className="p-4 max-w-md text-slate-800 font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
