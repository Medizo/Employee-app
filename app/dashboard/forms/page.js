'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const formTypes = [
  { key: 'lead', icon: '🎯', label: 'Lead Entry', desc: 'Register a new lead', color: '#8b5cf6' },
  { key: 'followup', icon: '🔄', label: 'Client Follow-up', desc: 'Log follow-up activity', color: '#f59e0b' },
  { key: 'expense', icon: '🧾', label: 'Expense Report', desc: 'Submit expense claims', color: '#ef4444' },
  { key: 'daily', icon: '📊', label: 'Daily Activity Report', desc: 'Submit your end-of-day report', color: '#06b6d4' },
];

const formFields = {
  lead: [
    { name: 'companyName', label: 'Company Name', type: 'text', required: true },
    { name: 'contactPerson', label: 'Contact Person', type: 'text', required: true },
    { name: 'designation', label: 'Designation', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'tel', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'companySize', label: 'Company Size', type: 'select', options: ['1-10', '11-50', '51-200', '201-500', '500+'] },
    { name: 'industry', label: 'Industry', type: 'select', options: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail', 'Manufacturing', 'Other'] },
    { name: 'budgetRange', label: 'Budget Range', type: 'select', options: ['Under ₹1L', '₹1L - ₹5L', '₹5L - ₹10L', '₹10L - ₹25L', '₹25L+'] },
    { name: 'leadSource', label: 'Lead Source', type: 'select', options: ['Website', 'Referral', 'Cold Call', 'Social Media', 'Event', 'LinkedIn'] },
    { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Hot'] },
    { name: 'notes', label: 'Initial Notes', type: 'textarea' },
  ],
  followup: [
    { name: 'clientName', label: 'Client / Lead Name', type: 'text', required: true },
    { name: 'followUpDate', label: 'Follow-up Date', type: 'date', required: true },
    { name: 'followUpTime', label: 'Follow-up Time', type: 'time' },
    { name: 'mode', label: 'Mode', type: 'select', options: ['Call', 'Email', 'Visit', 'Video Call'] },
    { name: 'summary', label: 'Discussion Summary', type: 'textarea', required: true },
    { name: 'clientMood', label: 'Client Response', type: 'select', options: ['Very Interested', 'Interested', 'Neutral', 'Hesitant', 'Not Interested'] },
    { name: 'nextAction', label: 'Next Action Required', type: 'text' },
    { name: 'nextFollowUp', label: 'Next Follow-up Date', type: 'date' },
  ],
  expense: [
    { name: 'expenseDate', label: 'Expense Date', type: 'date', required: true },
    { name: 'category', label: 'Category', type: 'select', options: ['Travel', 'Food', 'Client Meeting', 'Office Supplies', 'Other'], required: true },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true },
    { name: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD', 'EUR', 'GBP'] },
    { name: 'description', label: 'Description', type: 'text', required: true },
  ],
  daily: [
    { name: 'date', label: 'Date', type: 'date', required: true },
    { name: 'totalCalls', label: 'Total Calls Made', type: 'number', required: true },
    { name: 'totalEmails', label: 'Total Emails Sent', type: 'number', required: true },
    { name: 'demos', label: 'Demos / Presentations', type: 'number' },
    { name: 'newLeads', label: 'New Leads Generated', type: 'number' },
    { name: 'followUps', label: 'Follow-ups Completed', type: 'number' },
    { name: 'dealsInPipeline', label: 'Deals in Pipeline', type: 'number' },
    { name: 'revenue', label: 'Revenue Closed (₹)', type: 'number' },
    { name: 'highlights', label: 'Key Highlights', type: 'textarea', required: true },
    { name: 'challenges', label: 'Challenges Faced', type: 'textarea' },
    { name: 'planForTomorrow', label: 'Plan for Tomorrow', type: 'textarea', required: true },
  ],
};

const formLabels = { lead: 'Lead Entry', followup: 'Client Follow-up', expense: 'Expense Report', daily: 'Daily Activity Report' };

export default function FormsPage() {
  const router = useRouter();
  const [activeForm, setActiveForm] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showDailyReminder, setShowDailyReminder] = useState(false);
  const [dailySubmittedToday, setDailySubmittedToday] = useState(false);

  // Check if daily report should be prompted (after 8 PM)
  const checkDailyReport = useCallback(async () => {
    const now = new Date();
    const hour = now.getHours();
    
    if (hour >= 20) {
      // Check if already submitted today
      try {
        const res = await fetch('/api/submissions?type=Daily Activity Report');
        const data = await res.json();
        const todayStr = now.toISOString().split('T')[0];
        const hasToday = (data.submissions || []).some(s => {
          const subDate = new Date(s.submittedAt).toISOString().split('T')[0];
          return subDate === todayStr;
        });
        
        if (!hasToday) {
          setShowDailyReminder(true);
        } else {
          setDailySubmittedToday(true);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    checkDailyReport();
    // Check every 5 minutes
    const interval = setInterval(checkDailyReport, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkDailyReport]);

  const handleChange = (name, value) => setFormData(d => ({ ...d, [name]: value }));

  const openDailyReport = () => {
    const today = new Date().toISOString().split('T')[0];
    setActiveForm('daily');
    setFormData({ date: today });
    setShowDailyReminder(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/submissions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formType: formLabels[activeForm], data: formData }),
    });
    setLoading(false);
    setSuccess(true);
    if (activeForm === 'daily') setDailySubmittedToday(true);
    setTimeout(() => { setSuccess(false); setActiveForm(null); setFormData({}); }, 2000);
  };

  if (success) return (
    <div className="animate-fade" style={{ textAlign: 'center', padding: 80 }}>
      <div style={{ fontSize: '3rem', marginBottom: 16 }}>✅</div>
      <h2 style={{ fontWeight: 700 }}>Submitted Successfully!</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Your {formLabels[activeForm] || 'form'} has been submitted.</p>
    </div>
  );

  if (!activeForm) return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📋 Forms Hub</h2>

      {/* Daily Report Reminder Banner */}
      {showDailyReminder && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(99, 102, 241, 0.1))',
          border: '2px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 14, padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #06b6d4, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', flexShrink: 0,
            }}>📊</div>
            <div>
              <h3 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>Daily Report Due!</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                It&apos;s past 8 PM — please submit your Daily Activity Report before logging off.
              </p>
            </div>
          </div>
          <button onClick={openDailyReport} className="btn btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            📝 Submit Now
          </button>
        </div>
      )}

      {dailySubmittedToday && new Date().getHours() >= 20 && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 12, padding: '12px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.88rem', color: '#059669',
        }}>
          ✅ Daily Activity Report already submitted for today. Great job!
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {formTypes.map(ft => (
          <button key={ft.key} onClick={() => { setActiveForm(ft.key); setFormData(ft.key === 'daily' ? { date: new Date().toISOString().split('T')[0] } : {}); }}
            className="card card-glow" style={{ textAlign: 'left', border: '1px solid var(--surface-border)', cursor: 'pointer', transition: 'all 0.2s' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `${ft.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 12 }}>{ft.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{ft.label}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{ft.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const fields = formFields[activeForm] || [];

  return (
    <div className="animate-fade" style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => { setActiveForm(null); setFormData({}); }} className="btn btn-ghost">← Back</button>
        <h2 style={{ fontWeight: 700, fontSize: '1.3rem' }}>{formTypes.find(f => f.key === activeForm)?.icon} {formLabels[activeForm]}</h2>
      </div>

      <form onSubmit={handleSubmit} className="card">
        <div className="form-grid">
          {fields.map(f => (
            <div key={f.name} className="form-group" style={f.type === 'textarea' ? { gridColumn: '1 / -1' } : {}}>
              <label className="form-label">{f.label}{f.required ? ' *' : ''}</label>
              {f.type === 'textarea' ? (
                <textarea required={f.required} value={formData[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} rows={3} placeholder={`Enter ${f.label.toLowerCase()}`} />
              ) : f.type === 'select' ? (
                <select required={f.required} value={formData[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)}>
                  <option value="">Select {f.label.toLowerCase()}</option>
                  {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type} required={f.required} value={formData[f.name] || ''} onChange={e => handleChange(f.name, e.target.value)} placeholder={f.type === 'number' ? '0' : `Enter ${f.label.toLowerCase()}`} />
              )}
            </div>
          ))}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => { setActiveForm(null); setFormData({}); }}>Cancel</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>{loading ? 'Submitting...' : '📤 Submit'}</button>
        </div>
      </form>
    </div>
  );
}
