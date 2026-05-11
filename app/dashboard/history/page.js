'use client';
import { useState, useEffect } from 'react';

export default function HistoryPage() {
  const [subs, setSubs] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetch('/api/submissions').then(r => r.json()).then(d => setSubs(d.submissions || []));
  }, []);

  const types = [...new Set(subs.map(s => s.formType))];
  const filtered = subs.filter(s => (!typeFilter || s.formType === typeFilter) && (!statusFilter || s.status === statusFilter));

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📜 Submission History</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', minWidth: 180 }}>
          <option value="">All Form Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', minWidth: 150 }}>
          <option value="">All Status</option>
          {['Submitted', 'Reviewed', 'Flagged'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead><tr><th>Date</th><th>Form Type</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No submissions found</td></tr>
            ) : filtered.map((s, idx) => (
              <tr key={`${s.id}-${idx}`}>
                <td style={{ fontSize: '0.85rem' }}>{new Date(s.submittedAt).toLocaleDateString()}</td>
                <td><strong>{s.formType}</strong></td>
                <td><span className={`badge badge-${s.status.toLowerCase()}`}>{s.status}</span></td>
                <td><button className="btn btn-ghost btn-sm" onClick={() => setDetail(s)}>👁️ View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{detail.formType}</h3>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <div style={{ marginBottom: 16, display: 'flex', gap: 12, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>📅 {new Date(detail.submittedAt).toLocaleString()}</span>
              <span className={`badge badge-${detail.status.toLowerCase()}`}>{detail.status}</span>
            </div>
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 16 }}>
              {Object.entries(detail.data || {}).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surface-border)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span style={{ fontWeight: 600, maxWidth: '60%', textAlign: 'right' }}>{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                </div>
              ))}
            </div>
            {detail.adminComments && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                <p style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--warning)', marginBottom: 4 }}>💬 Admin Comments</p>
                <p style={{ fontSize: '0.875rem' }}>{detail.adminComments}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
