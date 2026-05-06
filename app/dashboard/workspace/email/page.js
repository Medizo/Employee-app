'use client';
import { useState, useEffect } from 'react';

export default function EmailPage() {
  const [leads, setLeads] = useState([]);
  const [emails, setEmails] = useState([]);
  const [tab, setTab] = useState('compose');
  const [form, setForm] = useState({ to: '', toName: '', subject: '', body: '', template: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const templates = {
    'Follow-up': { subject: 'Following Up - {company}', body: 'Hi {name},\n\nJust following up on our previous conversation. Would you be available for a quick call this week?\n\nLooking forward to hearing from you.\n\nBest regards' },
    'Introduction': { subject: 'Introduction - Our Services', body: 'Hello {name},\n\nIt was great connecting with you. I wanted to introduce our company and how we can help {company} achieve its goals.\n\nWould love to schedule a brief meeting at your convenience.\n\nBest' },
    'Proposal': { subject: 'Proposal - {company}', body: 'Dear {name},\n\nPlease find attached our proposal for {company}. We have carefully tailored it based on our discussions.\n\nPlease let us know if you have any questions.\n\nWarm regards' },
  };

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(d => setLeads(d.leads || []));
    fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
  }, []);

  const applyTemplate = (name) => {
    const t = templates[name];
    if (!t) return;
    const lead = leads.find(l => l.email === form.to);
    const subject = t.subject.replace('{company}', lead?.companyName || '').replace('{name}', lead?.contactPerson || '');
    const body = t.body.replace(/{company}/g, lead?.companyName || '').replace(/{name}/g, lead?.contactPerson || '');
    setForm({ ...form, subject, body, template: name });
  };

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.body) return;
    setLoading(true);
    await fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setForm({ to: '', toName: '', subject: '', body: '', template: '' }); setTab('sent'); }, 1500);
    setLoading(false);
    fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>✉️ Email Center</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['compose', 'sent'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{t === 'compose' ? '✍️ Compose' : '📤 Sent Emails'}</button>
        ))}
      </div>

      {tab === 'compose' && (
        <div className="card">
          {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px', color: 'var(--success)', marginBottom: 16, textAlign: 'center' }}>✅ Email sent successfully!</div>}

          <div className="form-group">
            <label className="form-label">To</label>
            <select value={form.to} onChange={e => { const lead = leads.find(l => l.email === e.target.value); setForm({...form, to: e.target.value, toName: lead?.contactPerson || ''}); }}>
              <option value="">Select a lead</option>
              {leads.map(l => <option key={l.id} value={l.email}>{l.contactPerson} ({l.companyName})</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Template</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.keys(templates).map(t => (
                <button key={t} type="button" onClick={() => applyTemplate(t)} className={`btn btn-sm ${form.template === t ? 'btn-primary' : 'btn-secondary'}`}>{t}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Email subject line" />
          </div>

          <div className="form-group">
            <label className="form-label">Body</label>
            <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={10} placeholder="Write your email..." />
          </div>

          <div className="form-actions">
            <button className="btn btn-primary btn-lg" onClick={handleSend} disabled={loading || !form.to || !form.subject}>
              {loading ? 'Sending...' : '📤 Send Email'}
            </button>
          </div>
        </div>
      )}

      {tab === 'sent' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>To</th><th>Subject</th><th>Template</th><th>Status</th></tr></thead>
            <tbody>
              {emails.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No emails sent yet</td></tr>
              ) : emails.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(e.sentAt).toLocaleDateString()}</td>
                  <td><strong>{e.toName}</strong><br/><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.to}</span></td>
                  <td>{e.subject}</td>
                  <td>{e.template && <span className="badge badge-submitted">{e.template}</span>}</td>
                  <td><span className="badge badge-approved">{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
