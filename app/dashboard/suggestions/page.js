'use client';
import { useState, useEffect } from 'react';

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [tab, setTab] = useState('new');
  const [form, setForm] = useState({ title: '', category: '', description: '', priority: 'Medium' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/suggestions').then(r => r.json()).then(d => setSuggestions(d.suggestions || []));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setForm({ title: '', category: '', description: '', priority: 'Medium' }); setTab('history'); }, 1500);
    setLoading(false);
    fetch('/api/suggestions').then(r => r.json()).then(d => setSuggestions(d.suggestions || []));
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>💡 Suggestions to Admin</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('new')} className={`btn ${tab === 'new' ? 'btn-primary' : 'btn-secondary'}`}>✍️ New Suggestion</button>
        <button onClick={() => setTab('history')} className={`btn ${tab === 'history' ? 'btn-primary' : 'btn-secondary'}`}>📋 My Suggestions</button>
      </div>

      {tab === 'new' && (
        <form onSubmit={handleSubmit} className="card" style={{ maxWidth: 600 }}>
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: 12, color: 'var(--success)', marginBottom: 16, textAlign: 'center' }}>✅ Suggestion submitted!</div>}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input required value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Brief suggestion title" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Category *</label>
              <select required value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Select</option>
                {['Process', 'Tool', 'Policy', 'Other'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                {['Low', 'Medium', 'High'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Description *</label>
            <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={5} placeholder="Describe your suggestion in detail..." />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Submitting...' : '📤 Submit Suggestion'}</button>
          </div>
        </form>
      )}

      {tab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {suggestions.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No suggestions submitted yet</div>
          ) : suggestions.map((s, idx) => (
            <div key={`${s.id}-${idx}`} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ fontWeight: 700 }}>{s.title}</h4>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <span className={`badge badge-${s.priority?.toLowerCase()}`}>{s.priority}</span>
                    <span className="badge badge-submitted">{s.category}</span>
                  </div>
                </div>
                <span className={`badge badge-${s.status?.toLowerCase()}`}>{s.status}</span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{s.description}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 {new Date(s.submittedAt).toLocaleDateString()}</p>
              {s.adminReply && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(6,182,212,0.06)', borderRadius: 8, borderLeft: '3px solid var(--primary-light)' }}>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary-light)', marginBottom: 4 }}>💬 Admin Reply</p>
                  <p style={{ fontSize: '0.85rem' }}>{s.adminReply}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
