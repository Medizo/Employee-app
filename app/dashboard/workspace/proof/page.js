'use client';
import { useState, useEffect } from 'react';

export default function ProofPage() {
  const [leads, setLeads] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [tab, setTab] = useState('submit');
  const [form, setForm] = useState({ leadId: '', leadName: '', activityType: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(d => setLeads(d.leads || []));
    fetch('/api/proofs').then(r => r.json()).then(d => setProofs(d.proofs || []));
  }, []);

  const handleSubmit = async () => {
    if (!form.leadId || !form.activityType || !form.description) return;
    setLoading(true);
    await fetch('/api/proofs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setForm({ leadId: '', leadName: '', activityType: '', description: '' }); setTab('history'); }, 1500);
    setLoading(false);
    fetch('/api/proofs').then(r => r.json()).then(d => setProofs(d.proofs || []));
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📎 Proof of Work</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('submit')} className={`btn ${tab === 'submit' ? 'btn-primary' : 'btn-secondary'}`}>📤 Submit Proof</button>
        <button onClick={() => setTab('history')} className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}>📋 History</button>
      </div>

      {tab === 'submit' && (
        <div className="card">
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: 12, color: 'var(--success)', marginBottom: 16, textAlign: 'center' }}>✅ Proof submitted!</div>}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Select Lead</label>
              <select value={form.leadId} onChange={e => { const l = leads.find(x => x.id === e.target.value); setForm({...form, leadId: e.target.value, leadName: l?.companyName || ''}); }}>
                <option value="">Choose lead</option>
                {leads.map(l => <option key={l.id} value={l.id}>{l.companyName} - {l.contactPerson}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Activity Type</label>
              <select value={form.activityType} onChange={e => setForm({...form, activityType: e.target.value})}>
                <option value="">Select type</option>
                {['Call', 'Email', 'Meeting', 'Demo', 'Site Visit'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description / Notes</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} placeholder="Describe the activity..." />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={loading}>📤 Submit Proof</button>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Lead</th><th>Activity</th><th>Description</th><th>Status</th></tr></thead>
            <tbody>
              {proofs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No proofs submitted yet</td></tr>
              ) : proofs.map(p => (
                <tr key={p.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(p.submittedAt).toLocaleDateString()}</td>
                  <td><strong>{p.leadName}</strong></td>
                  <td><span className="badge badge-submitted">{p.activityType}</span></td>
                  <td style={{ maxWidth: 300 }}>{p.description}</td>
                  <td><span className={`badge badge-${p.reviewStatus?.toLowerCase()}`}>{p.reviewStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
