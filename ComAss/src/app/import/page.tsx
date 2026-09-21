"use client";

import { useState } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { UploadCloud, File as FileIcon, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useApp } from '@/components/layout/Providers';
import { MAX_IMPORT_BYTES, validateImportRows } from '@/lib/csv';
import type { ImportResult } from '@/lib/csv';

export default function ImportPage() {
  const { leads, addLeads } = useApp();

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [summary, setSummary] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<{ added: number; skipped: number; fileName: string } | null>(null);

  const reset = () => {
    setFile(null);
    setSummary(null);
    setError(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (selectedFile: File) => {
    setError(null);
    setSummary(null);
    setImported(null);

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid CSV file (.csv).');
      return;
    }
    if (selectedFile.size === 0) {
      setError('The selected file is empty.');
      return;
    }
    if (selectedFile.size > MAX_IMPORT_BYTES) {
      setError(`File is too large (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). The maximum is 10 MB.`);
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    Papa.parse<Record<string, string>>(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const quoteError = results.errors.find((e) => e.type === 'Quotes');
        if (quoteError) {
          setError(`The CSV is malformed (${quoteError.message}). Check for unbalanced quotes.`);
          setFile(null);
        } else {
          const result = validateImportRows(results.data, results.meta.fields ?? [], leads.map((l) => l.email));
          if (result.fatalError) {
            setError(result.fatalError);
            setFile(null);
          } else {
            setSummary(result);
          }
        }
        setIsProcessing(false);
      },
      error: (err) => {
        setError(`Could not read the file: ${err.message}`);
        setFile(null);
        setIsProcessing(false);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    // Reset so selecting the same file again still triggers onChange.
    e.target.value = '';
    if (selected) processFile(selected);
  };

  const handleConfirmImport = () => {
    if (!summary || !file) return;
    const { added, skipped } = addLeads(summary.valid, file.name);
    setImported({ added, skipped: skipped + summary.duplicates.length + summary.invalid.length, fileName: file.name });
    reset();
  };

  const issueCount = summary ? summary.invalid.length + summary.duplicates.length : 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-semibold text-slate-800">Import Leads</h2>
        <p className="text-slate-500 text-sm">Upload a CSV file containing your singing bowl leads.</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
        <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-600" />
        <div>
          <p className="font-medium">CSV Format Required</p>
          <p className="mt-1 opacity-90">Your CSV must include a header row with at least <strong>Name</strong> and <strong>Email</strong> columns (not case-sensitive). Optional columns: <strong>Company</strong>, <strong>Source</strong>. Rows with an email that already exists, or that repeats within the file, are skipped as duplicates.</p>
          <p className="mt-1"><a href="/sample-leads.csv" download className="underline font-medium hover:text-blue-900">Download a sample CSV</a></p>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-sm flex gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      )}

      {imported && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-4 text-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            <p>
              Imported <strong>{imported.added}</strong> lead{imported.added === 1 ? '' : 's'} from {imported.fileName}
              {imported.skipped > 0 && <> ({imported.skipped} row{imported.skipped === 1 ? '' : 's'} skipped)</>}. New leads start as <em>Pending</em>; mark them Eligible to include them in campaigns.
            </p>
          </div>
          <Link href="/leads" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium text-center flex-shrink-0">
            View Leads
          </Link>
        </div>
      )}

      {!file && (
        <div 
          className={`border-2 border-dashed rounded-xl p-6 sm:p-12 flex flex-col items-center justify-center text-center transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 mb-1">Click to upload or drag and drop</h3>
          <p className="text-slate-500 text-sm mb-6">CSV (Max 10MB)</p>
          
          <input 
            type="file" 
            accept=".csv,text/csv" 
            className="hidden" 
            id="csv-upload" 
            onChange={handleFileInput} 
          />
          <label 
            htmlFor="csv-upload" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium text-sm transition-colors cursor-pointer"
          >
            Select CSV File
          </label>
        </div>
      )}

      {isProcessing && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Parsing and validating CSV...</p>
        </div>
      )}

      {summary && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <span className="font-medium text-slate-700 truncate">{file?.name}</span>
              </div>
              <button 
                onClick={reset}
                aria-label="Remove file"
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 flex flex-col items-center justify-center text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
                <p className="text-3xl font-bold text-emerald-700">{summary.valid.length}</p>
                <p className="text-sm font-medium text-emerald-600">Valid Leads</p>
              </div>

              <div className={`rounded-lg p-4 border flex flex-col items-center justify-center text-center ${summary.duplicates.length > 0 ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-200'}`}>
                <AlertCircle className={`w-8 h-8 mb-2 ${summary.duplicates.length > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                <p className={`text-3xl font-bold ${summary.duplicates.length > 0 ? 'text-amber-700' : 'text-slate-700'}`}>{summary.duplicates.length}</p>
                <p className={`text-sm font-medium ${summary.duplicates.length > 0 ? 'text-amber-600' : 'text-slate-500'}`}>Duplicates</p>
              </div>
              
              <div className={`rounded-lg p-4 border flex flex-col items-center justify-center text-center ${summary.invalid.length > 0 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
                <AlertCircle className={`w-8 h-8 mb-2 ${summary.invalid.length > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                <p className={`text-3xl font-bold ${summary.invalid.length > 0 ? 'text-red-700' : 'text-slate-700'}`}>{summary.invalid.length}</p>
                <p className={`text-sm font-medium ${summary.invalid.length > 0 ? 'text-red-600' : 'text-slate-500'}`}>Invalid Rows</p>
              </div>
            </div>

            {issueCount > 0 && (
              <div className="border-t border-slate-200">
                <div className="bg-red-50 px-6 py-3 border-b border-red-100">
                  <h4 className="font-medium text-red-800 text-sm">Issues found (these rows will be skipped)</h4>
                </div>
                <ul className="max-h-48 overflow-y-auto p-4 space-y-2">
                  {summary.invalid.map((inv) => (
                    <li key={`i-${inv.row}`} className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 break-words">
                      <span className="font-medium text-red-600">Row {inv.row}:</span> {inv.reason} <span className="text-slate-400 text-xs ml-2">({JSON.stringify(inv.data).substring(0, 50)}...)</span>
                    </li>
                  ))}
                  {summary.duplicates.map((dup) => (
                    <li key={`d-${dup.row}`} className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 break-words">
                      <span className="font-medium text-amber-600">Row {dup.row}:</span> {dup.reason} <span className="text-slate-400 text-xs ml-2">({dup.email})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button 
                onClick={reset}
                className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                disabled={summary.valid.length === 0}
                onClick={handleConfirmImport}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {summary.valid.length} Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
