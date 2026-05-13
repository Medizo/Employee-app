'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';

const EXPECTED_COLUMNS = [
  { field: 'Company Name', required: true, example: 'TCS, Infosys' },
  { field: 'Contact Person', required: true, example: 'Rahul Sharma' },
  { field: 'Designation', required: false, example: 'HR Manager' },
  { field: 'Phone', required: true, example: '+91 98765 43210' },
  { field: 'Email', required: false, example: 'rahul@tcs.com' },
  { field: 'Address', required: false, example: 'Mumbai, India' },
  { field: 'Industry', required: false, example: 'IT/Software' },
  { field: 'Company Size', required: false, example: '201-500' },
  { field: 'Services Interested', required: false, example: 'Web Development, SEO' },
  { field: 'Source', required: false, example: 'LinkedIn' },
  { field: 'Est Monthly Volume', required: false, example: '100' },
  { field: 'Est Deal Value', required: false, example: '50000' },
  { field: 'Status', required: false, example: 'New' },
  { field: 'Priority', required: false, example: 'Medium' },
  { field: 'Notes', required: false, example: 'Interested in CRM' },
  { field: 'Next Follow-up Date', required: false, example: '2026-06-01' },
  { field: 'Assign To Email', required: false, example: 'employee@cluso.in' },
];

