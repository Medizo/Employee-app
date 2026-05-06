'use client';
import { useState, useEffect } from 'react';

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [prioFilter, setPrioFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');

  useEffect(() => { fetchTasks(); }, []);
  const fetchTasks = () => fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));

  const isOverdue = (t) => t.status !== 'Completed' && new Date(t.deadline) < new Date();
  const getDisplayStatus = (t) => isOverdue(t) ? 'Overdue' : t.status;

  const filtered = tasks
    .filter(t => (!filter || getDisplayStatus(t) === filter) && (!prioFilter || t.priority === prioFilter))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const updateStatus = async (id, status) => {
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
    fetchTasks();
    if (detail?.id === id) setDetail(d => ({ ...d, status }));
  };

  const addComment = async () => {
    if (!comment.trim() || !detail) return;
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: detail.id, newComment: comment }) });
    setComment('');
    fetchTasks();
    const res = await fetch('/api/tasks');
    const d = await res.json();
    setDetail(d.tasks.find(t => t.id === detail.id));
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📨 Assigned Tasks</h2>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pending', count: tasks.filter(t => t.status === 'Pending' && !isOverdue(t)).length, color: '#f59e0b', icon: '⏳' },
          { label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length, color: '#3b82f6', icon: '🔄' },
          { label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length, color: '#10b981', icon: '✅' },
          { label: 'Overdue', count: tasks.filter(t => isOverdue(t)).length, color: '#ef4444', icon: '🚨' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: 'center', padding: 14, cursor: 'pointer', border: filter === s.label ? `2px solid ${s.color}` : undefined }}
            onClick={() => setFilter(filter === s.label ? '' : s.label)}>
            <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.count}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select value={prioFilter} onChange={e => setPrioFilter(e.target.value)} style={{ padding: '8px 12px', border: '1.5px solid var(--surface-border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem' }}>
          <option value="">All Priority</option>
          {['Urgent', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')}>Clear filter ×</button>}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tasks found</div>
        ) : filtered.map(t => (
          <div key={t.id} className="card" style={{ padding: 16, cursor: 'pointer', borderLeft: `4px solid ${isOverdue(t) ? '#ef4444' : t.priority === 'Urgent' ? '#ef4444' : t.priority === 'High' ? '#f97316' : t.priority === 'Medium' ? '#f59e0b' : '#3b82f6'}` }}
            onClick={() => setDetail(t)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 4 }}>{t.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8 }}>{t.description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span className={`badge badge-${isOverdue(t) ? 'rejected' : t.status === 'Completed' ? 'approved' : t.status === 'In Progress' ? 'submitted' : 'pending'}`}>{getDisplayStatus(t)}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 Due: {new Date(t.deadline).toLocaleDateString()}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                {t.status === 'Pending' && <button className="btn btn-sm btn-primary" onClick={() => updateStatus(t.id, 'In Progress')}>▶ Start</button>}
                {t.status === 'In Progress' && <button className="btn btn-sm btn-success" onClick={() => updateStatus(t.id, 'Completed')}>✅ Done</button>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">{detail.title}</h3>
              <button className="modal-close" onClick={() => setDetail(null)}>×</button>
            </div>
            <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>{detail.description}</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <span className={`badge badge-${detail.priority.toLowerCase()}`}>{detail.priority}</span>
              <span className={`badge badge-${isOverdue(detail) ? 'rejected' : 'submitted'}`}>{getDisplayStatus(detail)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Assigned:</span> {new Date(detail.assignedDate).toLocaleDateString()}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Deadline:</span> {new Date(detail.deadline).toLocaleDateString()}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {detail.status === 'Pending' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(detail.id, 'In Progress')}>▶ Start</button>}
              {detail.status === 'In Progress' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(detail.id, 'Completed')}>✅ Complete</button>}
            </div>

            {/* Comments */}
            <h4 style={{ fontWeight: 600, marginBottom: 12 }}>💬 Comments</h4>
            {detail.comments?.map(c => (
              <div key={c.id} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 8, fontSize: '0.85rem' }}>
                <p>{c.text}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(c.timestamp).toLocaleString()}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary btn-sm" onClick={addComment}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
