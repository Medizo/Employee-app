'use client';
import { useState, useEffect, useCallback, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { UserContext } from '../../context';

export default function EmailPage() {
  const { user } = useContext(UserContext);
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [emails, setEmails] = useState([]);
  const [replies, setReplies] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState('compose');
  const [openThread, setOpenThread] = useState(null);
  const [form, setForm] = useState({ to: '', toName: '', subject: '', body: '', template: '', attachments: [] });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [replyForm, setReplyForm] = useState({ subject: '', body: '' });
  const [replySending, setReplySending] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && ['compose', 'inbox', 'sent', 'threads'].includes(t)) {
      setTab(t);
    }
    const leadEmail = searchParams.get('leadEmail');
    if (leadEmail) {
      setOpenThread(leadEmail);
      setTab('threads');
    }
  }, [searchParams]);

  // AI states
  const [aiContext, setAiContext] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState(''); // which button is loading
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const templates = {
    'Follow-up': { subject: 'Following Up - {company}', body: 'Hi {name},\n\nJust following up on our previous conversation. Would you be available for a quick call this week?\n\nLooking forward to hearing from you.\n\nBest regards,\n{employee_name}\nCluso Infolink' },
    'Introduction': { subject: 'Introduction - Our Services', body: 'Hello {name},\n\nIt was great connecting with you. I wanted to introduce our company and how we can help {company} achieve its goals.\n\nWould love to schedule a brief meeting at your convenience.\n\nBest regards,\n{employee_name}\nCluso Infolink' },
    'Proposal': { subject: 'Proposal - {company}', body: 'Dear {name},\n\nPlease find attached our proposal for {company}. We have carefully tailored it based on our discussions.\n\nPlease let us know if you have any questions.\n\nWarm regards,\n{employee_name}\nCluso Infolink' },
    'Hiring Process': { subject: 'Quick thought regarding your hiring process', body: 'Hi {name},\n\nI was going through {company} and noticed your team is actively growing.\n\nOne thing many growing companies quietly struggle with is hiring speed vs hiring trust. In fast hiring, small gaps in candidate information often go unnoticed until much later.\n\nThat’s exactly why companies are now adding background verification before onboarding.\n\nAt Cluso Infolink, we help businesses verify employment, education, identity, and other key details without making the hiring process complicated for HR teams.\n\nNot sure if this is something you currently use, but would you be open to a quick 10-minute discussion to see if it could help your hiring process?\n\nReply with “Sure” and I’ll coordinate accordingly.\n\nRegards,\n{employee_name}\nCluso Infolink' },
    'Bad Hire': { subject: 'Many companies realise this only after a bad hire', body: 'Hi {name},\n\nMost companies don’t think much about background verification… until one wrong hire creates operational or trust issues internally.\n\nInterestingly, many Indian companies are now quietly making employee verification a standard hiring step — especially for customer-facing and sensitive roles.\n\nAt Cluso Infolink, we help teams conduct simple and reliable background checks that reduce hiring risks without slowing recruitment.\n\nI felt this might be relevant for {company}, considering how competitive hiring has become lately.\n\nWould it make sense to share a quick overview of how companies are using this today?\n\nHappy to send details if you\'re interested.\n\nBest,\n{employee_name}\nCluso Infolink' },
    'Small Question': { subject: 'Small question for you', body: 'Hi {name},\n\nWanted to ask — do you currently verify candidate backgrounds before onboarding?\n\nA lot of companies still depend only on resumes/interviews, but we’re seeing more businesses add verification checks to avoid hiring surprises later.\n\nAt Cluso Infolink, we make the process quick and simple for HR teams.\n\nNot trying to sell anything over email — just thought this could be useful for your team at {company}.\n\nOpen to a quick conversation sometime this week?\n\nRegards,\n{employee_name}\nCluso Infolink' },
    'Fake Degree': { subject: 'That Degree Certificate May Be Fake — Would You Know?', body: 'Dear {name},\n\nOver 41% of resume discrepancies in India involve fake or manipulated educational credentials. Certificates are sophisticated enough today that manual checks consistently miss them.\n\nCluso Infolink authenticates degrees and marksheets directly with universities and regulatory bodies going beyond what a visual inspection or a phone call can confirm.\n\nWith 16 years of experience and licensed investigators on every case, we ensure your academic verification is airtight.\n\nReply to this email to know more about our services and how we can support your background verification process.\n\nSincerely,\n\n{employee_name}\nCluso Infolink Ltd.' },
  };

  const syncInbox = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(`/api/emails/sync?t=${Date.now()}`);
      const d = await res.json();
      setReplies(d.replies || []);
      setUnreadCount(d.unreadCount || 0);
    } catch {}
    setSyncing(false);
  }, []);

  useEffect(() => {
    const loadAll = () => {
      const ts = Date.now();
      fetch(`/api/leads?t=${ts}`).then(r => r.json()).then(d => {
        setLeads(d.leads || []);
        // Auto-select lead from URL param ?lead=ID
        const leadId = searchParams.get('lead');
        if (leadId) {
          const lead = (d.leads || []).find(l => l.id === leadId);
          if (lead) {
            setSelectedLead(lead);
            setForm(f => ({ ...f, to: lead.email || '', toName: lead.contactPerson || '' }));
          }
        }
      });
      fetch(`/api/emails?t=${ts}`).then(r => r.json()).then(d => setEmails(d.emails || []));
      syncInbox();
    };

    loadAll();
    const interval = setInterval(loadAll, 45000);
    return () => clearInterval(interval);
  }, [syncInbox, searchParams]);

  // Quick reply from conversation thread
  const handleReply = async (toEmail, toName) => {
    if (!replyForm.subject.trim() || !replyForm.body.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toEmail, toName, subject: replyForm.subject, body: replyForm.body }),
      });
      const data = await res.json();
      if (!data.warning) {
        setReplySuccess(true);
        setReplyForm({ subject: '', body: '' });
        // Refresh emails
        fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
        setTimeout(() => setReplySuccess(false), 3000);
      }
    } catch {}
    setReplySending(false);
  };

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
    const body = t.body.replace(/{company}/g, lead?.companyName || '').replace(/{name}/g, lead?.contactPerson || '').replace(/{employee_name}/g, user?.name || 'Employee');
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
        setTimeout(() => { setSuccess(false); setForm({ to: '', toName: '', subject: '', body: '', template: '', attachments: [] }); setSelectedLead(null); setTab('sent'); }, 1500);
      }
      fetch('/api/emails').then(r => r.json()).then(d => setEmails(d.emails || []));
    } catch (err) {
      setSendError('Network error — could not send email');
    }
    setLoading(false);
  };

  const handleAttachment = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const MAX_SIZE = 3 * 1024 * 1024; // 3MB
    let currentSize = form.attachments ? form.attachments.reduce((acc, att) => acc + (att.size || 0), 0) : 0;
    
    const newAttachments = [];
    for (const file of files) {
      if (currentSize + file.size > MAX_SIZE) {
        alert(`Adding ${file.name} would exceed the 3MB total attachment limit.`);
        continue;
      }
      
      const contentBytes = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      
      newAttachments.push({
        name: file.name,
        type: file.type || 'application/octet-stream',
        contentBytes,
        size: file.size
      });
      currentSize += file.size;
    }
    
    setForm(f => ({ ...f, attachments: [...(f.attachments || []), ...newAttachments] }));
    e.target.value = ''; // reset
  };

  const removeAttachment = (index) => {
    setForm(f => {
      const atts = [...f.attachments];
      atts.splice(index, 1);
      return { ...f, attachments: atts };
    });
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

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => { setTab('compose'); setOpenThread(null); }} className={`btn ${tab === 'compose' ? 'btn-primary' : 'btn-secondary'}`}>✍️ Compose</button>
        <button onClick={() => { setTab('inbox'); setOpenThread(null); syncInbox(); }} className={`btn ${tab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`} style={{ position: 'relative' }}>
          📥 Inbox
          {unreadCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 50, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 800, minWidth: 18, textAlign: 'center' }}>{unreadCount}</span>}
        </button>
        <button onClick={() => { setTab('sent'); setOpenThread(null); }} className={`btn ${tab === 'sent' ? 'btn-primary' : 'btn-secondary'}`}>📤 Sent</button>
        <button onClick={() => { setTab('threads'); setOpenThread(null); }} className={`btn ${tab === 'threads' ? 'btn-primary' : 'btn-secondary'}`}>💬 Conversations</button>
        {syncing && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🔄 Syncing...</span>}
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

            {/* Attachments */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <label className="btn btn-sm btn-outline" style={{ cursor: 'pointer', margin: 0, padding: '6px 14px', fontSize: '0.8rem' }}>
                  📎 Add Attachments (Max 3MB total)
                  <input type="file" multiple onChange={handleAttachment} style={{ display: 'none' }} />
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total size: {((form.attachments?.reduce((a, b) => a + (b.size || 0), 0) || 0) / (1024 * 1024)).toFixed(2)} MB / 3.00 MB
                </span>
              </div>
              
              {form.attachments && form.attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                  {form.attachments.map((att, idx) => (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '4px 8px 4px 12px', background: 'var(--bg-secondary)',
                      border: '1px solid var(--surface-border)', borderRadius: 20,
                      fontSize: '0.75rem'
                    }}>
                      <span style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={att.name}>{att.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>({(att.size / 1024).toFixed(0)} KB)</span>
                      <button onClick={() => removeAttachment(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: '50%' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
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
                  <td>
                    <strong>{e.toName || e.to}</strong><br/>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{e.to}</span>
                  </td>
                  <td>
                    {e.subject}
                    {e.attachmentCount > 0 && <span style={{ marginLeft: 6, fontSize: '0.7rem', padding: '1px 6px', background: 'var(--surface-border)', borderRadius: 10 }}>📎 {e.attachmentCount}</span>}
                  </td>
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

      {/* ═══════ INBOX TAB — Replies from leads ═══════ */}
      {tab === 'inbox' && (
        <div>
          {replies.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
              <p style={{ fontSize: '2rem', marginBottom: 8 }}>📭</p>
              <p>No replies yet. Replies from your leads will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {replies.map((r, i) => (
                <div key={r.graphId || i} onClick={async () => {
                  if (!r.isRead) {
                    await fetch('/api/emails/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ graphId: r.graphId }) });
                    setReplies(prev => prev.map(x => x.graphId === r.graphId ? { ...x, isRead: true } : x));
                    setUnreadCount(c => Math.max(0, c - 1));
                  }
                  setOpenThread(r.fromEmail);
                  setTab('threads');
                }} className="card" style={{
                  padding: '16px 20px', cursor: 'pointer', transition: 'all 0.2s',
                  border: !r.isRead ? '2px solid #6366f1' : '1px solid var(--surface-border)',
                  background: !r.isRead ? 'rgba(99,102,241,0.04)' : 'var(--surface)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: !r.isRead ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: !r.isRead ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                      {r.fromName?.charAt(0) || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: !r.isRead ? 700 : 500, fontSize: '0.88rem', color: 'var(--text)' }}>{r.fromName || r.fromEmail}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(r.receivedAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.fromEmail}</div>
                    </div>
                    {!r.isRead && <span style={{ background: '#6366f1', color: '#fff', padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 800 }}>NEW</span>}
                  </div>
                  <div style={{ fontWeight: !r.isRead ? 600 : 400, fontSize: '0.85rem', marginBottom: 4 }}>{r.subject}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.bodyPreview}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ CONVERSATIONS TAB — Full thread view ═══════ */}
      {tab === 'threads' && (
        <div>
          {!openThread ? (
            /* Show list of lead conversations */
            (() => {
              const leadEmailsSet = [...new Set(emails.map(e => e.to?.toLowerCase()).filter(Boolean))];
              const leadConversations = leadEmailsSet.map(email => {
                const sent = emails.filter(e => e.to?.toLowerCase() === email);
                const received = replies.filter(r => r.fromEmail?.toLowerCase() === email);
                const hasUnread = received.some(r => !r.isRead);
                const lastDate = [...sent.map(s => s.sentAt), ...received.map(r => r.receivedAt)].sort().pop();
                const lead = leads.find(l => l.email?.toLowerCase() === email);
                return { email, sent, received, hasUnread, lastDate, lead, total: sent.length + received.length };
              }).filter(c => c.total > 0).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));

              return leadConversations.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '2rem', marginBottom: 8 }}>💬</p><p>No conversations yet. Send an email to start one.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leadConversations.map(c => (
                    <div key={c.email} onClick={() => setOpenThread(c.email)} className="card" style={{
                      padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s',
                      border: c.hasUnread ? '2px solid #6366f1' : '1px solid var(--surface-border)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: c.hasUnread ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.hasUnread ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>
                          {(c.lead?.contactPerson || c.email).charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.lead?.contactPerson || c.email} {c.lead ? `— ${c.lead.companyName}` : ''}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.email} · {c.sent.length} sent · {c.received.length} received</div>
                        </div>
                        {c.hasUnread && <span style={{ background: '#ef4444', color: '#fff', padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 800 }}>NEW</span>}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(c.lastDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          ) : (
            /* Show individual conversation thread */
            (() => {
              const threadSent = emails.filter(e => e.to?.toLowerCase() === openThread.toLowerCase());
              const threadReceived = replies.filter(r => r.fromEmail?.toLowerCase() === openThread.toLowerCase());
              const threadLead = leads.find(l => l.email?.toLowerCase() === openThread.toLowerCase());
              const timeline = [
                ...threadSent.map(s => ({ ...s, direction: 'sent', timestamp: s.sentAt })),
                ...threadReceived.map(r => ({ ...r, direction: 'received', timestamp: r.receivedAt })),
              ].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

              // Mark unread replies as read
              threadReceived.filter(r => !r.isRead).forEach(async r => {
                await fetch('/api/emails/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ graphId: r.graphId }) });
              });

              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexShrink: 0 }}>
                    <button onClick={() => setOpenThread(null)} className="btn btn-ghost btn-sm">← Back</button>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.75rem' }}>
                      {(threadLead?.contactPerson || openThread).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{threadLead?.contactPerson || openThread} {threadLead ? `— ${threadLead.companyName}` : ''}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{openThread} · {timeline.length} messages</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflowY: 'auto', padding: '0 4px', minHeight: 0 }}>
                    {timeline.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: msg.direction === 'sent' ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '75%', padding: '12px 16px', borderRadius: 14,
                          background: msg.direction === 'sent' ? 'linear-gradient(135deg,#6366f1,#818cf8)' : 'var(--surface)',
                          color: msg.direction === 'sent' ? '#fff' : 'var(--text)',
                          border: msg.direction === 'received' ? '1px solid var(--surface-border)' : 'none',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                        }}>
                          <div style={{ fontSize: '0.72rem', opacity: 0.7, marginBottom: 4, fontWeight: 600 }}>
                            {msg.direction === 'sent' ? '📤 You' : `📥 ${msg.fromName || openThread}`} · {new Date(msg.timestamp).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: 4 }}>{msg.subject}</div>
                          <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }} dangerouslySetInnerHTML={{ __html: msg.bodyHtml || ((msg.direction === 'sent' ? msg.body : msg.bodyPreview) || '').replace(/\n/g, '<br/>') }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ═══ INLINE REPLY BOX — Always visible at bottom ═══ */}
                  <div className="card" style={{ marginTop: 0, padding: '16px 20px', flexShrink: 0, borderTop: '2px solid var(--surface-border)', borderRadius: '0 0 12px 12px', background: 'var(--surface)', boxShadow: '0 -4px 16px rgba(0,0,0,0.06)', position: 'sticky', bottom: 0, zIndex: 10 }}>
                    {replySuccess && <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, padding: '10px', color: '#059669', marginBottom: 12, textAlign: 'center', fontSize: '0.85rem' }}>✅ Reply sent!</div>}
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        💬 Quick Reply to {threadLead?.contactPerson || openThread}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {[
                          { name: 'Acknowledge', subject: 'Re: Updates', body: `Hi ${threadLead?.contactPerson || ''},\n\nThanks for the update. Received and noted.\n\nBest,` },
                          { name: 'Schedule Call', subject: 'Re: Let’s Connect', body: `Hi ${threadLead?.contactPerson || ''},\n\nWhen would be a good time for a quick 10-minute call this week?\n\nBest regards,` },
                          { name: 'Send Info', subject: 'Re: Information Requested', body: `Hi ${threadLead?.contactPerson || ''},\n\nPlease find the requested information below.\n\nLet me know if you need anything else.\n\nBest,` }
                        ].map(t => (
                          <button
                            key={t.name}
                            onClick={() => setReplyForm({ subject: t.subject, body: t.body })}
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: '0.72rem', padding: '4px 10px', background: 'var(--bg-secondary)', border: '1px solid var(--surface-border)' }}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      placeholder="Subject"
                      value={replyForm.subject}
                      onChange={e => setReplyForm({ ...replyForm, subject: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--surface-border)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '0.85rem', marginBottom: 8 }}
                    />
                    <textarea
                      placeholder="Type your reply..."
                      value={replyForm.body}
                      onChange={e => setReplyForm({ ...replyForm, body: e.target.value })}
                      rows={3}
                      style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--surface-border)', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--text)', fontSize: '0.85rem', resize: 'vertical', marginBottom: 8 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleReply(openThread, threadLead?.contactPerson || '')}
                        disabled={replySending || !replyForm.subject.trim() || !replyForm.body.trim()}
                        className="btn btn-primary btn-sm"
                        style={{ padding: '8px 18px', fontSize: '0.82rem', opacity: (replySending || !replyForm.subject.trim() || !replyForm.body.trim()) ? 0.5 : 1 }}
                      >
                        {replySending ? '⏳ Sending...' : '📤 Send Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          )}
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
