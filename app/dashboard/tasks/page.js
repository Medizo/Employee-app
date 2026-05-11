'use client';
import { useState, useEffect } from 'react';
import { ListTodo, Clock, RotateCcw, CheckCircle2, AlertTriangle, Play, Check, MessageSquare, Send, X, Calendar, Paperclip } from 'lucide-react';

const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('');
  const [prioFilter, setPrioFilter] = useState('');
  const [detail, setDetail] = useState(null);
  const [comment, setComment] = useState('');
  const [proofFile, setProofFile] = useState(null);

  useEffect(() => { fetchTasks(); }, []);
  const fetchTasks = () => fetch('/api/tasks').then(r => r.json()).then(d => setTasks(d.tasks || []));

  const isOverdue = (t) => t.status !== 'Completed' && new Date(t.deadline) < new Date();
  const getDisplayStatus = (t) => isOverdue(t) ? 'Overdue' : t.status;

  const filtered = tasks
    .filter(t => (!filter || getDisplayStatus(t) === filter) && (!prioFilter || t.priority === prioFilter))
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const updateStatus = async (id, status, proof = null) => {
    const payload = { id, status };
    if (proof) payload.completionProof = proof;
    await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    fetchTasks();
    if (detail?.id === id) setDetail(d => ({ ...d, status, completionProof: proof || d.completionProof }));
    if (status === 'Completed') setProofFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => setProofFile(event.target.result);
    reader.readAsDataURL(file);
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

  const statusCards = [
    { label: 'Pending', count: tasks.filter(t => t.status === 'Pending' && !isOverdue(t)).length, color: '#f59e0b', icon: Clock, bg: 'rgba(245,158,11,0.08)' },
    { label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length, color: '#6366f1', icon: RotateCcw, bg: 'rgba(99,102,241,0.08)' },
    { label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length, color: '#34d399', icon: CheckCircle2, bg: 'rgba(52,211,153,0.08)' },
    { label: 'Overdue', count: tasks.filter(t => isOverdue(t)).length, color: '#f87171', icon: AlertTriangle, bg: 'rgba(248,113,113,0.08)' },
  ];

  const priorityColors = { Urgent: '#f87171', High: '#f97316', Medium: '#f59e0b', Low: '#6366f1' };

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ListTodo size={20} color="var(--primary)" />
        </div>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Assigned Tasks</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tasks.length} total tasks</p>
        </div>
      </div>

      {/* Status summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statusCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="card" style={{
              textAlign: 'center', padding: 18, cursor: 'pointer',
              borderColor: filter === s.label ? s.color : undefined,
              borderWidth: filter === s.label ? 2 : 1,
              transition: 'all 0.2s',
            }} onClick={() => setFilter(filter === s.label ? '' : s.label)}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <Icon size={20} color={s.color} />
              </div>
              <p style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</p>
            </div>
          );
        })}
      </div>

      {/* Priority filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={prioFilter} onChange={e => setPrioFilter(e.target.value)} style={{ padding: '8px 14px', border: '1.5px solid var(--surface-border)', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', fontSize: '0.85rem', width: 'auto', minWidth: 140 }}>
          <option value="">All Priority</option>
          {['Urgent', 'High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {filter && <button className="btn btn-ghost btn-sm" onClick={() => setFilter('')} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Clear filter</button>}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <ListTodo size={22} color="var(--text-muted)" />
            </div>
            <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>No tasks found</p>
          </div>
        ) : filtered.map((t, idx) => (
          <div key={`${t.id}-${idx}`} className="card" style={{
            padding: 18, cursor: 'pointer',
            borderLeft: `4px solid ${priorityColors[t.priority] || '#6366f1'}`,
            transition: 'all 0.15s',
          }}
            onClick={() => setDetail(t)}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontWeight: 700, marginBottom: 4, fontSize: '0.95rem' }}>{t.title}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <span className={`badge badge-${isOverdue(t) ? 'danger' : t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'info' : 'warning'}`}>{getDisplayStatus(t)}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Calendar size={12} /> {new Date(t.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {t.status === 'Pending' && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateStatus(t.id, 'In Progress')} style={{ gap: 4 }}>
                    <Play size={13} /> Start
                  </button>
                )}
                {t.status === 'In Progress' && (
                  <button className="btn btn-success btn-sm" onClick={() => updateStatus(t.id, 'Completed')} style={{ gap: 4 }}>
                    <Check size={13} /> Done
                  </button>
                )}
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
              <span className={`badge badge-${isOverdue(detail) ? 'danger' : detail.status === 'Completed' ? 'success' : 'info'}`}>{getDisplayStatus(detail)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Assigned:</span> {new Date(detail.createdAt || detail.deadline).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="var(--text-muted)" />
                <span style={{ color: 'var(--text-muted)' }}>Deadline:</span> {new Date(detail.deadline).toLocaleDateString()}
              </div>
            </div>

            {detail.status === 'In Progress' && (
               <div style={{ marginBottom: 20, background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10 }}>
                 <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} /> Attach work (Optional)
                 </p>
                 <input type="file" accept=".pdf,image/*" onChange={handleFileChange} style={{ fontSize: '0.8rem', width: '100%' }} />
               </div>
            )}

            {detail.completionProof && (
               <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                 <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Paperclip size={14} /> Attached Work
                 </p>
                 {detail.completionProof.startsWith('data:image') ? (
                    <img src={detail.completionProof} alt="Proof" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />
                 ) : (
                    <a href={detail.completionProof} download="Attachment" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'underline' }}>Download Attachment</a>
                 )}
               </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {detail.status === 'Pending' && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(detail.id, 'In Progress')}><Play size={14} /> Start</button>}
              {detail.status === 'In Progress' && <button className="btn btn-success btn-sm" onClick={() => updateStatus(detail.id, 'Completed', proofFile)}><Check size={14} /> Complete Task</button>}
            </div>

            {/* Comments */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MessageSquare size={16} color="var(--primary)" />
              <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>Comments</h4>
            </div>
            {detail.comments?.map((c, ci) => (
              <div key={`${c.id}-${ci}`} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: 8, fontSize: '0.85rem' }}>
                <p>{c.text}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{new Date(c.timestamp).toLocaleString()}</p>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} onKeyDown={e => e.key === 'Enter' && addComment()} />
              <button className="btn btn-primary btn-sm" onClick={addComment}><Send size={14} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
