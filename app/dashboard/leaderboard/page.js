'use client';
import { useState, useEffect } from 'react';
import { useUser } from '../layout';

export default function LeaderboardPage() {
  const ctx = useUser();
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    fetch('/api/leaderboard').then(r => r.json()).then(d => setData(d.leaderboard || []));
  }, []);

  const sorted = [...data].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];
  const myRank = sorted.findIndex(e => e.userId === ctx?.user?.id) + 1;

  return (
    <div className="animate-fade">
      <h2 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: 20 }}>🏆 Team Leaderboard</h2>

      {/* My Position Card */}
      {myRank > 0 && (
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))', border: '1px solid rgba(6,182,212,0.2)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff', fontWeight: 800 }}>#{myRank}</div>
            <div>
              <h3 style={{ fontWeight: 700 }}>Your Position</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Score: {sorted[myRank-1]?.score || 0}</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Deals', value: sorted[myRank-1]?.dealsCount },
                { label: 'Calls', value: sorted[myRank-1]?.callsMade },
                { label: 'Follow-ups', value: sorted[myRank-1]?.followUps },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-light)' }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period Toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--bg-secondary)', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        {['week', 'month', 'quarter', 'all'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.15s',
              background: period === p ? 'var(--primary)' : 'transparent', color: period === p ? '#fff' : 'var(--text-secondary)' }}>
            {p === 'all' ? 'All Time' : `This ${p.charAt(0).toUpperCase() + p.slice(1)}`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead><tr><th>Rank</th><th>Employee</th><th>Deals</th><th>Calls</th><th>Follow-ups</th><th>Score</th><th>Trend</th></tr></thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={e.userId} style={e.userId === ctx?.user?.id ? { background: 'rgba(6,182,212,0.06)' } : {}}>
                <td style={{ fontSize: '1.2rem' }}>{medals[i] || `#${i+1}`}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `hsl(${i*60}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 700 }}>{e.name.charAt(0)}</div>
                    <span style={{ fontWeight: e.userId === ctx?.user?.id ? 700 : 500 }}>{e.name}{e.userId === ctx?.user?.id ? ' (You)' : ''}</span>
                  </div>
                </td>
                <td>{e.dealsCount}</td>
                <td>{e.callsMade}</td>
                <td>{e.followUps}</td>
                <td><strong style={{ color: 'var(--primary-light)' }}>{e.score}</strong></td>
                <td style={{ fontSize: '1.2rem' }}>{e.trend === 'up' ? '📈' : e.trend === 'down' ? '📉' : '➡️'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
