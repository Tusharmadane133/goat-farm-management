import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const API = 'http://localhost:4000/api';

export default function HittingCycle() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [heatCycles, setHeatCycles] = useState([]);
  const [goats, setGoats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heatModal, setHeatModal] = useState(false);
  const [editHeatId, setEditHeatId] = useState(null);
  const [heatForm, setHeatForm] = useState({ goat_id: '', cycle_date: '', notes: '' });
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [pregnantGoatIds, setPregnantGoatIds] = useState([]); // ✅ NEW

  // Load goats (for dropdown)
  useEffect(() => {
    if (!user.id) return;
    fetch(`${API}/goats?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => setGoats(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ✅ NEW: Load breeding records to find pregnant goats
  useEffect(() => {
    if (!user.id) return;
    fetch(`${API}/breeding?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const pendingIds = data
            .filter(b => b.status === 'Pending')
            .map(b => String(b.female_goat_id));
          setPregnantGoatIds(pendingIds);
        }
      })
      .catch(() => {});
  }, []);

  // Load hitting cycles
  useEffect(() => {
    if (!user.id) return;
    fetch(`${API}/hitting-cycle?user_id=${user.id}`)
      .then(r => r.json())
      .then(data => { setHeatCycles(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const calcNextHeat = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 21);
    return d.toISOString().slice(0, 10);
  };

  const daysToNextHeat = (next_expected_fmt) => {
    if (!next_expected_fmt) return null;
    return Math.round((new Date(next_expected_fmt) - new Date()) / 86400000);
  };

  const closeHeatModal = () => {
    setHeatModal(false);
    setEditHeatId(null);
    setHeatForm({ goat_id: '', cycle_date: '', notes: '' });
  };

  const openAdd = () => {
    closeHeatModal();
    setHeatModal(true);
  };

  const openEdit = (hc) => {
    setEditHeatId(hc.id);
    setHeatForm({
      goat_id: String(hc.goat_id),
      cycle_date: hc.cycle_date_fmt || '',
      notes: (hc.notes && typeof hc.notes === 'string') ? hc.notes : '',
    });
    setHeatModal(true);
  };

  const saveHeatCycle = async () => {
    if (!heatForm.goat_id || !heatForm.cycle_date) {
      setToast({ msg: 'Goat aani Date select kara', type: 'error' }); return;
    }
    const next_expected = calcNextHeat(heatForm.cycle_date);

    if (editHeatId) {
      const res = await fetch(`${API}/hitting-cycle/${editHeatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...heatForm, next_expected, user_id: user.id }),
      });
      if (res.ok) {
        const goatObj = goats.find(g => String(g.id) === String(heatForm.goat_id));
        setHeatCycles(h => h.map(c => c.id === editHeatId ? {
          ...c,
          goat_id: heatForm.goat_id,
          goat_code: goatObj ? goatObj.goat_code : c.goat_code,
          cycle_date_fmt: heatForm.cycle_date,
          next_expected_fmt: next_expected,
          notes: heatForm.notes || null,
        } : c));
        closeHeatModal();
        setToast({ msg: 'Heat cycle updated!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ msg: err.error || 'Update failed', type: 'error' });
      }
    } else {
      const res = await fetch(`${API}/hitting-cycle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...heatForm, user_id: user.id }),
      });
      if (res.ok) {
        const rec = await res.json();
        setHeatCycles(h => [rec, ...h]);
        closeHeatModal();
        setToast({ msg: 'Heat cycle recorded!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ msg: err.error || 'Failed to save', type: 'error' });
      }
    }
  };

  const deleteHeatCycle = async (id) => {
    if (!window.confirm('Delete this heat record?')) return;
    const res = await fetch(`${API}/hitting-cycle/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setHeatCycles(h => h.filter(c => c.id !== id));
      setToast({ msg: 'Record deleted.', type: 'error' });
    }
  };

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = heatCycles.filter(hc => {
    const days = daysToNextHeat(hc.next_expected_fmt);
    return days !== null && days >= 0 && days <= 3;
  }).length;
  const overdue = heatCycles.filter(hc => {
    const days = daysToNextHeat(hc.next_expected_fmt);
    return days !== null && days < 0;
  }).length;

  const filtered = heatCycles.filter(hc =>
    !search || (hc.goat_code && hc.goat_code.toLowerCase().includes(search.toLowerCase()))
  );

  // ✅ UPDATED: Adult Female + NOT pregnant (Pending breeding status)
  const adultFemaleGoats = goats.filter(g =>
    g.gender === 'Female' &&
    (g.life_stage === 'Adult' || !g.life_stage) &&
    !pregnantGoatIds.includes(String(g.id)) // ✅ Pregnant exclude
  );

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div className="page-header">
        <div>
          <span className="page-title">🌡️ Hitting Cycle (Heat) Records</span>
          <div style={{ display: 'inline-flex', gap: 8, marginLeft: 16 }}>
            <span style={{ fontSize: 12, background: '#FCE4EC', color: '#880E4F', padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>
              Total: {heatCycles.length}
            </span>
            {dueSoon > 0 && (
              <span style={{ fontSize: 12, background: '#FFF3E0', color: '#E65100', padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>
                ⚠️ Due Soon: {dueSoon}
              </span>
            )}
            {overdue > 0 && (
              <span style={{ fontSize: 12, background: '#FFEBEE', color: '#C62828', padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>
                ❗ Overdue: {overdue}
              </span>
            )}
          </div>
        </div>
        <button className="btn btn-primary"
          style={{ background: '#28880e', borderColor: '#880E4F' }}
          onClick={openAdd}>
          + Record Heat
        </button>
      </div>

      {/* ── INFO BANNER ── */}
      <div style={{
        background: 'linear-gradient(135deg, #FCE4EC, #F8BBD0)',
        border: '1.5px solid #F48FB1',
        borderRadius: 12, padding: '14px 20px', marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: 28 }}>🐐</span>
        <div>
          <div style={{ fontWeight: 700, color: '#880E4F', fontSize: 14 }}>Goat Heat Cycle Info</div>
          <div style={{ color: '#C2185B', fontSize: 13, marginTop: 2 }}>
            Goats have a <strong>21-day heat cycle</strong>. Record each heat date — next expected date is auto-calculated.
            Ideal breeding window is <strong>Day 1–3</strong> of heat.
          </div>
        </div>
      </div>

      {/* ── SEARCH ── */}
      <div className="search-bar" style={{ marginBottom: 16 }}>
        <input className="search-input" placeholder="🔍 Search by Goat ID"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ── TABLE ── */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Goat ID</th>
                <th>Heat Date</th>
                <th>Next Expected</th>
                <th>Days Left</th>
                <th>Status</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">🌡️</div>
                      <p>Kahi heat records nahi. "+ Record Heat" click kara.</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((hc, i) => {
                const days = daysToNextHeat(hc.next_expected_fmt);
                const isOverdue = days !== null && days < 0;
                const isToday = days === 0;
                const isSoon = days !== null && days > 0 && days <= 3;
                // ✅ NEW: Done = overdue or today
                const isDone = days !== null && days <= 0;

                return (
                  <tr key={hc.id}>
                    <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <span style={{
                        fontWeight: 700, color: '#168f06',
                        background: '#c2efbc', padding: '3px 10px',
                        borderRadius: 6, fontSize: 13
                      }}>
                        {hc.goat_code}
                      </span>
                    </td>
                    <td style={{ fontSize: 13, color: '#666' }}>{hc.cycle_date_fmt}</td>
                    <td style={{
                      fontSize: 13, fontWeight: 600,
                      color: isOverdue ? '#C62828' : '#1B5E20'
                    }}>
                      {hc.next_expected_fmt}
                    </td>
                    <td>
                      {days === null ? '—' : (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 6,
                          background: isOverdue ? '#FFEBEE' : isToday ? '#FCE4EC' : isSoon ? '#FFF3E0' : '#E8F5E9',
                          color: isOverdue ? '#C62828' : isToday ? '#880E4F' : isSoon ? '#E65100' : '#2E7D32',
                        }}>
                          {isOverdue
                            ? `${Math.abs(days)}d overdue`
                            : isToday ? 'Today!'
                            : `${days}d left`}
                        </span>
                      )}
                    </td>
                    {/* ✅ UPDATED: Status column — Done if overdue/today, else Active */}
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 8px', borderRadius: 5,
                        background: isDone ? '#E8F5E9' : '#FCE4EC',
                        color: isDone ? '#2E7D32' : '#880E4F',
                      }}>
                        {isDone ? '✅ Done' : 'Active'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: '#777' }}>
                      {hc.notes && typeof hc.notes === 'string' && hc.notes.trim() !== '' ? hc.notes : '—'}
                    </td>
                    <td>
                      <button onClick={() => openEdit(hc)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                        title="Edit">✏️</button>
                      <button onClick={() => deleteHeatCycle(hc.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 6px' }}
                        title="Delete">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ── */}
      {heatModal && (
        <Modal
          title={editHeatId ? 'Edit Hitting Cycle (Heat)' : 'Record Hitting Cycle (Heat)'}
          onClose={closeHeatModal}
          onSave={saveHeatCycle}
        >
          <div style={{ background: '#FCE4EC', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#880E4F' }}>
            Heat date enter kara. Next expected heat automatically <strong>21 days nantar</strong> calculate hoil.
          </div>
          <div className="form-group">
            <label className="form-label">Select Goat (Female) *</label>
            <select className="form-input"
              value={heatForm.goat_id}
              onChange={e => setHeatForm(f => ({ ...f, goat_id: e.target.value }))}>
              <option value="">-- Goat Select Kara --</option>
              {adultFemaleGoats.length === 0 ? (
                <option disabled>Koi eligible Female goat nahi</option>
              ) : (
                adultFemaleGoats.map(g => (
                  <option key={g.id} value={g.id}>{g.goat_code} ({g.breed})</option>
                ))
              )}
            </select>
            {/* ✅ UPDATED helper text */}
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
              ✅ Sirf Adult Female goats distat — Kids, Juveniles aur Pregnant (Breeding Pending) goats exclude aahets
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Heat (Hitting) Date *</label>
            <input className="form-input" type="date"
              value={heatForm.cycle_date}
              onChange={e => setHeatForm(f => ({ ...f, cycle_date: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" placeholder="e.g. Strong signs, bred same day..."
              value={heatForm.notes}
              onChange={e => setHeatForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          {heatForm.cycle_date && (
            <div style={{ background: '#E8F5E9', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1B5E20' }}>
              Next expected heat: <strong>{calcNextHeat(heatForm.cycle_date)}</strong>
            </div>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}