export default function BulkUploadPage() {
  const router = useRouter();
  const fileRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [step, setStep] = useState('format'); // format -> preview -> results
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const [parseError, setParseError] = useState('');

  const parseFile = useCallback((file) => {
    setParseError('');
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

        if (json.length < 2) {
          setParseError('File must have at least a header row and one data row.');
          return;
        }

        const hdrs = json[0].map(h => String(h).trim());
        const dataRows = json.slice(1).filter(row => row.some(cell => cell !== '' && cell != null));

        if (dataRows.length === 0) {
          setParseError('No data rows found after the header row.');
          return;
        }

        // Normalize rows to ensure each has same length as headers
        const normalizedRows = dataRows.map(row => {
          const r = [];
          for (let i = 0; i < hdrs.length; i++) {
            let val = row[i] != null ? row[i] : '';
            // Handle date objects from Excel
            if (val instanceof Date) {
              val = val.toISOString().split('T')[0];
            }
            r.push(String(val).trim());
          }
          return r;
        });

        setHeaders(hdrs);
        setRows(normalizedRows);
        setFile(file);
        setStep('preview');
      } catch (err) {
        setParseError(`Failed to parse the file. Please ensure it is a valid CSV or Excel file. (${err.message})`);
      }
    };

    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      parseFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    try {
      const res = await fetch('/api/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setParseError(data.error || 'Upload failed');
        setUploading(false);
        return;
      }
      setResults(data);
      setStep('results');
    } catch (err) {
      setParseError('Network error during upload.');
    }
    setUploading(false);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS.map(c => c.field),
      EXPECTED_COLUMNS.map(c => c.example),
    ]);
    // Set column widths
    ws['!cols'] = EXPECTED_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
    XLSX.writeFile(wb, 'Lead_Upload_Template.xlsx');
  };

  return (
    <div className="animate-fade" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <a href="/dashboard/workspace" className="btn btn-ghost" style={{ textDecoration: 'none' }}>← Back to Workspace</a>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>📊 Bulk Lead Upload</h2>
      </div>

      {parseError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '14px 18px', color: '#ef4444', marginBottom: 20, fontSize: '0.9rem', fontWeight: 500 }}>
          ⚠️ {parseError}
        </div>
      )}

      {/* ═══════ STEP 1: FORMAT GUIDE ═══════ */}
      {step === 'format' && (
        <>
          {/* Instructions Card */}
          <div className="card" style={{ padding: '28px', marginBottom: 24, background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)' }} />
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 6, marginTop: 8 }}>📋 How It Works</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 16 }}>
              Prepare your Excel or CSV file using the table format shown below. Your file&apos;s first row <strong>must</strong> be the column headers. 
              The system intelligently matches column names — you don&apos;t need exact names (e.g., &quot;Company&quot; works just like &quot;Company Name&quot;).
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={downloadTemplate} style={{ background: 'linear-gradient(135deg, #10b981, #059669)', gap: 8 }}>
                ⬇️ Download Template (.xlsx)
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: 10, fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                Accepts: .xlsx, .xls, .csv
              </div>
            </div>
          </div>

          {/* Format Preview Table */}
          <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>📑 Required Table Format</h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                <span style={{ color: '#ef4444' }}>*</span> = Required fields
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, color: 'var(--text)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      Column Name
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, color: 'var(--text)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Required
                    </th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, color: 'var(--text)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Example Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EXPECTED_COLUMNS.map((col, i) => (
                    <tr key={col.field} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {col.field} {col.required && <span style={{ color: '#ef4444' }}>*</span>}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        {col.required ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700 }}>Required</span>
                        ) : (
                          <span style={{ background: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-muted)', padding: '2px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 600 }}>Optional</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {col.example}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pro Tips */}
          <div className="card" style={{ padding: '18px 22px', marginBottom: 24, background: 'rgba(99, 102, 241, 0.04)', border: '1px solid rgba(99, 102, 241, 0.15)' }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: 'var(--primary)' }}>💡 Pro Tips</h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                'Multiple services can be separated by commas: "Web Development, SEO, CRM"',
                'Status values: New, Contacted, Qualified, Proposal, Negotiation, Closed, Lost',
                'Priority values: Low, Medium, High, Critical',
                'Dates should be in YYYY-MM-DD format (e.g., 2026-06-15)',
                'Duplicate leads (matching email or phone) will be automatically skipped',
                'Column names are flexible — "Company" works the same as "Company Name"',
              ].map((tip, i) => (
                <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ color: '#10b981', fontWeight: 700, flexShrink: 0 }}>✓</span> {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragActive ? '#6366f1' : 'var(--surface-border)'}`,
              borderRadius: 16,
              padding: '50px 40px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s',
              background: dragActive ? 'rgba(99, 102, 241, 0.06)' : 'var(--surface)',
              marginBottom: 24,
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.7 }}>
              {dragActive ? '📂' : '📄'}
            </div>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 6, color: 'var(--text)' }}>
              {dragActive ? 'Drop your file here!' : 'Drag & Drop your file here'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              or <span style={{ color: 'var(--primary)', fontWeight: 600 }}>click to browse</span> — Supports .xlsx, .xls, .csv
            </p>
          </div>
        </>
      )}

      {/* ═══════ STEP 2: PREVIEW ═══════ */}
      {step === 'preview' && (
        <>
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', margin: 0 }}>📋 Preview — {file?.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 4 }}>
                {rows.length} leads found • {headers.length} columns detected
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => { setStep('format'); setFile(null); setHeaders([]); setRows([]); setParseError(''); }}>
                ← Change File
              </button>
              <button
                className="btn btn-primary"
                onClick={handleUpload}
                disabled={uploading}
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                  opacity: uploading ? 0.6 : 1,
                }}
              >
                {uploading ? '⏳ Uploading...' : `🚀 Upload ${rows.length} Leads`}
              </button>
            </div>
          </div>

          {/* Data Preview Table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ overflowX: 'auto', maxHeight: 500 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <th style={{ padding: '10px 12px', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>Row</th>
                    {headers.map((h, i) => (
                      <th key={i} style={{ padding: '10px 12px', borderBottom: '2px solid var(--surface-border)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((row, ri) => (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--surface-border)', background: ri % 2 === 0 ? 'var(--surface)' : 'var(--bg-secondary)' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>{ri + 1}</td>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '8px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                          {cell || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 50 && (
              <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, borderTop: '1px solid var(--surface-border)' }}>
                Showing first 50 of {rows.length} rows
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════ STEP 3: RESULTS ═══════ */}
      {step === 'results' && results && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{results.totalProcessed}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Total Processed</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{results.successCount}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Imported</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{results.skippedCount}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Skipped (Dupes)</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', padding: '22px 18px', borderRadius: 16, color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: 1 }}>{results.errorCount}</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: 10, opacity: 0.9 }}>Errors</div>
            </div>
          </div>

          {/* Detailed Results */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--surface-border)' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>📝 Row-by-Row Results</h4>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {results.results.map((r, i) => (
                <div key={i} style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--surface-border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: r.status === 'success' ? 'rgba(16, 185, 129, 0.04)' : r.status === 'skipped' ? 'rgba(245, 158, 11, 0.04)' : 'rgba(239, 68, 68, 0.04)',
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.7rem',
                    background: r.status === 'success' ? 'rgba(16, 185, 129, 0.15)' : r.status === 'skipped' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: r.status === 'success' ? '#059669' : r.status === 'skipped' ? '#d97706' : '#dc2626',
                  }}>
                    {r.status === 'success' ? '✓' : r.status === 'skipped' ? '⊘' : '✗'}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: 50 }}>Row {r.row}</span>
                  {r.company && <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{r.company}</span>}
                  {r.reason && <span style={{ fontSize: '0.8rem', color: r.status === 'error' ? '#ef4444' : '#d97706', marginLeft: 'auto' }}>{r.reason}</span>}
                  {r.status === 'success' && <span style={{ fontSize: '0.8rem', color: '#10b981', marginLeft: 'auto', fontWeight: 600 }}>Imported ✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={() => { setStep('format'); setFile(null); setHeaders([]); setRows([]); setResults(null); setParseError(''); }}>
              📊 Upload More
            </button>
            <button
              className="btn btn-primary"
              onClick={() => router.push('/dashboard/workspace')}
              style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)' }}
            >
              ← Go to Lead Roster
            </button>
          </div>
        </>
      )}
    </div>
  );
}
