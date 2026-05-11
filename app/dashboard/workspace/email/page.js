'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EmailPage() {
  const [leads, setLeads] = useState([]);
  const [emails, setEmails] = useState([]);
  const [tab, setTab] = useState('compose');
  const [form, setForm] = useState({ to: '', toName: '', subject: '', body: '', template: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  // AI states
  const [aiContext, setAiContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState(''); // which button is loading
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const templates = {
    'Follow-up': { subject: 'Following Up - {company}', body: 'Hi {name},\n\nJust following up on our previous conversation. Would you be available for a quick call this week?\n\nLooking forward to hearing from you.\n\nBest regards' },
    'Introduction': { subject: 'Introduction - Our Services', body: 'Hello {name},\n\nIt was great connecting with you. I wanted to introduce our company and how we can help {company} achieve its goals.\n\nWould love to schedule a brief meeting at your convenience.\n\nBest regards' },
    'Proposal': { subject: 'Proposal - {company}', body: 'Dear {name},\n\nPlease find attached our proposal for {company}. We have carefully tailored it based on our discussions.\n\nPlease let us know if you have any questions.\n\nWarm regards' },
  };

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then(d => setLeads(d.leads || []));
    fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
  }, []);

  const selectLead = (leadId) => {
    const lead = leads.find(l => l.id === leadId);
    setSelectedLead(lead || null);
    setForm({ ...form, to: lead?.email || '', toName: lead?.contactPerson || '' });
  };

  const applyTemplate = (name) => {
    const t = templates[name];
    if (!t) return;
    const lead = selectedLead;
    const subject = t.subject.replace('{company}', lead?.companyName || '').replace('{name}', lead?.contactPerson || '');
    const body = t.body.replace(/{company}/g, lead?.companyName || '').replace(/{name}/g, lead?.contactPerson || '');
    setForm({ ...form, subject, body, template: name });
  };

  const [sendError, setSendError] = useState('');

  const handleSend = async () => {
    if (!form.to || !form.subject || !form.body) return;
    setLoading(true);
    setSendError('');
    try {
      const res = await fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.warning) {
        setSendError(data.warning);
        setTimeout(() => setSendError(''), 8000);
      } else {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); setForm({ to: '', toName: '', subject: '', body: '', template: '' }); setSelectedLead(null); setTab('sent'); }, 1500);
      }
      fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
    } catch (err) {
      setSendError('Network error — could not send email');
    }
    setLoading(false);
  };

  // ═══ AI Actions ═══

  const callAI = async (action, extra = {}) => {
    setAiLoading(true);
    setAiAction(action);
    setAiError('');
    setAiSuccess('');

    try {
      const payload = {
        action,
        existingSubject: form.subject,
        existingBody: form.body,
        context: aiContext,
        leadInfo: selectedLead ? {
          companyName: selectedLead.companyName,
          contactPerson: selectedLead.contactPerson,
          designation: selectedLead.designation,
          industry: selectedLead.industry,
          servicesInterested: selectedLead.servicesInterested,
          status: selectedLead.status,
          notes: selectedLead.notes,
        } : null,
        ...extra,
      };

      const res = await fetch('/api/ai/generate-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'AI generation failed');
        return;
      }

      if (data.subject && action !== 'polish') {
        setForm(f => ({ ...f, subject: data.subject, body: data.body }));
      } else {
        setForm(f => ({ ...f, body: data.body }));
      }

      const messages = {
        polish: '✨ Email polished with perfect grammar!',
        generate: '🚀 Email generated from your context!',
        rewrite: '🔄 Email rewritten with new context!',
      };
      setAiSuccess(messages[action] || 'Done!');
      setTimeout(() => setAiSuccess(''), 3000);
    } catch (err) {
      setAiError('Network error — please try again');
    } finally {
      setAiLoading(false);
      setAiAction('');
    }
  };

  return (
    <div className="animate-fade">
      {/* Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard/workspace" className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            ← Back to Workspace
          </Link>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', margin: 0 }}>✉️ Email Center</h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['compose', 'sent'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} style={{ textTransform: 'capitalize' }}>{t === 'compose' ? '✍️ Compose' : '📤 Sent Emails'}</button>
        ))}
      </div>

      {tab === 'compose' && (
        <div style={{ display: 'grid', gridTemplateColumns: showAiPanel ? '1fr 380px' : '1fr', gap: 20, alignItems: 'start' }}>

          {/* ═══════ LEFT: EMAIL FORM ═══════ */}
          <div className="card" style={{ padding: '24px 28px' }}>
            {success && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '12px', color: 'var(--success)', marginBottom: 16, textAlign: 'center' }}>✅ Email delivered successfully via indiaops@cluso.in!</div>}

            {/* Send Error/Warning */}
            {sendError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px 16px', color: '#ef4444', marginBottom: 16, fontSize: '0.88rem' }}>
                ⚠️ {sendError}
              </div>
            )}

            {/* FROM badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
              background: 'rgba(16, 185, 129, 0.06)', borderRadius: 10, marginBottom: 16,
              border: '1px solid rgba(16, 185, 129, 0.15)',
            }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>FROM:</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500 }}>indiaops@cluso.in</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto', fontStyle: 'italic' }}>via Microsoft 365</span>
            </div>

            {/* AI Success Banner */}
            {aiSuccess && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(236, 72, 153, 0.08))',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 12, padding: '12px 16px', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 10,
                animation: 'slideUp 0.3s ease',
              }}>
                <span style={{ fontSize: '1.1rem' }}>🤖</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--primary)' }}>{aiSuccess}</span>
              </div>
            )}

            {/* AI Error */}
            {aiError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '12px', color: '#ef4444', marginBottom: 16, fontSize: '0.88rem' }}>
                ⚠️ {aiError}
              </div>
            )}

            {/* Lead Selector */}
            <div className="form-group">
              <label className="form-label">Select Lead</label>
              <select value={selectedLead?.id || ''} onChange={e => selectLead(e.target.value)}>
                <option value="">Select a lead</option>
                {leads.map((l, i) => <option key={`${l.id}-${i}`} value={l.id}>{l.contactPerson} ({l.companyName}){l.email ? ` — ${l.email}` : ''}</option>)}
              </select>
            </div>

            {/* Selected lead context chip */}
            {selectedLead && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                background: 'rgba(99, 102, 241, 0.06)', borderRadius: 10, marginBottom: 16,
                border: '1px solid rgba(99, 102, 241, 0.12)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                }}>
                  {selectedLead.contactPerson?.charAt(0)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{selectedLead.contactPerson} — {selectedLead.companyName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedLead.industry && <span>{selectedLead.industry}</span>}
                    {selectedLead.designation && <span>• {selectedLead.designation}</span>}
                    <span>• {selectedLead.status}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ═══ TO (Email) — Editable ═══ */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                📧 To (Email Address)
                {selectedLead && form.to !== selectedLead.email && (
                  <span style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600, background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 6 }}>
                    Edited
                  </span>
                )}
              </label>
              <input
                type="email"
                value={form.to}
                onChange={e => setForm({...form, to: e.target.value})}
                placeholder="recipient@example.com"
                style={{
                  fontFamily: 'var(--font-family)',
                  fontSize: '0.9rem',
                }}
              />
              {selectedLead && !selectedLead.email && (
                <p style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: 4, marginBottom: 0 }}>
                  ⚠️ This lead has no email on file. You can type one manually above.
                </p>
              )}
            </div>

            {/* Templates + AI Toggle */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Quick Templates</label>
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: '0.78rem', fontWeight: 700, fontFamily: 'var(--font-family)',
                    background: showAiPanel
                      ? 'linear-gradient(135deg, #6366f1, #7c3aed)'
                      : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(124, 58, 237, 0.12))',
                    color: showAiPanel ? '#fff' : 'var(--primary)',
                    transition: 'all 0.3s',
                    boxShadow: showAiPanel ? '0 2px 10px rgba(99,102,241,0.35)' : 'none',
                  }}
                >
                  <span>🤖</span> AI Assistant
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(templates).map(t => (
                  <button key={t} type="button" onClick={() => applyTemplate(t)} className={`btn btn-sm ${form.template === t ? 'btn-primary' : 'btn-secondary'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="form-group">
              <label className="form-label">Subject</label>
              <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Email subject line" />
            </div>

            {/* Body + inline polish button */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Body</label>
                {form.body.trim() && (
                  <button
                    onClick={() => callAI('polish')}
                    disabled={aiLoading}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 12px', borderRadius: 8, border: 'none', cursor: aiLoading ? 'wait' : 'pointer',
                      fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-family)',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff', transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
                      opacity: aiLoading && aiAction === 'polish' ? 0.6 : 1,
                    }}
                  >
                    {aiLoading && aiAction === 'polish' ? (
                      <><span className="ai-spinner" /> Polishing...</>
                    ) : (
                      <>✨ Fix Grammar & Polish</>
                    )}
                  </button>
                )}
              </div>
              <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} rows={12} placeholder="Write your email... or use AI to generate one →" style={{ fontFamily: 'var(--font-family)', lineHeight: 1.6 }} />
            </div>

            {/* Send */}
            <div className="form-actions">
              <button className="btn btn-primary btn-lg" onClick={handleSend} disabled={loading || !form.to || !form.subject} style={{ background: 'linear-gradient(135deg, #6366f1, #7c3aed)', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>
                {loading ? 'Sending...' : '📤 Send Email'}
              </button>
            </div>
          </div>

          {/* ═══════ RIGHT: AI PANEL ═══════ */}
          {showAiPanel && (
            <div style={{ position: 'sticky', top: 80 }}>
              <div className="card" style={{
                padding: 0, overflow: 'hidden',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                boxShadow: '0 4px 24px rgba(99, 102, 241, 0.12)',
              }}>
                {/* Panel Header */}
                <div style={{
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                  color: '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: '1.3rem' }}>🤖</span>
                    <h3 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>AI Email Assistant</h3>
                  </div>
                  <p style={{ fontSize: '0.75rem', opacity: 0.85, margin: 0 }}>
                    AI Powered — Generate, polish, or rewrite emails
                  </p>
                </div>

                <div style={{ padding: '18px 20px' }}>
                  {/* Context Input */}
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label" style={{ fontSize: '0.82rem', fontWeight: 700 }}>
                      📝 What should the email be about?
                    </label>
                    <textarea
                      value={aiContext}
                      onChange={e => setAiContext(e.target.value)}
                      rows={4}
                      placeholder="e.g. Follow up on the demo we gave last week, mention our 20% discount offer, and schedule a call for next Tuesday..."
                      style={{ fontSize: '0.85rem', lineHeight: 1.5, fontFamily: 'var(--font-family)' }}
                    />
                  </div>

                  {/* AI Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Generate New */}
                    <button
                      onClick={() => callAI('generate')}
                      disabled={aiLoading || !aiContext.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', borderRadius: 12, border: 'none', cursor: (aiLoading || !aiContext.trim()) ? 'not-allowed' : 'pointer',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                        fontFamily: 'var(--font-family)', transition: 'all 0.2s',
                        boxShadow: '0 3px 12px rgba(99,102,241,0.3)',
                        opacity: (aiLoading && aiAction === 'generate') ? 0.7 : (!aiContext.trim() ? 0.5 : 1),
                        justifyContent: 'center',
                      }}
                    >
                      {aiLoading && aiAction === 'generate' ? (
                        <><span className="ai-spinner" /> Generating...</>
                      ) : (
                        <>🚀 Generate Email from Context</>
                      )}
                    </button>

                    {/* Rewrite */}
                    <button
                      onClick={() => callAI('rewrite')}
                      disabled={aiLoading || (!form.body.trim() && !aiContext.trim())}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(99,102,241,0.25)',
                        cursor: aiLoading ? 'not-allowed' : 'pointer',
                        background: 'rgba(99, 102, 241, 0.06)',
                        color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem',
                        fontFamily: 'var(--font-family)', transition: 'all 0.2s',
                        opacity: (aiLoading && aiAction === 'rewrite') ? 0.7 : 1,
                        justifyContent: 'center',
                      }}
                    >
                      {aiLoading && aiAction === 'rewrite' ? (
                        <><span className="ai-spinner" /> Rewriting...</>
                      ) : (
                        <>🔄 Rewrite Email with New Context</>
                      )}
                    </button>

                    {/* Polish */}
                    <button
                      onClick={() => callAI('polish')}
                      disabled={aiLoading || !form.body.trim()}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 16px', borderRadius: 12, border: '1.5px solid rgba(16,185,129,0.25)',
                        cursor: (aiLoading || !form.body.trim()) ? 'not-allowed' : 'pointer',
                        background: 'rgba(16, 185, 129, 0.06)',
                        color: '#059669', fontWeight: 700, fontSize: '0.85rem',
                        fontFamily: 'var(--font-family)', transition: 'all 0.2s',
                        opacity: (aiLoading && aiAction === 'polish') ? 0.7 : (!form.body.trim() ? 0.5 : 1),
                        justifyContent: 'center',
                      }}
                    >
                      {aiLoading && aiAction === 'polish' ? (
                        <><span className="ai-spinner" /> Polishing...</>
                      ) : (
                        <>✨ Fix Grammar & Polish</>
                      )}
                    </button>
                  </div>

                  {/* Tips */}
                  <div style={{
                    marginTop: 16, padding: '12px 14px',
                    background: 'rgba(99, 102, 241, 0.04)',
                    borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.08)',
                  }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      💡 How to use
                    </p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[
                        'Write context above, then click "Generate" for a fresh email',
                        '"Rewrite" keeps your email but merges in the new context',
                        '"Polish" only fixes grammar — doesn\'t change meaning',
                        'Select a lead first for AI to use their info',
                      ].map((tip, i) => (
                        <li key={i} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                          <span style={{ color: 'var(--primary)', flexShrink: 0 }}>•</span> {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'sent' && (
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>From</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
            <tbody>
              {emails.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No emails sent yet</td></tr>
              ) : [...emails].reverse().map((e, idx) => (
                <tr key={`${e.id}-${idx}`}>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(e.sentAt).toLocaleDateString()}<br/><span style={{ fontSize: '0.72rem' }}>{new Date(e.sentAt).toLocaleTimeString()}</span></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.sentFrom || 'indiaops@cluso.in'}</td>
                  <td><strong>{e.toName || e.to}</strong><br/><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.to}</span></td>
                  <td>{e.subject}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 10px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                      background: e.status === 'Delivered' ? 'rgba(16,185,129,0.12)' : e.status === 'Failed' ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
                      color: e.status === 'Delivered' ? '#059669' : e.status === 'Failed' ? '#dc2626' : '#6366f1',
                    }}>
                      {e.status === 'Delivered' ? '✅' : e.status === 'Failed' ? '❌' : '📤'} {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* AI Spinner Animation */}
      <style>{`
        .ai-spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: aiSpin 0.6s linear infinite;
        }
        @keyframes aiSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
