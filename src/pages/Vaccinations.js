import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const API = 'http://localhost:4000/api';

const QUICK_OPTIONS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '2 Months', days: 60 },
  { label: '3 Months', days: 90 },
];

function daysUntil(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due - today) / (1000 * 60 * 60 * 24));
}

function maxAlertDatetime(nextDue) {
  if (!nextDue || nextDue === '-') return '';
  return `${nextDue}T23:59`;
}

function minAlertDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 1);
  d.setSeconds(0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcAlertDatetime(value, unit) {
  const d = new Date();
  if (unit === 'minutes') d.setMinutes(d.getMinutes() + value);
  else if (unit === 'hours') d.setHours(d.getHours() + value);
  else if (unit === 'days') d.setDate(d.getDate() + value);
  d.setSeconds(0);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDatetime(dtStr) {
  if (!dtStr) return '';
  const d = new Date(dtStr);
  return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

// ── Searchable Goat Dropdown ──────────────────────────────
function SearchableGoatSelect({ goats, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const selected = goats.find(g => String(g.id) === String(value));
  const filtered = goats.filter(g => {
    const q = query.toLowerCase();
    return g.goat_code.toLowerCase().includes(q) || (g.breed && g.breed.toLowerCase().includes(q));
  });
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => { setOpen(o => !o); setQuery(''); }}
        style={{ padding: '10px 14px', border: open ? '1.5px solid #2E7D32' : '1.5px solid #e0e0e0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: 14, color: selected ? '#222' : '#aaa', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}>
        <span>{selected ? <><strong style={{ color: '#2E7D32' }}>{selected.goat_code}</strong> ({selected.breed})</> : '-- Select Goat --'}</span>
        <span style={{ color: '#aaa', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 999, overflow: 'hidden' }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <input autoFocus placeholder="🔍 Search by Goat ID or Breed..." value={query} onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', border: '1.5px solid #e0e0e0', borderRadius: 6, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              onClick={e => e.stopPropagation()} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div onClick={() => { onChange(''); setOpen(false); }}
              style={{ padding: '10px 14px', fontSize: 13, color: '#aaa', cursor: 'pointer', background: !value ? '#f5f5f5' : '#fff' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = !value ? '#f5f5f5' : '#fff'}>
              -- No Goat Selected --
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#999', textAlign: 'center' }}>No goats found</div>
            ) : filtered.map(g => (
              <div key={g.id} onClick={() => { onChange(g.id); setOpen(false); setQuery(''); }}
                style={{ padding: '10px 14px', fontSize: 13, cursor: 'pointer', background: String(value) === String(g.id) ? '#E8F5E9' : '#fff', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f5f5f5' }}
                onMouseEnter={e => { if (String(value) !== String(g.id)) e.currentTarget.style.background = '#f9f9f9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = String(value) === String(g.id) ? '#E8F5E9' : '#fff'; }}>
                <span style={{ fontWeight: 700, color: '#2E7D32', background: '#E8F5E9', padding: '2px 8px', borderRadius: 5, fontSize: 12 }}>{g.goat_code}</span>
                <span style={{ color: '#555' }}>{g.breed}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: g.gender === 'Male' ? '#1565C0' : '#880E4F', background: g.gender === 'Male' ? '#E3F2FD' : '#FCE4EC', padding: '1px 7px', borderRadius: 4 }}>
                  {g.gender === 'Male' ? '♂' : '♀'} {g.life_stage || 'Adult'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GoatAlertCard({ record, onDelete }) {
  return (
    <div style={{ background: '#F1F8E9', border: '1.5px solid #A5D6A7', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, color: '#1B5E20', background: '#C8E6C9', padding: '3px 10px', borderRadius: 6, fontSize: 13 }}>🐐 {record.goat}</span>
        <span style={{ fontSize: 13, color: '#333' }}>💉 <strong>{record.vaccine}</strong></span>
        <span style={{ fontSize: 12, color: '#555' }}>Due: <strong>{record.nextDue}</strong></span>
        <span style={{ fontSize: 12, color: '#1565C0', background: '#E3F2FD', padding: '2px 8px', borderRadius: 5 }}>
          📧 Alert: {formatDatetime(record.alert_datetime)}
        </span>
      </div>
      <button onClick={() => onDelete(record.id)} style={{ background: 'none', border: '1px solid #EF9A9A', color: '#C62828', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✕ Remove</button>
    </div>
  );
}

export default function Vaccinations() {
  const [records, setRecords] = useState([]);
  const [goats, setGoats] = useState([]);
  const [filter, setFilter] = useState('All');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const [alertModal, setAlertModal] = useState(false);
  const [alertList, setAlertList] = useState([]);
  const [alertGoatVaccId, setAlertGoatVaccId] = useState('');
  const [alertDatetime, setAlertDatetime] = useState('');
  const [savingAlert, setSavingAlert] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const uid = user.id || 1;

  useEffect(() => {
    Promise.all([
      fetch(`${API}/goats?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/vaccinations?user_id=${uid}`).then(r => r.json()),
    ]).then(([g, v]) => {
      setGoats(g);
      setRecords(v);
      setLoading(false);
    }).catch(() => {
      setToast({ msg: 'Failed to load data', type: 'error' });
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (!alertModal) return;
    setLoadingAlerts(true);
    fetch(`${API}/vaccination-alerts?user_id=${uid}`)
      .then(r => r.json())
      .then(data => {
        setAlertList(Array.isArray(data) ? data : []);
        setLoadingAlerts(false);
      })
      .catch(() => setLoadingAlerts(false));
  }, [alertModal, uid]);

  const pendingWithDue = records.filter(r => r.status !== 'Done' && r.nextDue && r.nextDue !== '-');
  const selectedVaccRecord = records.find(r => String(r.id) === String(alertGoatVaccId));

  const upcomingAlerts = records.filter(r => {
    if (r.status === 'Done') return false;
    const days = daysUntil(r.nextDue);
    return days !== null && days >= 0 && days <= 1;
  });

  const filtered = records.filter(r => {
    const matchFilter = filter === 'All' || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || (r.goat && r.goat.toLowerCase().includes(q)) || (r.vaccine && r.vaccine.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  const markDone = async (id) => {
    const res = await fetch(`${API}/vaccinations/${id}/done`, { method: 'PUT' });
    if (res.ok) {
      setRecords(rs => rs.map(r => r.id === id ? { ...r, status: 'Done' } : r));
      setToast({ msg: 'Marked as done!', type: 'success' });
    }
  };

  const save = async () => {
    if (!form.goat_id || !form.vaccine) {
      setToast({ msg: 'Goat and Vaccine are required', type: 'error' });
      return;
    }
    try {
      const res = await fetch(`${API}/vaccinations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goat_id: form.goat_id,
          vaccine: form.vaccine,
          given: form.given || null,
          nextDue: form.nextDue || null,
          description: form.description || null,
        }),
      });
      const newRecord = await res.json();
      setRecords(rs => [newRecord, ...rs]);
      setModal(false);
      setToast({ msg: 'Vaccination added!', type: 'success' });
    } catch {
      setToast({ msg: 'Server error', type: 'error' });
    }
  };

  const saveAlert = async () => {
    if (!alertGoatVaccId || !alertDatetime) {
      setToast({ msg: 'Please select a vaccination and alert time', type: 'error' });
      return;
    }
    if (selectedVaccRecord && selectedVaccRecord.nextDue !== '-') {
      const maxDt = new Date(`${selectedVaccRecord.nextDue}T23:59`);
      const alertDt = new Date(alertDatetime);
      if (alertDt > maxDt) {
        setToast({ msg: `Alert time cannot be after the due date (${selectedVaccRecord.nextDue})`, type: 'error' });
        return;
      }
    }
    setSavingAlert(true);
    try {
      const res = await fetch(`${API}/vaccination-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, vaccination_id: alertGoatVaccId, alert_datetime: alertDatetime }),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ msg: data.error || 'Failed to save alert', type: 'error' });
      } else {
        const updated = await fetch(`${API}/vaccination-alerts?user_id=${uid}`).then(r => r.json());
        setAlertList(Array.isArray(updated) ? updated : []);
        setAlertGoatVaccId('');
        setAlertDatetime('');
        setToast({ msg: 'Alert set successfully!', type: 'success' });
      }
    } catch {
      setToast({ msg: 'Server error', type: 'error' });
    } finally {
      setSavingAlert(false);
    }
  };

  const deleteAlert = async (alertId) => {
    try {
      await fetch(`${API}/vaccination-alerts/${alertId}`, { method: 'DELETE' });
      setAlertList(al => al.filter(a => a.id !== alertId));
      setToast({ msg: 'Alert removed', type: 'success' });
    } catch {
      setToast({ msg: 'Failed to remove alert', type: 'error' });
    }
  };

  const calcNextDue = (days) => {
    const base = form.given ? new Date(form.given) : new Date();
    base.setDate(base.getDate() + days);
    return base.toISOString().split('T')[0];
  };

  const statusBadge = (s) => {
    const map = { Done: 'badge-green', Pending: 'badge-yellow', Overdue: 'badge-red' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{s}</span>;
  };

  const counts = {
    all: records.length,
    done: records.filter(r => r.status === 'Done').length,
    pending: records.filter(r => r.status === 'Pending').length,
    overdue: records.filter(r => r.status === 'Overdue').length,
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading vaccinations...</div>;

  return (
    <div>

      {/* ── NOTIFICATION BANNER ── */}
      {upcomingAlerts.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #FFF3E0, #FFE0B2)', border: '1.5px solid #FF9800', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8, boxShadow: '0 2px 8px rgba(255,152,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <strong style={{ color: '#E65100', fontSize: 15 }}>Upcoming Vaccination Alert ({upcomingAlerts.length})</strong>
          </div>
          {upcomingAlerts.map(r => {
            const days = daysUntil(r.nextDue);
            const label = days === 0 ? '⚠️ Today!' : '📅 Tomorrow!';
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 14px', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 700, color: '#1B5E20', background: '#E8F5E9', padding: '2px 10px', borderRadius: 6, fontSize: 13 }}>🐐 {r.goat}</span>
                  <span style={{ color: '#555', fontSize: 13 }}>💉 <strong>{r.vaccine}</strong></span>
                  <span style={{ color: '#E65100', fontWeight: 600, fontSize: 13 }}>{label}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>Due: {r.nextDue}</span>
                </div>
                <button className="btn btn-sm btn-primary" onClick={() => markDone(r.id)} style={{ padding: '5px 14px', fontSize: 12 }}>✓ Mark Done</button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SUMMARY BAR ── */}
      <div className="summary-bar">
        <div className="summary-item"><div className="label">Total Scheduled</div><div className="value">{counts.all}</div></div>
        <div className="summary-item"><div className="label">Completed</div><div className="value" style={{ color: '#2E7D32' }}>{counts.done}</div></div>
        <div className="summary-item"><div className="label">Pending</div><div className="value" style={{ color: '#F57F17' }}>{counts.pending}</div></div>
        <div className="summary-item"><div className="label">Overdue</div><div className="value" style={{ color: '#C62828' }}>{counts.overdue}</div></div>
      </div>

      {/* ── FILTER + ACTIONS BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {['All', 'Done', 'Pending', 'Overdue'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setFilter(f)}>{f}</button>
          ))}
          <input
            style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, outline: 'none', width: 220, fontFamily: 'inherit', background: '#fafafa' }}
            placeholder="🔍 Search Goat ID or Vaccine"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline" onClick={() => setAlertModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#1565C0', color: '#1565C0' }}>
            <span>📧</span>
            <span>Set Email Alerts</span>
            {alertList.length > 0 && (
              <span style={{ fontSize: 11, background: '#1565C0', color: '#fff', padding: '1px 7px', borderRadius: 10, fontWeight: 700 }}>{alertList.length}</span>
            )}
          </button>
          <button className="btn btn-primary" onClick={() => { setForm({}); setModal(true); }}>+ Add Vaccination</button>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Goat ID</th><th>Vaccine</th>
                <th>Description</th>
                <th>Date Given</th><th>Next Due</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">💉</div><p>No records found</p></div></td></tr>
              ) : filtered.map((r, i) => {
                const days = daysUntil(r.nextDue);
                const isUrgent = r.status !== 'Done' && days !== null && days >= 0 && days <= 1;
                return (
                  <tr key={r.id} style={{ background: isUrgent ? '#FFF8E1' : 'transparent' }}>
                    <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <span
                        onClick={() => r.goat && navigate(`/goats/${r.goat}`)}
                        style={{
                          fontWeight: 700, color: '#2E7D32', background: '#E8F5E9',
                          padding: '2px 10px', borderRadius: 6, fontSize: 13,
                          cursor: r.goat ? 'pointer' : 'default',
                          textDecoration: 'none',  // ✅ underline removed
                          display: 'inline-block',
                        }}
                      >
                        {r.goat || '—'}
                      </span>
                    </td>
                    <td>{r.vaccine}</td>
                    <td style={{ fontSize: 12, color: '#666', maxWidth: 180 }}>
                      {r.description
                        ? <span title={r.description} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 13, color: '#555' }}>{r.given}</td>
                    <td style={{ fontSize: 13 }}>
                      <span style={{ color: r.status === 'Overdue' ? '#C62828' : isUrgent ? '#E65100' : '#555', fontWeight: isUrgent ? 700 : 400 }}>
                        {r.nextDue}
                        {isUrgent && (
                          <span style={{ marginLeft: 6, fontSize: 11, background: '#FF9800', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>
                            {days === 0 ? 'Today!' : 'Tomorrow!'}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>{statusBadge(r.status)}</td>
                    <td>
                      {r.status !== 'Done' && (
                        <button className="btn btn-sm btn-primary" onClick={() => markDone(r.id)}>✓ Done</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD VACCINATION MODAL ── */}
      {modal && (
        <Modal title="Add Vaccination" onClose={() => setModal(false)} onSave={save}>
          <div className="form-group">
            <label className="form-label">Select Goat *</label>
            <SearchableGoatSelect goats={goats} value={form.goat_id || ''} onChange={val => set('goat_id', val)} />
          </div>
          <div className="form-group">
            <label className="form-label">Vaccine Name *</label>
            <input className="form-input" placeholder="e.g. PPR Vaccine" value={form.vaccine || ''} onChange={e => set('vaccine', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Description / Reason
              <span style={{ color: '#888', fontWeight: 400, fontSize: 12, marginLeft: 6 }}>(optional)</span>
            </label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="e.g. PPR disease prevention, annual vaccination, vet recommendation..."
              value={form.description || ''}
              onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Date Given</label>
            <input className="form-input" type="date" value={form.given || ''} onChange={e => set('given', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Next Due Date</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {QUICK_OPTIONS.map(opt => {
                const calculated = calcNextDue(opt.days);
                return (
                  <button key={opt.label} type="button"
                    className={`btn btn-sm ${form.nextDue === calculated ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => set('nextDue', calculated)}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <input className="form-input" type="date" value={form.nextDue || ''} onChange={e => set('nextDue', e.target.value)} />
          </div>
        </Modal>
      )}

      {/* ── GOAT-WISE EMAIL ALERT MODAL ── */}
      {alertModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setAlertModal(false)}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">📧 Set Vaccination Email Alerts</span>
              <button className="modal-close" onClick={() => setAlertModal(false)}>×</button>
            </div>

            <div style={{ background: '#E3F2FD', border: '1px solid #90CAF9', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#1565C0', lineHeight: 1.6 }}>
              <strong>How it works:</strong><br />
              Select any pending vaccination and choose <strong>exactly when</strong> you want the email alert. You can set <strong>separate alerts for each goat</strong>.
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: 14, fontWeight: 600, color: '#1B5E20' }}>
                Step 1: Select Goat + Vaccination
              </label>
              <select className="form-input" value={alertGoatVaccId}
                onChange={e => { setAlertGoatVaccId(e.target.value); setAlertDatetime(''); }}>
                <option value="">-- Select vaccination --</option>
                {pendingWithDue.map(r => (
                  <option key={r.id} value={r.id}>
                    🐐 {r.goat} — 💉 {r.vaccine} — Due: {r.nextDue}
                  </option>
                ))}
              </select>
              {pendingWithDue.length === 0 && (
                <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>No pending vaccinations with due dates found.</div>
              )}
            </div>

            {alertGoatVaccId && selectedVaccRecord && (
              <div className="form-group">
                <label className="form-label" style={{ fontSize: 14, fontWeight: 600, color: '#1B5E20' }}>
                  Step 2: Choose Alert Date & Time
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {[
                    { label: '5 min', value: 5, unit: 'minutes' },
                    { label: '30 min', value: 30, unit: 'minutes' },
                    { label: '1 hour', value: 1, unit: 'hours' },
                    { label: '3 hours', value: 3, unit: 'hours' },
                    { label: '1 day', value: 1, unit: 'days' },
                    { label: '3 days', value: 3, unit: 'days' },
                    { label: '7 days', value: 7, unit: 'days' },
                  ].map(opt => {
                    const dt = calcAlertDatetime(opt.value, opt.unit);
                    const maxDt = new Date(`${selectedVaccRecord.nextDue}T23:59`);
                    const optDt = new Date(dt);
                    const disabled = optDt > maxDt;
                    return (
                      <button key={opt.label} type="button" disabled={disabled}
                        className={`btn btn-sm ${alertDatetime === dt ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => !disabled && setAlertDatetime(dt)}
                        style={{ opacity: disabled ? 0.4 : 1 }}>
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <input className="form-input" type="datetime-local" value={alertDatetime}
                  min={minAlertDatetime()} max={maxAlertDatetime(selectedVaccRecord.nextDue)}
                  onChange={e => setAlertDatetime(e.target.value)} />
                {alertDatetime && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#2E7D32', background: '#E8F5E9', borderRadius: 6, padding: '8px 12px' }}>
                    📬 Email will be sent on: <strong>{formatDatetime(alertDatetime)}</strong><br />
                    <span style={{ fontSize: 12, color: '#555' }}>Goat: <strong>{selectedVaccRecord.goat}</strong> · Vaccine: <strong>{selectedVaccRecord.vaccine}</strong> · Due: <strong>{selectedVaccRecord.nextDue}</strong></span>
                  </div>
                )}
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={saveAlert} disabled={savingAlert || !alertDatetime}>
                    {savingAlert ? 'Saving...' : '➕ Add This Alert'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}>
                📋 Active Alerts {alertList.length > 0 && <span style={{ fontSize: 12, color: '#888', fontWeight: 400 }}>({alertList.length} set)</span>}
              </div>
              {loadingAlerts ? (
                <div style={{ color: '#aaa', fontSize: 13 }}>Loading alerts...</div>
              ) : alertList.length === 0 ? (
                <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No alerts set yet. Add one above!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {alertList.map(a => (
                    <GoatAlertCard key={a.id} record={a} onDelete={deleteAlert} />
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setAlertModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}