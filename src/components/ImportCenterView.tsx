import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  RefreshCw,
  Eye,
  FileText,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { dataStore } from '../services/dataStore';
import { ImportValidator } from '../services/importValidator';
import { AttendanceImportRow, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';

export const ImportCenterView: React.FC<{ onImportSuccess?: () => void }> = ({ onImportSuccess }) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'upload' | 'preview' | 'report' | 'commit'>('upload');
  
  // File state
  const [fileName, setFileName] = useState<string>('');
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  
  // Parsed and validated state
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validatedRows, setValidatedRows] = useState<AttendanceImportRow[]>([]);
  const [filterReportStatus, setFilterReportStatus] = useState<'all' | 'valid' | 'invalid' | 'warning' | 'duplicate'>('all');
  
  // Loading & confirmation
  const [isProcessing, setIsProcessing] = useState(false);
  const [committedBatchId, setCommittedBatchId] = useState<string | null>(null);
  const [committedCount, setCommittedCount] = useState<number>(0);
  const [explicitConfirmation, setExplicitConfirmation] = useState(false);

  // Download Templates
  const handleDownloadTemplate = (type: 'attendance' | 'student_master') => {
    const csvContent = ImportValidator.getCsvTemplate(type);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${type}_template_v2.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Step B: File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'binary' });
          setWorkbook(wb);
          setSheetNames(wb.SheetNames);
          const defaultSheet = wb.SheetNames[0];
          setSelectedSheet(defaultSheet);

          // Parse initial sheet
          const ws = wb.Sheets[defaultSheet];
          const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
          processRawData(json, file.name);
        } catch (err) {
          alert('Error reading Excel spreadsheet: ' + err);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      // CSV file
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRawData(results.data as Record<string, any>[], file.name);
          setIsProcessing(false);
        },
        error: (err) => {
          alert('Error parsing CSV file: ' + err.message);
          setIsProcessing(false);
        },
      });
    }
  };

  // Process sheet switch if Excel has multiple sheets
  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    setSelectedSheet(sheetName);
    const ws = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
    processRawData(json, fileName);
  };

  const processRawData = (rows: Record<string, any>[], name: string) => {
    if (rows.length === 0) {
      alert('The uploaded file is empty. Please check your data.');
      return;
    }
    setRawRows(rows);
    const headers = Object.keys(rows[0]);
    setDetectedHeaders(headers);

    const detected = ImportValidator.detectMapping(headers);
    setColumnMapping(detected);

    // Validate with existing students in DB
    const existingStudents = dataStore.getStudents();
    const result = ImportValidator.validateRows(rows, detected, existingStudents);
    setValidatedRows(result.rows);
    setStep('preview');
  };

  const revalidateWithMapping = (updatedMapping: Record<string, string>) => {
    setColumnMapping(updatedMapping);
    const existingStudents = dataStore.getStudents();
    const result = ImportValidator.validateRows(rawRows, updatedMapping, existingStudents);
    setValidatedRows(result.rows);
  };

  // Safe Database Commit
  const handleCommitImport = () => {
    const validRowsToCommit = validatedRows.filter(r => r.isEligibleForImport);
    if (validRowsToCommit.length === 0) {
      alert('No valid rows available to import.');
      return;
    }

    const res = dataStore.commitImportBatch(
      fileName,
      validRowsToCommit,
      currentUser.name,
      currentUser.role
    );

    setCommittedBatchId(res.batchId);
    setCommittedCount(res.importedCount);
    setStep('commit');
    if (onImportSuccess) onImportSuccess();
  };

  // Filtered rows for Step D report
  const filteredReportRows = validatedRows.filter(r => {
    if (filterReportStatus === 'all') return true;
    if (filterReportStatus === 'valid') return r.status === 'valid' || r.status === 'warning';
    return r.status === filterReportStatus;
  });

  const validCount = validatedRows.filter(r => r.status === 'valid' || r.status === 'warning').length;
  const invalidCount = validatedRows.filter(r => r.status === 'invalid').length;
  const duplicateCount = validatedRows.filter(r => r.status === 'duplicate').length;
  const warningCount = validatedRows.filter(r => r.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Wizard Step Progression Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-4 overflow-x-auto">
          {[
            { id: 'upload', label: '1. Upload & Sheets' },
            { id: 'preview', label: '2. Column Mapping' },
            { id: 'report', label: '3. Data Validation Report' },
            { id: 'commit', label: '4. Safe Commit Outcome' },
          ].map((st, i) => {
            const isActive = step === st.id;
            return (
              <button
                key={st.id}
                disabled={step === 'upload' && st.id !== 'upload'}
                onClick={() => setStep(st.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 bg-slate-50'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>

        {step !== 'upload' && step !== 'commit' && (
          <button
            onClick={() => {
              setStep('upload');
              setFileName('');
              setValidatedRows([]);
            }}
            className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-semibold"
          >
            <RotateCcw size={14} /> Start Over
          </button>
        )}
      </div>

      {/* STEP A & B: Upload & Templates */}
      {step === 'upload' && (
        <div className="space-y-6">
          {/* Download Templates Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 p-6 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                  Step A: Official Templates
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">Download Pre-Formatted Institutional Templates</h2>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  Use our standardized schemas for flawless ingestion. Includes headers for roll numbers, classes conducted, attended, and data timestamps.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadTemplate('attendance')}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-300 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download size={14} /> Attendance Template (.csv)
                </button>
                <button
                  onClick={() => handleDownloadTemplate('student_master')}
                  className="flex items-center gap-2 px-3 py-2 bg-white text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <Download size={14} /> Student Master Template (.csv)
                </button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 transition-colors text-center shadow-xs">
            <div className="mx-auto w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <UploadCloud size={28} />
            </div>
            <h3 className="text-base font-bold text-slate-900">Upload Attendance Spreadsheet</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Supports .xlsx, .xls, and .csv files up to 25MB. Zero raw secrets or keys are transmitted.
            </p>

            <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-xs transition-colors">
              <FileSpreadsheet size={16} />
              <span>Choose File from Computer</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {isProcessing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
                <RefreshCw size={14} className="animate-spin" />
                <span>Parsing and analyzing spreadsheet rows...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP B: Column Mapping & Multi-sheet Selection */}
      {step === 'preview' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Step B: Column Mapping</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Map Source Columns to Database Fields</h2>
              <p className="text-xs text-slate-500">File: <span className="font-semibold text-slate-700">{fileName}</span> ({rawRows.length} rows detected)</p>
            </div>

            {sheetNames.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Worksheet:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 rounded-lg px-3 py-1.5"
                >
                  {sheetNames.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Mapping Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'rollNumber', label: 'Roll Number *', required: true },
              { key: 'studentName', label: 'Student Name', required: false },
              { key: 'classesConducted', label: 'Classes Conducted *', required: true },
              { key: 'classesAttended', label: 'Classes Attended *', required: true },
              { key: 'suppliedPercentage', label: 'Supplied Percentage (%)', required: false },
              { key: 'dataAsOf', label: 'Attendance Date (As Of)', required: false },
              { key: 'department', label: 'Department', required: false },
              { key: 'academicYear', label: 'Academic Year', required: false },
              { key: 'semester', label: 'Semester', required: false },
            ].map(f => (
              <div key={f.key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {f.label}
                </label>
                <select
                  value={columnMapping[f.key] || ''}
                  onChange={(e) => {
                    const updated = { ...columnMapping, [f.key]: e.target.value };
                    revalidateWithMapping(updated);
                  }}
                  className="w-full bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- Not Mapped --</option>
                  {detectedHeaders.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* First 3 Rows Raw Preview */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">First 3 Rows Preview</h3>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    {detectedHeaders.slice(0, 7).map(h => (
                      <th key={h} className="p-2.5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawRows.slice(0, 3).map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {detectedHeaders.slice(0, 7).map(h => (
                        <td key={h} className="p-2.5">{String(r[h] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep('upload')}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
            >
              Back
            </button>
            <button
              onClick={() => setStep('report')}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Proceed to Validation Report ({validatedRows.length} rows)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP D: Validation Report */}
      {step === 'report' && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Step D: Validation Report</span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">Pre-Commit Health & Error Diagnosis</h2>
              <p className="text-xs text-slate-500">Every row has been evaluated against database invariants and calculation rules.</p>
            </div>
          </div>

          {/* Validation Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              onClick={() => setFilterReportStatus('all')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${filterReportStatus === 'all' ? 'bg-indigo-50 border-indigo-300' : 'bg-slate-50 border-slate-200'}`}
            >
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Rows</span>
              <span className="text-xl font-bold text-slate-900 block mt-0.5">{validatedRows.length}</span>
            </div>

            <div
              onClick={() => setFilterReportStatus('valid')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${filterReportStatus === 'valid' ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}
            >
              <span className="text-[11px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                <CheckCircle2 size={12} /> Valid for Import
              </span>
              <span className="text-xl font-bold text-emerald-800 block mt-0.5">{validCount}</span>
            </div>

            <div
              onClick={() => setFilterReportStatus('invalid')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${filterReportStatus === 'invalid' ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'}`}
            >
              <span className="text-[11px] font-bold text-rose-700 uppercase flex items-center gap-1">
                <AlertCircle size={12} /> Invalid Rows
              </span>
              <span className="text-xl font-bold text-rose-800 block mt-0.5">{invalidCount}</span>
            </div>

            <div
              onClick={() => setFilterReportStatus('duplicate')}
              className={`p-3 rounded-xl border cursor-pointer transition-colors ${filterReportStatus === 'duplicate' ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}
            >
              <span className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1">
                <AlertTriangle size={12} /> Duplicates
              </span>
              <span className="text-xl font-bold text-amber-800 block mt-0.5">{duplicateCount}</span>
            </div>
          </div>

          {/* Detailed Row List Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Row #</th>
                  <th className="p-3">Roll Number</th>
                  <th className="p-3">Conducted / Attended</th>
                  <th className="p-3">Calculated %</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Diagnosis & Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReportRows.map(row => {
                  const pct = (row.classesConducted && row.classesConducted > 0 && row.classesAttended !== undefined)
                    ? ((row.classesAttended / row.classesConducted) * 100).toFixed(1)
                    : (row.classesConducted === 0 ? 'Unavailable' : 'N/A');

                  return (
                    <tr key={row.rowNumber} className={row.status === 'invalid' ? 'bg-rose-50/40' : row.status === 'warning' ? 'bg-amber-50/30' : 'hover:bg-slate-50'}>
                      <td className="p-3 font-mono text-slate-500">{row.rowNumber}</td>
                      <td className="p-3 font-bold text-slate-900">{row.rollNumber}</td>
                      <td className="p-3">
                        {row.classesAttended ?? '-'} / {row.classesConducted ?? '-'}
                      </td>
                      <td className="p-3 font-semibold">
                        {pct === 'Unavailable' ? <span className="text-slate-400">Unavailable</span> : `${pct}%`}
                      </td>
                      <td className="p-3">
                        {row.status === 'valid' && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[10px]">
                            Valid
                          </span>
                        )}
                        {row.status === 'warning' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-semibold text-[10px]">
                            Warning
                          </span>
                        )}
                        {row.status === 'invalid' && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-semibold text-[10px]">
                            Error
                          </span>
                        )}
                        {row.status === 'duplicate' && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-semibold text-[10px]">
                            Duplicate
                          </span>
                        )}
                      </td>
                      <td className="p-3 max-w-md">
                        {row.errors.map((e, idx) => (
                          <p key={idx} className="text-rose-600 font-medium text-[11px]">✕ {e}</p>
                        ))}
                        {row.warnings.map((w, idx) => (
                          <p key={idx} className="text-amber-700 text-[11px]">⚠ {w}</p>
                        ))}
                        {row.errors.length === 0 && row.warnings.length === 0 && (
                          <span className="text-slate-400">No issues detected</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* STEP E Confirmation Trigger */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={explicitConfirmation}
                onChange={(e) => setExplicitConfirmation(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded-sm border-slate-300 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-semibold">
                I explicitly confirm overwriting / updating attendance records for {validCount} verified rows.
              </span>
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('preview')}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-4 py-2"
              >
                Back to Mapping
              </button>
              <button
                disabled={!explicitConfirmation || validCount === 0}
                onClick={handleCommitImport}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-xs transition-colors ${
                  explicitConfirmation && validCount > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ShieldCheck size={16} />
                <span>Safely Commit Batch to Master Database</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP E: Success / Commit Outcome */}
      {step === 'commit' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Attendance Records Successfully Committed!</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Batch <span className="font-mono font-bold text-slate-900">{committedBatchId}</span> was saved to persistent master storage.
            Live eligibility statuses, proctor handoffs, and dashboards have been synchronized.
          </p>

          <div className="inline-flex items-center gap-4 bg-slate-50 px-6 py-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 block">Records Imported</span>
              <span className="text-lg font-bold text-emerald-700">{committedCount}</span>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <span className="text-slate-400 block">Audited By</span>
              <span className="text-sm font-semibold text-slate-800">{currentUser.name}</span>
            </div>
          </div>

          <div className="pt-4 flex justify-center gap-3">
            <button
              onClick={() => {
                setStep('upload');
                setFileName('');
                setValidatedRows([]);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
