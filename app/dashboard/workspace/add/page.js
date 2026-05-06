'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddLeadPage() {
  const router = useRouter();
  const [form, setForm] = useState({ companyName: '', contactPerson: '', phone: '', email: '', address: '', servicesInterested: [], source: '', notes: '', priority: 'Medium' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const services = ['Web Development', 'Mobile App', 'SEO', 'Digital Marketing', 'E-commerce', 'CRM', 'Cloud Solutions', 'Data Analytics', 'IoT Solutions', 'LMS Platform'];
  const sources = ['Website', 'Referral', 'Cold Call', 'Social Media', 'Event', 'LinkedIn', 'Other'];

  const validate = () => {
    const e = {};
    if (!form.companyName.trim()) e.companyName = 'Required';
    if (!form.contactPerson.trim()) e.contactPerson = 'Required';
    if (!form.phone.trim()) e.phone = 'Required';
    else if (!/^[\+]?[\d\s\-]{8,15}$/.test(form.phone)) e.phone = 'Invalid phone';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setErrors({ submit: data.error }); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => router.push('/dashboard/workspace'), 1500);
  };

  const toggleService = (s) => {
    setForm(f => ({ ...f, servicesInterested: f.servicesInterested.includes(s) ? f.servicesInterested.filter(x => x !== s) : [...f.servicesInterested, s] }));
  };

  if (success) return (
    <div className="animate-fade" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
      <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Lead Added Successfully!</h2>
      <p style={{ color: 'var(--text-muted)' }}>Redirecting to workspace...</p>
    </div>
  );

  return (
    <div className="animate-fade" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} className="btn btn-ghost">← Back</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>➕ Add New Lead</h2>
      </div>

      {errors.submit && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger)', marginBottom: 16 }}>{errors.submit}</div>}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-grid">
          {[
            { key: 'companyName', label: 'Company Name *', type: 'text', placeholder: 'Acme Corp' },
            { key: 'contactPerson', label: 'Contact Person *', type: 'text', placeholder: 'John Doe' },
            { key: 'phone', label: 'Phone *', type: 'tel', placeholder: '+91 98765 43210' },
            { key: 'email', label: 'Email *', type: 'email', placeholder: 'john@acme.com' },
          ].map(f => (
            <div key={f.key} className="form-group">
              <label className="form-label">{f.label}</label>
              <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} style={errors[f.key] ? { borderColor: 'var(--danger)' } : {}} />
              {errors[f.key] && <p className="form-error">{errors[f.key]}</p>}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label className="form-label">Company Address</label>
          <input placeholder="123 Business St, City" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        </div>

        <div className="form-group">
          <label className="form-label">Services Interested</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {services.map(s => (
              <button key={s} type="button" onClick={() => toggleService(s)}
                style={{ padding: '6px 14px', borderRadius: 50, fontSize: '0.8rem', fontWeight: 500, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: form.servicesInterested.includes(s) ? 'var(--primary)' : 'transparent',
                  color: form.servicesInterested.includes(s) ? '#fff' : 'var(--text-secondary)',
                  borderColor: form.servicesInterested.includes(s) ? 'var(--primary)' : 'var(--surface-border)',
                }}>{s}</button>
            ))}
          </div>
        </div>

        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Lead Source</label>
            <select value={form.source} onChange={e => setForm({...form, source: e.target.value})}>
              <option value="">Select source</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['Low', 'Medium', 'High', 'Hot'].map(p => (
                <button key={p} type="button" onClick={() => setForm({...form, priority: p})}
                  className={`badge badge-${p.toLowerCase()}`}
                  style={{ cursor: 'pointer', padding: '6px 14px', opacity: form.priority === p ? 1 : 0.4, transform: form.priority === p ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.15s' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Initial Notes</label>
          <textarea placeholder="Any initial notes about this lead..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={3} />
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Adding...' : '➕ Add Lead'}</button>
        </div>
      </form>
    </div>
  );
}
