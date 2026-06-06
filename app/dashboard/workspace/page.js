'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const statusColors = { New: 'new', Contacted: 'contacted', Qualified: 'qualified', Proposal: 'proposal', Closed: 'closed', Lost: 'lost' };

const activityTypeColors = {
  Connect: { bg: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', icon: '🔗' },
  Email: { bg: 'rgba(96, 165, 250, 0.12)', color: '#3b82f6', icon: '✉️' },
  Followup: { bg: 'rgba(244, 114, 182, 0.12)', color: '#ec4899', icon: '📞' },
  Status: { bg: 'rgba(251, 191, 36, 0.12)', color: '#d97706', icon: '🔄' },
  Call: { bg: 'rgba(52, 211, 153, 0.12)', color: '#059669', icon: '📱' },
  Demo: { bg: 'rgba(167, 139, 250, 0.12)', color: '#7c3aed', icon: '🎥' },
  Meeting: { bg: 'rgba(249, 115, 22, 0.12)', color: '#ea580c', icon: '🤝' },
  Note: { bg: 'rgba(148, 163, 184, 0.12)', color: '#64748b', icon: '📝' },
  'Status Change': { bg: 'rgba(248, 113, 113, 0.12)', color: '#dc2626', icon: '🔄' },
  'Admin Comment': { bg: 'rgba(239, 68, 68, 0.10)', color: '#b91c1c', icon: '💬' },
  'Update': { bg: 'rgba(14, 165, 233, 0.10)', color: '#0284c7', icon: '✏️' },
};

const followupModes = ['Phone Call', 'Email', 'Video Call', 'In-Person Meeting', 'WhatsApp', 'LinkedIn', 'Other'];
const clientResponseOptions = [
  'Interested — Moving Forward',
  'Requested More Info',
  'Follow-up Scheduled',
  'Not Interested',
  'No Response',
  'Deal Closed',
  'On Hold',
  'Referred to Decision Maker',
];

export default function WorkspacePage() {
  const router = useRouter();
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editLead, setEditLead] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // Follow-up modal
  const [showFollowup, setShowFollowup] = useState(false);
  const [followupLead, setFollowupLead] = useState(null);
  const [followupForm, setFollowupForm] = useState({
    date: '', mode: 'Phone Call', discussionSummary: '',
    clientResponse: 'Interested — Moving Forward', nextAction: '', nextFollowupDate: '',
  });
  const [followupSubmitting, setFollowupSubmitting] = useState(false);
  const [followupSuccess, setFollowupSuccess] = useState(false);
  const [allEmails, setAllEmails] = useState([]);
  const [allReplies, setAllReplies] = useState([]);

  useEffect(() => {
    const loadAllData = () => {
      const ts = Date.now();
      fetch(`/api/leads?t=${ts}`).then(r => r.json()).then(d => { setLeads(d.leads || []); setLoading(false); });
      fetch(`/api/emails?t=${ts}`).then(r => r.json()).then(d => setAllEmails(d.emails || [])).catch(() => {});
      fetch(`/api/emails/sync?t=${ts}`).then(r => r.json()).then(d => setAllReplies(d.replies || [])).catch(() => {});
    };

    loadAllData();
    const interval = setInterval(loadAllData, 45000);
    return () => clearInterval(interval);
  }, []);

  const fetchLeads = () => {
    setLoading(true);
    fetch(`/api/leads?t=${Date.now()}`).then(r => r.json()).then(d => { setLeads(d.leads || []); setLoading(false); });
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.companyName.toLowerCase().includes(search.toLowerCase()) || l.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    const reason = prompt('Reason for deleting this lead? (Admin approval required)');
    if (reason === null) return; // cancelled
    const res = await fetch(`/api/leads?id=${id}&reason=${encodeURIComponent(reason || 'No reason provided')}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.status === 409) {
      alert('A deletion request is already pending for this lead.');
    } else if (res.ok) {
      alert('Deletion request sent to admin for approval.');
    } else {
      alert(data.error || 'Failed to request deletion.');
    }
    fetchLeads();
  };

  const handleSaveEdit = async () => {
    await fetch('/api/leads', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editLead) });
    
    const originalLead = leads.find(l => l.id === editLead.id);
    if (originalLead && originalLead.status !== 'Closed' && editLead.status === 'Closed') {
      router.push(`/dashboard/forms?type=deal_closed&leadId=${editLead.id}`);
      return;
    }
    
    setShowEdit(false); setEditLead(null); fetchLeads();
  };

  // Open follow-up modal for a lead
  const openFollowup = (lead) => {
    setFollowupLead(lead);
    setFollowupForm({
      date: new Date().toISOString().split('T')[0],
      mode: 'Phone Call',
      discussionSummary: '',
      clientResponse: 'Interested — Moving Forward',
      nextAction: '',
      nextFollowupDate: '',
    });
    setFollowupSuccess(false);
    setShowFollowup(true);
  };

  const handleFollowupSubmit = async () => {
    if (!followupForm.date) return;
    setFollowupSubmitting(true);
    try {
      await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: followupLead.id,
          clientName: followupLead.companyName,
          contactPerson: followupLead.contactPerson,
          ...followupForm,
        }),
      });
      setFollowupSuccess(true);
      setTimeout(() => {
        setShowFollowup(false);
        setFollowupLead(null);
        setFollowupSuccess(false);
        fetchLeads();
      }, 1200);
    } catch (e) {
      console.error('Follow-up error:', e);
    }
    setFollowupSubmitting(false);
  };

  const getActivityStyle = (type) => {
    return activityTypeColors[type] || activityTypeColors['Note'];
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>👥 Lead Roster</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/dashboard/workspace/bulk" className="btn btn-outline" style={{ gap: 6 }}>📊 Bulk Upload</Link>
          <Link href="/dashboard/workspace/add" className="btn btn-primary">➕ Add Lead</Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Search leads..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem' }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.875rem', minWidth: 150 }}>
          <option value="">All Status</option>
          {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading leads...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>📭</p>
          <p>No leads found. <Link href="/dashboard/workspace/add">Add your first lead</Link></p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Company</th>
                <th>Contact</th>
                <th className="hide-mobile">Email</th>
                <th className="hide-mobile">Phone</th>
                <th className="hide-mobile">Service</th>
                <th>Status</th>
                <th className="hide-mobile">Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <React.Fragment key={`${lead.id}-${i}`}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ transform: expanded === lead.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block', fontSize: '0.7rem', color: 'var(--text-muted)' }}>▶</span>
                        {i + 1}
                      </span>
                    </td>
                    <td><strong>{lead.companyName}</strong></td>
                    <td>{lead.contactPerson}</td>
                    <td className="hide-mobile" style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{lead.email || <span style={{ fontStyle: 'italic', opacity: 0.5 }}>—</span>}</td>
                    <td className="hide-mobile">{lead.phone}</td>
                    <td className="hide-mobile">{lead.servicesInterested?.join(', ') || '-'}</td>
                    <td><span className={`badge badge-${statusColors[lead.status] || 'new'}`}>{lead.status}</span>
                      {lead.deletionRequested && <span style={{ display: 'inline-block', marginLeft: 6, padding: '2px 8px', borderRadius: 50, fontSize: '0.65rem', fontWeight: 700, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>⏳ Deletion Pending</span>}
                    </td>
                    <td className="hide-mobile" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(lead.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }} onClick={e => e.stopPropagation()}>
                        <button
                          className="workspace-action-btn workspace-action-email"
                          onClick={() => router.push(`/dashboard/workspace/email?lead=${lead.id}`)}
                          title="Send Email"
                        >
                          <span style={{ fontSize: '0.72rem' }}>✉️</span> Email
                        </button>
                        {(() => {
                          const hasFollowup = !!lead.nextFollowupDate;
                          const followupDate = hasFollowup ? new Date(lead.nextFollowupDate) : null;
                          const todayStart = new Date(); todayStart.setHours(0,0,0,0);
                          const isOverdue = followupDate && followupDate < todayStart;
                          const isToday = followupDate && followupDate.toDateString() === new Date().toDateString();
                          const formattedDate = followupDate ? followupDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
                          const titleText = hasFollowup
                            ? `Follow-up ${isOverdue ? 'OVERDUE' : isToday ? 'due TODAY' : 'scheduled'}: ${formattedDate}`
                            : 'Log Follow-up';
                          return (
                            <button
                              className={`workspace-action-btn ${hasFollowup ? (isOverdue ? 'workspace-action-followup-overdue' : isToday ? 'workspace-action-followup-today' : 'workspace-action-followup-scheduled') : 'workspace-action-followup'}`}
                              onClick={() => openFollowup(lead)}
                              title={titleText}
                            >
                              <span style={{ fontSize: '0.72rem' }}>{isOverdue ? '🔴' : isToday ? '🟠' : hasFollowup ? '📅' : '📋'}</span> Follow Up
                            </button>
                          );
                        })()}
                        <button
                          className="workspace-action-btn workspace-action-conversation"
                          onClick={() => {
                            if (lead.email) {
                              router.push(`/dashboard/workspace/email?tab=threads&leadEmail=${encodeURIComponent(lead.email)}`);
                            } else {
                              alert("This lead doesn't have an email address configured.");
                            }
                          }}
                          title="View Conversation"
                        >
                          <span style={{ fontSize: '0.72rem' }}>💬</span> Conversation
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditLead({...lead}); setShowEdit(true); }} title="Edit" style={{ padding: '4px 8px' }}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(lead.id)} title={lead.deletionRequested ? 'Deletion pending approval' : 'Request Delete'} disabled={lead.deletionRequested} style={{ padding: '4px 8px', opacity: lead.deletionRequested ? 0.4 : 1 }}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === lead.id && (
                    <tr key={lead.id + '-exp'}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <div style={{ padding: '20px 24px', background: 'var(--bg-secondary)', animation: 'slideUp 0.3s ease' }}>
                          {(() => {
                            const leadEmail = lead.email?.toLowerCase();
                            const sentToLead = allEmails.filter(e => e.to?.toLowerCase() === leadEmail);
                            const receivedFromLead = allReplies.filter(r => r.fromEmail?.toLowerCase() === leadEmail);
                            
                            const emailActivities = [
                              ...sentToLead.map(s => ({ type: 'Email', timestamp: s.sentAt, description: `📤 Sent: ${s.subject}\n${(s.body || '').substring(0, 150)}${s.body?.length > 150 ? '...' : ''}` })),
                              ...receivedFromLead.map(r => ({ type: 'Email', timestamp: r.receivedAt, description: `📥 Received: ${r.subject}\n${(r.bodyPreview || '').substring(0, 150)}${r.bodyPreview?.length > 150 ? '...' : ''}` }))
                            ];

                            // Filter out admin-only activities (reassignment logs) from employee view
                            const employeeActivities = (lead.activities || []).filter(a => 
                              a.type !== 'Reassignment' && 
                              !a.adminOnly && 
                              !(a.description && a.description.toLowerCase().includes('reassigned'))
                            );

                            const combinedActivities = [...employeeActivities, ...emailActivities].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                            return (
                              <>
                                {/* Admin Notes & Comments Panel */}
                                {(lead.notes || (lead.activities || []).some(a => a.type === 'Admin Comment')) && (
                                  <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                    {/* Admin Notes */}
                                    {lead.notes && (
                                      <div style={{ flex: '1 1 280px', padding: '14px 16px', borderRadius: 12, background: 'rgba(16,185,129,0.05)', border: '1.5px solid rgba(16,185,129,0.18)' }}>
                                        <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#059669', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                                          📝 Admin Notes
                                        </div>
                                        <p style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{lead.notes}</p>
                                      </div>
                                    )}

                                    {/* Latest Admin Comments */}
                                    {(() => {
                                      const adminComments = (lead.activities || []).filter(a => a.type === 'Admin Comment').sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                      if (adminComments.length === 0) return null;
                                      return (
                                        <div style={{ flex: '1 1 280px', padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1.5px solid rgba(99,102,241,0.18)' }}>
                                          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#6366f1', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            💬 Admin Comments ({adminComments.length})
                                          </div>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 140, overflowY: 'auto' }}>
                                            {adminComments.slice(0, 5).map((c, ci) => (
                                              <div key={ci} style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.06)', borderLeft: '3px solid #6366f1' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6366f1' }}>{c.by || 'Admin'}</span>
                                                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{new Date(c.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                                <p style={{ fontSize: '0.82rem', color: 'var(--text)', margin: 0, lineHeight: 1.5 }}>{c.description}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span>📋</span> Activity History
                                    {combinedActivities.length > 0 && (
                                      <span style={{
                                        background: 'var(--primary-glow)', color: 'var(--primary)',
                                        padding: '2px 8px', borderRadius: 50, fontSize: '0.72rem', fontWeight: 700,
                                      }}>
                                        {combinedActivities.length}
                                      </span>
                                    )}
                                  </h4>
                                  <button
                                    className="btn btn-sm btn-primary"
                                    onClick={(e) => { e.stopPropagation(); openFollowup(lead); }}
                                    style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                                  >
                                    + Add Follow-up
                                  </button>
                                </div>
                                {combinedActivities.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                              {/* Timeline line */}
                              <div style={{
                                position: 'absolute', left: 15, top: 12, bottom: 12,
                                width: 2, background: 'var(--surface-border)', borderRadius: 1,
                              }} />
                              {combinedActivities.map((a, ai) => {
                                const style = getActivityStyle(a.type);
                                return (
                                  <div key={`${a.id}-${ai}`} style={{
                                    display: 'flex', gap: 16, padding: '12px 0',
                                    position: 'relative', marginLeft: 0,
                                  }}>
                                    {/* Timeline dot */}
                                    <div style={{
                                      width: 30, height: 30, borderRadius: '50%',
                                      background: style.bg, border: `2px solid ${style.color}`,
                                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      flexShrink: 0, fontSize: '0.75rem', zIndex: 1,
                                    }}>
                                      {style.icon}
                                    </div>
                                    {/* Content */}
                                    <div style={{
                                      flex: 1, background: 'var(--surface)', borderRadius: 10,
                                      padding: '12px 16px', border: '1px solid var(--surface-border)',
                                      transition: 'box-shadow 0.2s',
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                          {new Date(a.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 4,
                                          padding: '2px 10px', borderRadius: 50,
                                          fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
                                          letterSpacing: '0.04em',
                                          background: style.bg, color: style.color,
                                        }}>
                                          {a.type}
                                        </span>
                                      </div>
                                      <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{a.description}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div style={{
                              textAlign: 'center', padding: '24px 16px',
                              color: 'var(--text-muted)', fontSize: '0.85rem',
                              background: 'var(--surface)', borderRadius: 10,
                              border: '1px dashed var(--surface-border)',
                            }}>
                              <p style={{ marginBottom: 8 }}>No activities yet</p>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={(e) => { e.stopPropagation(); openFollowup(lead); }}
                              >
                                Log first follow-up →
                              </button>
                            </div>
                          )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && editLead && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Lead</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}>×</button>
            </div>
            <div className="form-grid">
              {['companyName', 'contactPerson', 'phone', 'email', 'address'].map(f => (
                <div key={f} className="form-group">
                  <label className="form-label">{f.replace(/([A-Z])/g, ' $1')}</label>
                  <input value={editLead[f] || ''} onChange={e => setEditLead({...editLead, [f]: e.target.value})} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={editLead.status} onChange={e => setEditLead({...editLead, status: e.target.value})}>
                  {Object.keys(statusColors).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={editLead.priority} onChange={e => setEditLead({...editLead, priority: e.target.value})}>
                  {['Low', 'Medium', 'High', 'Hot'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea value={editLead.notes || ''} onChange={e => setEditLead({...editLead, notes: e.target.value})} />
            </div>
            <div className="form-actions">
              <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          CLIENT FOLLOW-UP LOG MODAL
          ═══════════════════════════════════════════════════ */}
      {showFollowup && followupLead && (
        <div className="modal-overlay" onClick={() => { setShowFollowup(false); setFollowupLead(null); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
            {/* Header */}
            <div className="modal-header" style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                }}>
                  <span style={{ fontSize: '1rem' }}>📋</span>
                </div>
                <div>
                  <h3 className="modal-title" style={{ marginBottom: 0 }}>Client Follow-up Log</h3>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setShowFollowup(false); setFollowupLead(null); }}>×</button>
            </div>
            <p style={{ color: 'var(--primary-light)', fontSize: '0.78rem', fontWeight: 500, marginBottom: 20, marginLeft: 48 }}>
              Log every follow-up to maintain accurate pipeline records
            </p>

            {followupSuccess ? (
              <div style={{
                textAlign: 'center', padding: '40px 20px',
                animation: 'slideUp 0.3s ease',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'rgba(52, 211, 153, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: '1.8rem',
                }}>✅</div>
                <h4 style={{ fontWeight: 700, marginBottom: 4 }}>Follow-up Logged!</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Activity added to {followupLead.companyName}</p>
              </div>
            ) : (
              <div>
                {/* Date */}
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={followupForm.date}
                    onChange={e => setFollowupForm({ ...followupForm, date: e.target.value })}
                  />
                </div>

                {/* Client Name + Contact Person */}
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label className="form-label">Client Name</label>
                    <input
                      value={followupLead.companyName}
                      readOnly
                      style={{ background: 'var(--bg-secondary)', opacity: 0.8, cursor: 'default' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact Person</label>
                    <input
                      value={followupLead.contactPerson}
                      readOnly
                      style={{ background: 'var(--bg-secondary)', opacity: 0.8, cursor: 'default' }}
                    />
                  </div>
                </div>

                {/* Mode of Follow-up */}
                <div className="form-group">
                  <label className="form-label">Mode of Follow-up</label>
                  <select
                    value={followupForm.mode}
                    onChange={e => setFollowupForm({ ...followupForm, mode: e.target.value })}
                  >
                    {followupModes.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Discussion Summary */}
                <div className="form-group">
                  <label className="form-label">Discussion Summary</label>
                  <textarea
                    placeholder="What was discussed..."
                    rows={3}
                    value={followupForm.discussionSummary}
                    onChange={e => setFollowupForm({ ...followupForm, discussionSummary: e.target.value })}
                  />
                </div>

                {/* Client Response / Status */}
                <div className="form-group">
                  <label className="form-label">Client Response / Status</label>
                  <select
                    value={followupForm.clientResponse}
                    onChange={e => setFollowupForm({ ...followupForm, clientResponse: e.target.value })}
                  >
                    {clientResponseOptions.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                {/* Next Action Required */}
                <div className="form-group">
                  <label className="form-label">Next Action Required</label>
                  <textarea
                    placeholder="Send revised proposal, schedule demo..."
                    rows={2}
                    value={followupForm.nextAction}
                    onChange={e => setFollowupForm({ ...followupForm, nextAction: e.target.value })}
                  />
                </div>

                {/* Next Follow-up Date */}
                <div className="form-group">
                  <label className="form-label">Next Follow-up Date</label>
                  <input
                    type="date"
                    value={followupForm.nextFollowupDate}
                    onChange={e => setFollowupForm({ ...followupForm, nextFollowupDate: e.target.value })}
                  />
                </div>

                {/* Submit */}
                <button
                  className="btn btn-lg w-full"
                  onClick={handleFollowupSubmit}
                  disabled={followupSubmitting || !followupForm.date}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
                    color: '#fff', justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
                    borderRadius: 12, marginTop: 4, fontWeight: 700,
                    transition: 'all 0.2s',
                  }}
                >
                  {followupSubmitting ? 'Submitting...' : 'Submit Follow-up'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
        {[
          { icon: '➕', label: 'Add Lead', href: '/dashboard/workspace/add', desc: 'Create new lead entry' },
          { icon: '📊', label: 'Bulk Upload', href: '/dashboard/workspace/bulk', desc: 'Import leads from CSV/Excel' },
          { icon: '✉️', label: 'Compose Email', href: '/dashboard/workspace/email', desc: 'Send emails to leads' },
          { icon: '📎', label: 'Proof of Work', href: '/dashboard/workspace/proof', desc: 'Submit work evidence' },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="card card-glow" style={{ textDecoration: 'none', color: 'var(--text)', textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{item.icon}</div>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.desc}</p>
          </Link>
        ))}
      </div>

      {/* Scoped styles for action buttons */}
      <style>{`
        .workspace-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 12px;
          border-radius: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          font-family: var(--font-family);
        }
        .workspace-action-email {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: #fff;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .workspace-action-email:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          filter: brightness(1.08);
        }
        .workspace-action-followup {
          background: linear-gradient(135deg, #6366f1, #7c3aed);
          color: #fff;
          box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
        }
        .workspace-action-followup:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          filter: brightness(1.08);
        }
        .workspace-action-conversation {
          background: linear-gradient(135deg, #8b5cf6, #a78bfa);
          color: #fff;
          box-shadow: 0 2px 6px rgba(139, 92, 246, 0.3);
        }
        .workspace-action-conversation:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
          filter: brightness(1.08);
        }
        .workspace-action-followup-overdue {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
          box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
          animation: followupPulse 2s ease-in-out infinite;
        }
        .workspace-action-followup-overdue:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.5);
          filter: brightness(1.08);
        }
        .workspace-action-followup-today {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.4);
          animation: followupPulse 2.5s ease-in-out infinite;
        }
        .workspace-action-followup-today:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(245, 158, 11, 0.5);
          filter: brightness(1.08);
        }
        .workspace-action-followup-scheduled {
          background: linear-gradient(135deg, #10b981, #059669);
          color: #fff;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.35);
        }
        .workspace-action-followup-scheduled:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
          filter: brightness(1.08);
        }
        @keyframes followupPulse {
          0%, 100% { box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 2px 14px rgba(239, 68, 68, 0.6); }
        }
        @media (max-width: 768px) {
          .workspace-action-btn {
            padding: 4px 8px;
            font-size: 0.68rem;
          }
        }
      `}</style>
    </div>
  );
}
