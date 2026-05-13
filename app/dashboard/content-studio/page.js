'use client';
import { useState, useEffect, useRef } from 'react';
import { useUser } from '../context';
import { PenTool, Send, Share2, MessageCircle, Image, Trash2, CheckCircle2, XCircle, FileText, Eye, ArrowLeft, Loader2, AlertTriangle, Link2, Upload, X } from 'lucide-react';

export default function ContentStudioPage() {
  const ctx = useUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [platforms, setPlatforms] = useState({ linkedin: true, twitter: false });
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [linkedin, setLinkedin] = useState({ connected: false, name: null, loading: true });
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileRef = useRef(null);

  const fetchPosts = () => {
    fetch('/api/content').then(r => r.json()).then(d => { setPosts(d.posts || []); setLoading(false); }).catch(() => setLoading(false));
  };

  const fetchLinkedInStatus = () => {
    fetch('/api/linkedin/status').then(r => r.json()).then(d => {
      setLinkedin({ connected: d.connected, name: d.linkedinName, loading: false, expired: d.expired });
    }).catch(() => setLinkedin(prev => ({ ...prev, loading: false })));
  };

  useEffect(() => {
    fetchPosts();
    fetchLinkedInStatus();
    // Check URL params for OAuth callback result
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin_connected')) {
      setLinkedin({ connected: true, name: params.get('name') || 'Connected', loading: false });
      window.history.replaceState({}, '', '/dashboard/content-studio');
    }
    if (params.get('linkedin_error')) {
      setPublishResult({ success: false, errors: [`LinkedIn: ${params.get('linkedin_error')}`] });
      window.history.replaceState({}, '', '/dashboard/content-studio');
    }
  }, []);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { setImageBase64(ev.target.result); setImagePreview(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSaveDraft = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    await fetch('/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, platforms: Object.keys(platforms).filter(k => platforms[k]) }),
    });
    setSaving(false); setTitle(''); setBody(''); setImageBase64(null); setImagePreview(null);
    setView('list'); fetchPosts();
  };

  const handlePublish = async (postId, imgData) => {
    setPublishing(true); setPublishResult(null);
    const selectedPlatforms = Object.keys(platforms).filter(k => platforms[k]);
    try {
      const res = await fetch('/api/content/publish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, platforms: selectedPlatforms, imageBase64: imgData || null }),
      });
      const data = await res.json();
      setPublishResult(data); fetchPosts();
    } catch (err) {
      setPublishResult({ success: false, errors: [err.message] });
    }
    setPublishing(false);
  };

  const handleSaveAndPublish = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    const res = await fetch('/api/content', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, platforms: Object.keys(platforms).filter(k => platforms[k]) }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.post?.id) {
      await handlePublish(data.post.id, imageBase64);
      setTitle(''); setBody(''); setImageBase64(null); setImagePreview(null);
      setView('list'); fetchPosts();
    }
  };

  const handleDelete = async (id) => { await fetch(`/api/content?id=${id}`, { method: 'DELETE' }); fetchPosts(); };

  const statusBadge = (status) => {
    const m = { draft: { bg: '#f1f5f9', color: '#64748b', icon: FileText, label: 'Draft' }, published: { bg: '#f0fdf4', color: '#16a34a', icon: CheckCircle2, label: 'Published' }, partial: { bg: '#fffbeb', color: '#d97706', icon: AlertTriangle, label: 'Partial' }, failed: { bg: '#fef2f2', color: '#ef4444', icon: XCircle, label: 'Failed' } };
    const s = m[status] || m.draft; const Icon = s.icon;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 8, background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}><Icon size={12} /> {s.label}</span>;
  };

  const platformIcon = (platform, posted) => {
    const Icon = platform === 'linkedin' ? Share2 : MessageCircle;
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 6, background: posted ? '#f0fdf4' : '#fef2f2', color: posted ? '#16a34a' : '#ef4444', fontSize: '0.7rem', fontWeight: 600 }}><Icon size={11} /> {posted ? '✓' : '✗'}</span>;
  };

  if (loading) return (
    <div className="animate-fade" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid var(--surface-border)', borderTopColor: '#ec4899', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Content Studio...</p>
      </div>
    </div>
  );

  // ── CREATE VIEW ──
  if (view === 'create') return (
    <div className="animate-fade">
      <button onClick={() => { setView('list'); setPublishResult(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, marginBottom: 16, padding: 0 }}>
        <ArrowLeft size={16} /> Back to Posts
      </button>

      {/* LinkedIn Connection Banner */}
      {!linkedin.loading && !linkedin.connected && (
        <div style={{ padding: '14px 20px', borderRadius: 12, background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Share2 size={18} color="#0077b5" />
            <div><p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e40af' }}>Connect LinkedIn to publish</p><p style={{ fontSize: '0.75rem', color: '#3b82f6' }}>{linkedin.expired ? 'Token expired — reconnect to continue posting' : 'One-time setup to enable auto-posting'}</p></div>
          </div>
          <a href="/api/linkedin/auth" style={{ padding: '8px 18px', borderRadius: 8, background: '#0077b5', color: '#fff', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Link2 size={14} /> Connect LinkedIn
          </a>
        </div>
      )}
      {!linkedin.loading && linkedin.connected && (
        <div style={{ padding: '10px 16px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#16a34a' }}>LinkedIn connected as {linkedin.name}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>
        {/* Editor */}
        <div className="card">
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}><PenTool size={18} color="#ec4899" /> Compose Post</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter post title..." style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--surface-border)', borderRadius: 10, fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Content</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Write your post content here..." rows={6} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--surface-border)', borderRadius: 10, fontSize: '0.9rem', background: 'var(--bg)', color: 'var(--text)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <p style={{ fontSize: '0.72rem', color: body.length > 280 ? '#ef4444' : 'var(--text-muted)', marginTop: 4 }}>{body.length}/280 characters (Twitter limit)</p>
          </div>

          {/* Image Upload — NOT stored in MongoDB, sent directly to LinkedIn */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Attach Image (optional — posted to LinkedIn only, not saved)</label>
            <input type="file" ref={fileRef} accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleImageSelect} style={{ display: 'none' }} />
            {!imagePreview ? (
              <button onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: 10, border: '2px dashed var(--surface-border)', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, width: '100%', justifyContent: 'center' }}>
                <Upload size={16} /> Click to upload image (max 5MB)
              </button>
            ) : (
              <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid var(--surface-border)' }}>
                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }} />
                <button onClick={() => { setImageBase64(null); setImagePreview(null); }} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Platform Toggles */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Publish To</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ key: 'linkedin', label: 'LinkedIn', icon: Share2, color: '#0077b5', ready: linkedin.connected }, { key: 'twitter', label: 'Twitter / X', icon: MessageCircle, color: '#1da1f2', ready: false }].map(p => (
                <button key={p.key} onClick={() => p.ready && setPlatforms(prev => ({ ...prev, [p.key]: !prev[p.key] }))}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `2px solid ${platforms[p.key] && p.ready ? p.color : 'var(--surface-border)'}`, background: platforms[p.key] && p.ready ? `${p.color}10` : 'var(--bg)', color: platforms[p.key] && p.ready ? p.color : 'var(--text-muted)', cursor: p.ready ? 'pointer' : 'not-allowed', fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s', opacity: p.ready ? 1 : 0.5 }}>
                  <p.icon size={16} /> {p.label}
                  {platforms[p.key] && p.ready && <CheckCircle2 size={14} />}
                  {!p.ready && <span style={{ fontSize: '0.65rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>Soon</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSaveDraft} disabled={saving || !title.trim() || !body.trim()} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid var(--surface-border)', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: (!title.trim() || !body.trim()) ? 0.5 : 1 }}>
              {saving ? 'Saving...' : '💾 Save Draft'}
            </button>
            <button onClick={handleSaveAndPublish} disabled={publishing || saving || !title.trim() || !body.trim() || !linkedin.connected}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: '#fff', cursor: (!title.trim() || !body.trim() || !linkedin.connected) ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, opacity: (!title.trim() || !body.trim() || !linkedin.connected) ? 0.5 : 1, boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }}>
              {publishing ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Publishing...</> : <><Send size={15} /> Publish Now</>}
            </button>
          </div>

          {publishResult && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 10, background: publishResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${publishResult.success ? '#bbf7d0' : '#fecaca'}` }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: publishResult.success ? '#16a34a' : '#ef4444', marginBottom: 4 }}>{publishResult.success ? '✅ Published successfully to LinkedIn!' : '⚠️ Publishing had issues'}</p>
              {publishResult.errors?.map((e, i) => <p key={i} style={{ fontSize: '0.78rem', color: '#ef4444' }}>• {e}</p>)}
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div>
          <h4 style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> LinkedIn Preview</h4>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #0077b5, #0a66c2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{ctx?.user?.name?.charAt(0) || 'C'}</div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#000' }}>{linkedin.name || ctx?.user?.name || 'Company'}</p>
                <p style={{ fontSize: '0.7rem', color: '#666' }}>Just now · <Share2 size={10} style={{ verticalAlign: 'middle' }} /></p>
              </div>
            </div>
            <div style={{ padding: '0 16px 14px' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#000', marginBottom: 4 }}>{title || 'Your post title...'}</p>
              <p style={{ fontSize: '0.82rem', color: '#333', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{body || 'Your post content will appear here...'}</p>
            </div>
            {imagePreview && <img src={imagePreview} alt="Post image" style={{ width: '100%', maxHeight: 280, objectFit: 'cover' }} />}
            <div style={{ borderTop: '1px solid #e5e7eb', padding: '8px 16px', display: 'flex', gap: 24 }}>
              {['👍 Like', '💬 Comment', '🔄 Repost', '📤 Send'].map(a => <span key={a} style={{ fontSize: '0.72rem', color: '#666', fontWeight: 500 }}>{a}</span>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ── LIST VIEW ──
  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #ec4899, #f43f5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(236,72,153,0.25)' }}><PenTool size={22} color="#fff" /></div>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: '1.3rem', letterSpacing: '-0.02em' }}>Content Studio</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Create posts and auto-publish to LinkedIn</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {linkedin.connected ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.78rem', fontWeight: 600, color: '#16a34a' }}>
              <CheckCircle2 size={13} /> LinkedIn: {linkedin.name}
            </span>
          ) : (
            <a href="/api/linkedin/auth" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: '#0077b5', color: '#fff', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
              <Link2 size={14} /> Connect LinkedIn
            </a>
          )}
          <button onClick={() => { setView('create'); setTitle(''); setBody(''); setPublishResult(null); setImageBase64(null); setImagePreview(null); }}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 16px rgba(236,72,153,0.3)' }}>
            <PenTool size={15} /> New Post
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px', background: 'rgba(236,72,153,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><PenTool size={28} color="#ec4899" /></div>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>No posts yet</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: 360, margin: '0 auto' }}>Create your first post and publish it to LinkedIn with one click!</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead><tr><th>Title</th><th>Created</th><th>LinkedIn</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {posts.map(post => (
                <tr key={post.id}>
                  <td><div><span style={{ fontWeight: 600 }}>{post.title}</span><p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.body}</p></div></td>
                  <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}</td>
                  <td>{platformIcon('linkedin', post.publishedTo?.linkedin?.posted)}</td>
                  <td>{statusBadge(post.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {post.status === 'draft' && <button onClick={() => handlePublish(post.id)} disabled={publishing || !linkedin.connected} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: linkedin.connected ? 1 : 0.5 }}><Send size={11} /> Publish</button>}
                      <button onClick={() => handleDelete(post.id)} style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--surface-border)', background: 'var(--bg)', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
