'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const statusColors = { New: 'new', Contacted: 'contacted', Qualified: 'qualified', Proposal: 'proposal', Closed: 'closed', Lost: 'lost' };

export default function WorkspacePage() {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editLead, setEditLead] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => { fetchLeads(); }, []);
  const fetchLeads = () => {
    setLoading(true);
    fetch('/api/leads').then(r => r.json()).then(d => { setLeads(d.leads || []); setLoading(false); });
  };

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.companyName.toLowerCase().includes(search.toLowerCase()) || l.contactPerson.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleDelete = async (id) => {
    if (!confirm('Delete this lead?')) return;
    await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
    fetchLeads();
  };

  const handleSaveEdit = async () => {
    await fetch('/api/leads', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editLead) });
    setShowEdit(false); setEditLead(null); fetchLeads();
  };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>👥 Lead Roster</h2>
        <Link href="/dashboard/workspace/add" className="btn btn-primary">➕ Add Lead</Link>
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
                <th className="hide-mobile">Phone</th>
                <th className="hide-mobile">Service</th>
                <th>Status</th>
                <th className="hide-mobile">Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <React.Fragment key={lead.id}>
                  <tr style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === lead.id ? null : lead.id)}>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ transform: expanded === lead.id ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                        {i + 1}
                      </span>
                    </td>
                    <td><strong>{lead.companyName}</strong></td>
                    <td>{lead.contactPerson}</td>
                    <td className="hide-mobile">{lead.phone}</td>
                    <td className="hide-mobile">{lead.servicesInterested?.join(', ') || '-'}</td>
                    <td><span className={`badge badge-${statusColors[lead.status] || 'new'}`}>{lead.status}</span></td>
                    <td className="hide-mobile" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(lead.updatedAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setEditLead({...lead}); setShowEdit(true); }} title="Edit">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(lead.id)} title="Delete">🗑️</button>
                      </div>
                    </td>
                  </tr>
                  {expanded === lead.id && (
                    <tr key={lead.id + '-exp'}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <div style={{ padding: '16px 24px', background: 'var(--bg-secondary)', animation: 'slideUp 0.3s ease' }}>
                          <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: '0.9rem' }}>📋 Activity Log</h4>
                          {lead.activities?.length > 0 ? lead.activities.map(a => (
                            <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 10, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(a.timestamp).toLocaleDateString()}</span>
                              <span className="badge badge-submitted" style={{ flexShrink: 0 }}>{a.type}</span>
                              <span>{a.description}</span>
                            </div>
                          )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activities yet</p>}
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

      {/* Sub-navigation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 24 }}>
        {[
          { icon: '➕', label: 'Add Lead', href: '/dashboard/workspace/add', desc: 'Create new lead entry' },
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
    </div>
  );
}
