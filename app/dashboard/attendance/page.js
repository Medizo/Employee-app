'use client';
import { useState, useEffect } from 'react';

/* ──────────────────────────────────────────────────────
   STATUS COLORS & ICONS
   ────────────────────────────────────────────────────── */
const statusConfig = {
  Present:        { color: '#10b981', icon: '🟢' },
  Absent:         { color: '#ef4444', icon: '🔴' },
  'On Leave':     { color: '#f59e0b', icon: '🟡' },
  'Half Day':     { color: '#f97316', icon: '🟠' },
  Weekend:        { color: '#94a3b8', icon: '⚪' },
  'Leave Pending':{ color: '#ef4444', icon: '🔶' }, // red border until approved
  'Comp Off Earned': { color: '#8b5cf6', icon: '⭐' },
  Holiday:        { color: '#0ea5e9', icon: '🎉' },
  Birthday:       { color: '#ec4899', icon: '🎂' },
};

/* ──────────────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────────────── */
export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [compOffBalance, setCompOffBalance] = useState(0);
  const [compOffsEarned, setCompOffsEarned] = useState(0);
  const [weekendWorkDates, setWeekendWorkDates] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState(null);
  const [leaveForm, setLeaveForm] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [birthdayLeave, setBirthdayLeave] = useState(null);

  /* ── Fetch data ── */
  const fetchData = () => {
    fetch('/api/attendance').then(r => r.json()).then(d => setAttendance(d.attendance || []));
    fetch('/api/leaves').then(r => r.json()).then(d => {
      setLeaves(d.leaves || []);
      setCompOffBalance(d.compOffBalance || 0);
      setCompOffsEarned(d.compOffsEarned || 0);
      setWeekendWorkDates(d.weekendWorkDates || []);
    });
    fetch('/api/holidays').then(r => r.json()).then(d => {
      setHolidays(d.holidays || []);
      setBirthdayLeave(d.birthdayLeave || null);
    }).catch(() => {});
  };

  useEffect(() => { fetchData(); }, []);

  /* ── Calendar math ── */
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  /* ──────────────────────────────────────────────────────
     GET STATUS FOR A DAY — The core logic
     ──────────────────────────────────────────────────────
     Priority order:
     1. Check leaves collection (Pending = red border, Approved = On Leave)
     2. Check attendance records (Present / Half Day / Absent)
     3. If Saturday or Sunday → Weekend (but check if they worked 8+hrs for comp-off)
     4. Otherwise → null (plain day, no status)
     ────────────────────────────────────────────────────── */
  const getStatus = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = new Date(year, month, day).getDay();
    const isWeekend = dow === 0 || dow === 6;

    // 1. Check leaves first
    const leave = leaves.find(l => l.date === dateStr);
    if (leave) {
      if (leave.status === 'Pending') {
        return { status: 'Leave Pending', leaveType: leave.leaveType, reason: leave.reason };
      }
      if (leave.status === 'Approved') {
        return { status: 'On Leave', leaveType: leave.leaveType, reason: leave.reason };
      }
      // Rejected leaves are ignored — day shows normal
    }

    // 1b. Check holidays
    const holiday = holidays.find(h => h.date === dateStr);
    if (holiday) {
      return { status: 'Holiday', holidayName: holiday.name, holidayType: holiday.type };
    }

    // 2. Check attendance records
    const record = attendance.find(a => a.date === dateStr);
    if (record && record.status && record.status !== 'Weekend') {
      // If they worked on a weekend with 8+ hrs, mark comp-off earned
      if (isWeekend && record.totalHours >= 8) {
        return { ...record, compOffEarned: true };
      }
      return record;
    }

    // 2b. Check birthday — is this the user's birthday?
    if (birthdayLeave && (month + 1) === birthdayLeave.month && day === birthdayLeave.day) {
      return { status: 'Birthday', birthdayName: birthdayLeave.name };
    }

    // 3. Weekend detection — ONLY Saturday (6) and Sunday (0)
    if (isWeekend) {
      return { status: 'Weekend' };
    }

    // 4. No data — plain working day
    return null;
  };

  /* ── Summary counts ── */
  const summary = { Present: 0, Absent: 0, 'On Leave': 0, 'Half Day': 0, Weekend: 0, 'Leave Pending': 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const s = getStatus(d);
    if (s?.status && summary[s.status] !== undefined) summary[s.status]++;
  }

  const filteredAttendance = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === month && d.getFullYear() === year && a.totalHours > 0;
  });

  const aggregatedHours = filteredAttendance.reduce((acc, curr) => {
    if (!acc[curr.date]) {
      acc[curr.date] = { ...curr };
    } else {
      acc[curr.date].totalHours += curr.totalHours;
    }
    return acc;
  }, {});

  const hoursData = Object.values(aggregatedHours).sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalHours = hoursData.reduce((s, a) => s + a.totalHours, 0);

  /* ── Month navigation ── */
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  /* ── Click a date → open leave form (only for non-weekend, non-present days) ── */
  const handleDateClick = (day) => {
    const record = getStatus(day);
    // Don't allow leave application on weekends, holidays, or already-present days
    if (record?.status === 'Weekend' || record?.status === 'Present' || record?.status === 'Leave Pending' || record?.status === 'On Leave' || record?.status === 'Holiday') return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setLeaveForm(dateStr);
  };

  // Check if current leave form date falls in birthday month
  const isBirthdayMonth = birthdayLeave && (month + 1) === birthdayLeave.month;
  const birthdayUsed = birthdayLeave ? leaves.some(l => l.leaveType === 'Birthday Leave' && l.status !== 'Rejected' && new Date(l.date).getFullYear() === year) : true;

  /* ── Submit leave ── */
  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveLoading(true);
    const formEle = e.target;
    const reason = formEle.reason.value;
    const leaveType = formEle.leaveType.value;

    const res = await fetch('/api/leaves', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: leaveForm, leaveType, reason }),
    });

    const data = await res.json();
    setLeaveLoading(false);

    if (!res.ok) {
      alert(data.error || 'Failed to submit leave');
      return;
    }

    setLeaveForm(null);
    fetchData(); // refresh
  };

  /* ── Get cell styles for a day ── */
  const getCellStyle = (record) => {
    if (!record) {
      // Plain working day — no colored border
      return {
        background: 'var(--bg-secondary)',
        border: '2px solid var(--surface-border)',
      };
    }

    const cfg = statusConfig[record.status];
    if (!cfg) return { background: 'var(--bg-secondary)', border: '2px solid var(--surface-border)' };

    if (record.status === 'Leave Pending') {
      // RED dashed border for unapproved leave
      return {
        background: 'rgba(239, 68, 68, 0.06)',
        border: '2px dashed #ef4444',
      };
    }

    if (record.compOffEarned) {
      // Purple highlight for weekend work
      return {
        background: 'rgba(139, 92, 246, 0.1)',
        border: '2px solid rgba(139, 92, 246, 0.4)',
      };
    }

    if (record.status === 'Holiday') {
      return {
        background: 'rgba(14, 165, 233, 0.08)',
        border: '2px solid rgba(14, 165, 233, 0.4)',
      };
    }

    if (record.status === 'Birthday') {
      return {
        background: 'rgba(236, 72, 153, 0.08)',
        border: '2px solid rgba(236, 72, 153, 0.4)',
      };
    }

    return {
      background: `${cfg.color}12`,
      border: `2px solid ${cfg.color}40`,
    };
  };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📅 Attendance & Leaves</h2>

      <div className="attendance-layout">
        {/* ════════ LEFT: Calendar ════════ */}
        <div className="attendance-calendar-section">
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="btn btn-ghost" onClick={prevMonth}>← Prev</button>
              <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{monthName} {year}</h3>
              <button className="btn btn-ghost" onClick={nextMonth}>Next →</button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Present', 'Absent', 'On Leave', 'Leave Pending', 'Holiday', 'Birthday', 'Weekend'].map(label => (
                <span key={label} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: statusConfig[label]?.color,
                    border: label === 'Leave Pending' ? '2px dashed #ef4444' : 'none',
                    display: 'inline-block',
                  }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', padding: 8 }}>{d}</div>
              ))}
              {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const record = getStatus(day);
                const cellStyle = getCellStyle(record);
                const isClickable = !record?.status || !['Weekend', 'Present', 'Leave Pending', 'On Leave', 'Half Day', 'Holiday'].includes(record.status);

                return (
                  <div key={day}
                    onClick={() => handleDateClick(day)}
                    onMouseEnter={() => setTooltip({ day, ...(record || { status: null }) })}
                    onMouseLeave={() => setTooltip(null)}
                    style={{
                      textAlign: 'center', padding: '10px 4px', borderRadius: 8,
                      cursor: isClickable ? 'pointer' : 'default',
                      ...cellStyle,
                      position: 'relative',
                      transition: 'all 0.15s', fontSize: '0.85rem', fontWeight: 600,
                    }}>
                    {day}
                    {/* Comp-off badge */}
                    {record?.compOffEarned && (
                      <span style={{ position: 'absolute', top: 1, right: 2, fontSize: '0.55rem' }}>⭐</span>
                    )}
                    {/* Tooltip */}
                    {tooltip?.day === day && (
                      <div style={{
                        position: 'absolute', bottom: '110%', left: '50%', transform: 'translateX(-50%)',
                        background: 'var(--surface)', border: '1px solid var(--surface-border)',
                        borderRadius: 10, padding: '12px 14px', whiteSpace: 'nowrap', zIndex: 100,
                        boxShadow: 'var(--shadow-md)', fontSize: '0.8rem', textAlign: 'left', minWidth: 190,
                      }}>
                        {tooltip.status ? (
                          <>
                            <p style={{ fontWeight: 700, color: statusConfig[tooltip.status]?.color || 'var(--text)', marginBottom: 4 }}>
                              {statusConfig[tooltip.status]?.icon} {tooltip.status}
                            </p>
                            {tooltip.holidayName && (
                              <p style={{ fontWeight: 600, marginBottom: 4 }}>{tooltip.holidayName}</p>
                            )}
                            {tooltip.holidayType && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{tooltip.holidayType}</p>
                            )}
                            {tooltip.status === 'Birthday' && (
                              <p style={{ color: '#ec4899', fontSize: '0.75rem', fontWeight: 600 }}>🎂 Happy Birthday! Click to apply birthday leave</p>
                            )}
                            {tooltip.totalHours > 0 && (
                              <p style={{ marginBottom: 4 }}>Present for <strong>{tooltip.totalHours}h</strong></p>
                            )}
                            {tooltip.loginTime && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🕐 {tooltip.loginTime} – {tooltip.logoutTime}</p>
                            )}
                            {tooltip.status === 'Leave Pending' && (
                              <p style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>⏳ Waiting for admin approval</p>
                            )}
                            {tooltip.leaveType && (
                              <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Type: {tooltip.leaveType}</p>
                            )}
                            {tooltip.compOffEarned && (
                              <p style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 600 }}>⭐ Comp-off earned!</p>
                            )}
                          </>
                        ) : (
                          <>
                            <p style={{ fontWeight: 600, marginBottom: 4 }}>Working Day</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Click to apply for leave</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ════════ RIGHT: Summary & Details ════════ */}
        <div className="attendance-details-section">
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
            {['Present', 'Absent', 'On Leave', 'Leave Pending', 'Weekend'].map(label => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
                <span style={{ fontSize: '1.1rem' }}>{statusConfig[label]?.icon}</span>
                <p style={{ fontSize: '1.2rem', fontWeight: 800, color: statusConfig[label]?.color, marginTop: 2 }}>{summary[label] || 0}</p>
                <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
            <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
              <span style={{ fontSize: '1.1rem' }}>⏱️</span>
              <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: 2 }}>{totalHours.toFixed(1)}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Total Hours</p>
            </div>
          </div>

          {/* Comp-Off Balance Card */}
          <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #8b5cf6' }}>
            <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>⭐ Comp-Off Balance</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Earned (8h+ weekend work)</span>
              <strong style={{ color: '#8b5cf6' }}>{compOffsEarned}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>Used / Pending</span>
              <strong>{compOffsEarned - compOffBalance}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 4, paddingTop: 8, borderTop: '1px solid var(--surface-border)' }}>
              <span style={{ fontWeight: 600 }}>Available</span>
              <strong style={{ color: compOffBalance > 0 ? '#10b981' : '#ef4444' }}>{compOffBalance}</strong>
            </div>
          </div>

          {/* Birthday Leave Card */}
          {birthdayLeave && (
            <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #ec4899' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8 }}>🎂 Birthday Leave</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Your Birthday</span>
                <strong style={{ color: '#ec4899' }}>
                  {new Date(2000, birthdayLeave.month - 1, birthdayLeave.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <strong style={{ color: birthdayUsed ? '#f59e0b' : '#10b981' }}>
                  {birthdayUsed ? 'Used / Applied' : '1 day available'}
                </strong>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.4 }}>
                You can apply birthday leave on any day in your birthday month ({new Date(2000, birthdayLeave.month - 1).toLocaleDateString('en-US', { month: 'long' })}).
              </p>
            </div>
          )}

          {/* Upcoming Holidays */}
          {holidays.length > 0 && (
            <div className="card" style={{ padding: 16, marginBottom: 16, borderLeft: '4px solid #0ea5e9' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>🎉 Upcoming Holidays</h4>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {holidays
                  .filter(h => h.date >= new Date().toISOString().split('T')[0])
                  .slice(0, 8)
                  .map(h => (
                    <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', padding: '6px 0', borderBottom: '1px solid var(--surface-border)' }}>
                      <div>
                        <p style={{ fontWeight: 600 }}>{h.name}</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{h.type}</p>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: '#0ea5e9', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </span>
                    </div>
                  ))
                }
                {holidays.filter(h => h.date >= new Date().toISOString().split('T')[0]).length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No upcoming holidays</p>
                )}
              </div>
            </div>
          )}

          {/* Recent Leaves */}
          {leaves.length > 0 && (
            <div className="card" style={{ overflow: 'hidden' }}>
              <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12 }}>📋 My Leave Requests</h4>
              <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                {leaves.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)).map(l => (
                  <div key={l.id} style={{
                    padding: '10px 0', borderBottom: '1px solid var(--surface-border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem',
                  }}>
                    <div>
                      <p style={{ fontWeight: 600 }}>{new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{l.leaveType}</p>
                    </div>
                    <span className={`badge ${l.status === 'Approved' ? 'badge-success' : l.status === 'Rejected' ? 'badge-danger' : 'badge-warning'}`}
                      style={{
                        fontSize: '0.7rem',
                        ...(l.status === 'Pending' ? { border: '1.5px dashed #ef4444', background: 'rgba(239,68,68,0.08)', color: '#ef4444' } : {}),
                      }}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hours Table */}
          {hoursData.length > 0 && (
            <div className="card" style={{ overflow: 'hidden', marginTop: 16 }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9rem' }}>⏱️ Hours This Month</h4>
              <div className="table-container" style={{ margin: '-24px', marginTop: 0, border: 'none', borderRadius: 0, borderTop: 'var(--border-width) solid var(--surface-border)', maxHeight: 180, overflowY: 'auto' }}>
                <table style={{ fontSize: '0.78rem', width: '100%' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}><tr><th>Date</th><th>Hours</th><th>Mode</th></tr></thead>
                  <tbody>
                    {hoursData.map((a, idx) => (
                      <tr key={a.date || idx}>
                        <td>{new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</td>
                        <td><strong>{a.totalHours.toFixed(1)}h</strong></td>
                        <td><span className="badge badge-submitted">{a.workMode}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ════════ LEAVE APPLICATION MODAL ════════ */}
      {leaveForm && (
        <div className="modal-overlay" onClick={() => setLeaveForm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title">Apply for Leave</h3>
              <button className="modal-close" onClick={() => setLeaveForm(null)}>×</button>
            </div>
            <form onSubmit={handleLeaveSubmit}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input type="date" value={leaveForm} readOnly style={{ background: 'var(--bg)' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select name="leaveType" required>
                  <option value="">Select leave type</option>
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Earned Leave">Earned Leave</option>
                  <option value="LOP">Loss of Pay (LOP)</option>
                  {compOffBalance > 0 && (
                    <option value="Comp Off">🌟 Comp Off ({compOffBalance} available)</option>
                  )}
                  {isBirthdayMonth && !birthdayUsed && (
                    <option value="Birthday Leave">🎂 Birthday Leave (1 available)</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea name="reason" rows={3} required placeholder="Please provide a reason for your leave..."></textarea>
              </div>

              {/* Info box */}
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.06)', borderRadius: 10, marginBottom: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                ℹ️ Your leave will show as <strong style={{ color: '#ef4444' }}>pending (red border)</strong> until the admin approves it.
                Once approved, it will appear as <strong style={{ color: '#f59e0b' }}>On Leave (yellow)</strong>.
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setLeaveForm(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={leaveLoading}>
                  {leaveLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .attendance-layout { display: flex; flex-direction: column; gap: 24px; }
        .attendance-calendar-section { flex: 1; }
        .attendance-details-section { flex: 1; }
        @media (min-width: 1024px) {
          .attendance-layout { flex-direction: row; align-items: flex-start; }
          .attendance-calendar-section { flex: 7; }
          .attendance-details-section { flex: 4; min-width: 320px; }
        }
      `}</style>
    </div>
  );
}
