import React, { useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  ShieldAlert,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { dataStore } from '../services/dataStore';
import { useAuth } from '../context/AuthContext';

export const SettingsConfigView: React.FC = () => {
  const { currentUser } = useAuth();
  const currentConfig = dataStore.getConfig();

  const [threshold, setThreshold] = useState<number>(currentConfig.minimumAttendanceThreshold);
  const [freshnessDays, setFreshnessDays] = useState<number>(currentConfig.freshnessThresholdDays);
  const [enforceStrict, setEnforceStrict] = useState<boolean>(currentConfig.enforceStrictVerification);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSave = () => {
    if (currentUser.role !== 'admin' && currentUser.role !== 'technical_incharge') {
      alert('Only administrators or Technical-Event In-Charges can modify institutional policies.');
      return;
    }

    dataStore.updateConfig({
      minimumAttendanceThreshold: Number(threshold),
      freshnessThresholdDays: Number(freshnessDays),
      enforceStrictVerification: enforceStrict,
    }, currentUser.role);

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset all databases, verifications, and attendance records to initial demonstration factory state?')) {
      dataStore.resetToFactoryDemo();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Eligibility Rules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure dynamic institutional parameters. Changes immediately update live dashboards and proctor handoffs.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} /> Configuration updated successfully and logged in system audit trail!
        </div>
      )}

      {/* Settings Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Attendance Threshold */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-slate-800">
            Minimum Institutional Attendance Threshold (%)
          </label>
          <p className="text-xs text-slate-500">
            Initial demonstration default is 75%. Students below this threshold will be flagged as "Below Threshold" during event nomination.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="50"
              max="90"
              step="1"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-64 accent-indigo-600"
            />
            <span className="text-lg font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
              {threshold}%
            </span>
          </div>
        </div>

        {/* Data Freshness */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-sm font-bold text-slate-800">
            Attendance Freshness Window (Days)
          </label>
          <p className="text-xs text-slate-500">
            Attendance records older than this threshold will be flagged as "Outdated Data" requiring a fresh semester batch upload.
          </p>
          <input
            type="number"
            min="7"
            max="180"
            value={freshnessDays}
            onChange={(e) => setFreshnessDays(Number(e.target.value))}
            className="w-32 bg-slate-50 border border-slate-200 rounded-lg p-2 text-sm text-slate-800 font-bold"
          />
        </div>

        {/* Strict Verification */}
        <div className="pt-4 border-t border-slate-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enforceStrict}
              onChange={(e) => setEnforceStrict(e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
            />
            <div>
              <span className="text-sm font-bold text-slate-800 block">Enforce Strict Verification Blocker</span>
              <span className="text-xs text-slate-500">
                Automatically block event recommendation whenever an active verification issue is open for that student.
              </span>
            </div>
          </label>
        </div>

        {/* Save Buttons */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Save size={15} /> Save Configuration
          </button>

          <button
            onClick={handleResetDemo}
            className="flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline"
          >
            <RotateCcw size={14} /> Reset Demonstration Database
          </button>
        </div>
      </div>
    </div>
  );
};
