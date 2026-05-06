'use client';
import { useState, useEffect } from 'react';

const statusColors = { Present: '#10b981', Absent: '#ef4444', 'On Leave': '#f59e0b', 'Half Day': '#f97316', Weekend: '#6b7280' };
const statusEmoji = { Present: '🟢', Absent: '🔴', 'On Leave': '🟡', 'Half Day': '🟠', Weekend: '⚪' };

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    fetch('/api/attendance').then(r => r.json()).then(d => setAttendance(d.attendance || []));
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });

  const getStatus = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const record = attendance.find(a => a.date === dateStr);
    if (record) return record;
    const dow = new Date(year, month, day).getDay();
    if (dow === 0 || dow === 6) return { status: 'Weekend' };
    return null;
  };

  const summary = { Present: 0, Absent: 0, 'On Leave': 0, 'Half Day': 0, Weekend: 0 };
  for (let d = 1; d <= daysInMonth; d++) {
    const s = getStatus(d);
    if (s?.status && summary[s.status] !== undefined) summary[s.status]++;
  }

  const hoursData = attendance.filter(a => {
    const d = new Date(a.date);
    return d.getMonth() === month && d.getFullYear() === year && a.totalHours > 0;
  });
  const totalHours = hoursData.reduce((s, a) => s + a.totalHours, 0);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); };

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>📅 Attendance Calendar</h2>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {Object.entries(summary).map(([label, count]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
            <span style={{ fontSize: '1.5rem' }}>{statusEmoji[label]}</span>
            <p style={{ fontSize: '1.5rem', fontWeight: 800, color: statusColors[label], marginTop: 4 }}>{count}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
        <div className="card" style={{ textAlign: 'center', padding: 16 }}>
          <span style={{ fontSize: '1.5rem' }}>⏱️</span>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-light)', marginTop: 4 }}>{totalHours.toFixed(1)}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Hours</p>
        </div>
      </div>

      {/* Calendar */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <button className="btn btn-ghost" onClick={prevMonth}>← Prev</button>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{monthName} {year}</h3>
          <button className="btn btn-ghost" onClick={nextMonth}>Next →</button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {Object.entries(statusEmoji).map(([label, emoji]) => (
            <span key={label} style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>{emoji} {label}</span>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', padding: 8 }}>{d}</div>
          ))}
          {Array(firstDay).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const record = getStatus(day);
            const color = record?.status ? statusColors[record.status] : 'transparent';
            return (
              <div key={day}
                onMouseEnter={() => record?.loginTime && setTooltip({ day, ...record })}
                onMouseLeave={() => setTooltip(null)}
                style={{
                  textAlign: 'center', padding: '10px 4px', borderRadius: 8, cursor: 'pointer',
                  background: `${color}18`, border: `2px solid ${color}40`, position: 'relative',
                  transition: 'all 0.15s', fontSize: '0.85rem', fontWeight: 600,
                }}>
                {day}
                {tooltip?.day === day && (
                  <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--surface-border)', borderRadius: 8, padding: '8px 12px', whiteSpace: 'nowrap', zIndex: 10, boxShadow: 'var(--shadow-md)', fontSize: '0.75rem' }}>
                    <p>{tooltip.status}</p>
                    {tooltip.loginTime && <p>🕐 {tooltip.loginTime} - {tooltip.logoutTime}</p>}
                    {tooltip.totalHours > 0 && <p>⏱️ {tooltip.totalHours}h</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hours Table */}
      {hoursData.length > 0 && (
        <div className="card">
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>⏱️ Login Hours This Month</h3>
          <div className="table-container">
            <table>
              <thead><tr><th>Date</th><th>Login</th><th>Logout</th><th>Hours</th><th>Mode</th><th>OT</th></tr></thead>
              <tbody>
                {hoursData.map(a => (
                  <tr key={a.id}>
                    <td>{new Date(a.date).toLocaleDateString()}</td>
                    <td>{a.loginTime}</td>
                    <td>{a.logoutTime}</td>
                    <td><strong>{a.totalHours}h</strong></td>
                    <td><span className="badge badge-submitted">{a.workMode}</span></td>
                    <td>{a.totalHours > 9 ? <span className="badge badge-high">OT</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3}>Total</td>
                  <td>{totalHours.toFixed(1)}h</td>
                  <td>Avg: {(totalHours/hoursData.length).toFixed(1)}h</td>
                  <td>{hoursData.filter(a => a.totalHours > 9).length} days</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
