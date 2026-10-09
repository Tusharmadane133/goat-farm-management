import { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const API = 'http://localhost:4000/api';

const blankForm = {
  female_goat_id: '',
  male_goat_id: '',
  crossing_date: '',
  expected_delivery: '',
  notes: '',
};

function daysUntil(dateStr) {
  if (!dateStr || dateStr === '-') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

// ── Auto-generate a unique goat code that doesn't clash with usedCodes ──
function genUniqueCode(prefix, index, usedCodes) {
  const lower = usedCodes.map(c => c.toLowerCase());
  const letter = String.fromCharCode(65 + (index % 26));
  let code = `${prefix}-${letter}`;
  if (!lower.includes(code.toLowerCase())) return code;
  for (let n = 2; n <= 99; n++) {
    code = `${prefix}-${letter}${n}`;
    if (!lower.includes(code.toLowerCase())) return code;
  }
  return `${prefix}-${letter}-${Date.now()}`;
}

export default function Breeding() {
  const [records, setRecords] = useState([]);
  const [femaleGoats, setFemaleGoats] = useState([]);
  const [maleGoats, setMaleGoats] = useState([]);
  const [allGoatCodes, setAllGoatCodes] = useState([]); // for uniqueness check
  const [modal, setModal] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState(false);
  const [kidModal, setKidModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [outcomeForm, setOutcomeForm] = useState({ actual_delivery: '', total_born: '', survived: '', died: '' });
  const [kids, setKids] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [kidGroupId, setKidGroupId] = useState('');
  const [showDiedTable, setShowDiedTable] = useState(false);
  const [diedKids, setDiedKids] = useState([]);
  const [diedRegistered, setDiedRegistered] = useState({});

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setOut = (k, v) => setOutcomeForm(f => ({ ...f, [k]: v }));
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const uid = user.id || 1;

  useEffect(() => {
    Promise.all([
      fetch(`${API}/goats?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/breeding?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/groups?user_id=${uid}`).then(r => r.json()),
    ]).then(([goats, breed, grp]) => {
      const safeGoats = Array.isArray(goats) ? goats : [];
      setFemaleGoats(safeGoats.filter(g => g.gender === 'Female' && g.life_stage === 'Adult'));
      setMaleGoats(safeGoats.filter(g => g.gender === 'Male' && g.life_stage === 'Adult'));
      setAllGoatCodes(safeGoats.map(g => g.goat_code));

      const breedRecords = Array.isArray(breed) ? breed : [];
      setRecords(breedRecords);
      setGroups(Array.isArray(grp) ? grp : []);
      setLoading(false);

      const deliveredWithDied = breedRecords.filter(r => r.status === 'Delivered' && Number(r.died) > 0);
      if (deliveredWithDied.length > 0) {
        Promise.all(
          deliveredWithDied.map(r =>
            fetch(`${API}/breeding/${r.id}/died-kids`)
              .then(res => res.json())
              .then(kids => ({ id: r.id, kids: Array.isArray(kids) ? kids : [] }))
              .catch(() => ({ id: r.id, kids: [] }))
          )
        ).then(results => {
          const map = {};
          results.forEach(({ id, kids }) => { map[id] = kids; });
          setDiedRegistered(map);
        });
      }
    }).catch(() => {
      setToast({ msg: 'Failed to load data', type: 'error' });
      setLoading(false);
    });
  }, []);

  const handleCrossingDateChange = (val) => {
    set('crossing_date', val);
    if (val) {
      const d = new Date(val);
      d.setDate(d.getDate() + 150);
      set('expected_delivery', d.toISOString().split('T')[0]);
    }
  };

  const openAdd = () => { setEditId(null); setForm(blankForm); setModal(true); };

  const openEdit = (rec) => {
    setEditId(rec.id);
    setForm({
      female_goat_id: rec.female_goat_id,
      male_goat_id: rec.male_goat_id,
      crossing_date: rec.crossing_date || '',
      expected_delivery: rec.expected_delivery || '',
      notes: rec.notes || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.female_goat_id || !form.male_goat_id || !form.crossing_date) {
      setToast({ msg: 'Female Goat, Male Goat aur Crossing Date required hai', type: 'error' }); return;
    }
    if (String(form.female_goat_id) === String(form.male_goat_id)) {
      setToast({ msg: 'Female aur Male goat alag hone chahiye!', type: 'error' }); return;
    }
    try {
      if (editId) {
        const res = await fetch(`${API}/breeding/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, user_id: uid }),
        });
        const data = await res.json();
        if (!res.ok) { setToast({ msg: data.error || 'Update failed', type: 'error' }); return; }
        setRecords(rs => rs.map(r => r.id === editId ? { ...r, ...data } : r));
        setToast({ msg: 'Breeding record updated!', type: 'success' });
      } else {
        const res = await fetch(`${API}/breeding`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, user_id: uid }),
        });
        const data = await res.json();
        if (!res.ok) { setToast({ msg: data.error || 'Failed to add', type: 'error' }); return; }
        setRecords(rs => [data, ...rs]);
        setToast({ msg: 'Breeding record added!', type: 'success' });
      }
      setModal(false);
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
  };

  const openOutcome = (rec) => {
    setSelectedRecord(rec);
    setOutcomeForm({
      actual_delivery: rec.actual_delivery || '',
      total_born: rec.total_born ?? '',
      survived: rec.survived ?? '',
      died: rec.died ?? '',
    });
    setOutcomeModal(true);
  };

  const saveOutcome = async () => {
    if (!outcomeForm.actual_delivery) {
      setToast({ msg: 'Actual delivery date required hai', type: 'error' }); return;
    }
    try {
      const res = await fetch(`${API}/breeding/${selectedRecord.id}/outcome`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(outcomeForm),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ msg: data.error || 'Update failed', type: 'error' }); return; }
      const updatedRec = { ...selectedRecord, ...outcomeForm, status: 'Delivered' };
      setRecords(rs => rs.map(r => r.id === selectedRecord.id ? updatedRec : r));
      setOutcomeModal(false);
      setToast({ msg: 'Birth outcome saved!', type: 'success' });
      if (Number(outcomeForm.survived) > 0 || Number(outcomeForm.died) > 0) {
        setTimeout(() => {
          setSelectedRecord(updatedRec);
          openKidRegistration(updatedRec, Number(outcomeForm.survived), outcomeForm.actual_delivery);
        }, 400);
      }
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
  };

  // ── Open Kids Modal with auto-unique code generation ──
  const openKidRegistration = async (rec, count, birthDate) => {
    try {
      const [kidsRes, diedRes] = await Promise.all([
        fetch(`${API}/breeding/${rec.id}/kids`),
        fetch(`${API}/breeding/${rec.id}/died-kids`),
      ]);
      const existingKids = await kidsRes.json();
      const existingDied = await diedRes.json();

      // ── Survived kids ──
      if (Array.isArray(existingKids) && existingKids.length > 0) {
        setKids(existingKids.map(k => ({
          goat_code: k.goat_code,
          gender: k.gender || 'Female',
          weight: k.weight || '',
          birth_date: k.birth_date || birthDate || rec.actual_delivery || '',
          id: k.id,
        })));
      } else {
        const usedCodes = [...allGoatCodes];
        const initialKids = count > 0
          ? Array.from({ length: count }, (_, i) => {
              const code = genUniqueCode(`KID-${rec.female_code}`, i, usedCodes);
              usedCodes.push(code);
              return { goat_code: code, gender: 'Female', weight: '', birth_date: birthDate || rec.actual_delivery || '' };
            })
          : [];
        setKids(initialKids);
      }

      // ── Died kids ──
      const diedCount = Number(rec.died) || 0;
      if (Array.isArray(existingDied) && existingDied.length > 0) {
        setDiedKids(existingDied.map(k => ({
          goat_code: k.goat_code,
          gender: k.gender || 'Female',
          birth_date: k.birth_date || birthDate || rec.actual_delivery || '',
          id: k.id,
        })));
        setDiedRegistered(prev => ({ ...prev, [rec.id]: existingDied }));
      } else if (diedCount > 0) {
        // Auto-generate unique died codes
        const usedCodes = [...allGoatCodes];
        const newDiedKids = Array.from({ length: diedCount }, (_, i) => {
          const code = genUniqueCode(`D-${rec.female_code}`, i, usedCodes);
          usedCodes.push(code);
          return { goat_code: code, gender: 'Female', birth_date: birthDate || rec.actual_delivery || '' };
        });
        setDiedKids(newDiedKids);
      } else {
        setDiedKids([]);
      }

      setSelectedRecord(rec);
      setKidGroupId('');
      setKidModal(true);
    } catch (err) {
      console.error(err);
      setToast({ msg: 'Failed to load kids', type: 'error' });
    }
  };

  const openKidModalManual = (rec) => {
    const survived = Number(rec.survived) || 0;
    openKidRegistration(rec, survived, rec.actual_delivery);
  };

  const updateKid = (idx, key, val) => setKids(ks => ks.map((k, i) => i === idx ? { ...k, [key]: val } : k));

  const addKidRow = () => {
    const usedCodes = [...allGoatCodes, ...kids.map(k => k.goat_code)];
    const code = genUniqueCode(`KID-${selectedRecord?.female_code || 'G'}`, kids.length, usedCodes);
    setKids(ks => [...ks, { goat_code: code, gender: 'Female', weight: '', birth_date: selectedRecord?.actual_delivery || '' }]);
  };

  const removeKidRow = (idx) => setKids(ks => ks.filter((_, i) => i !== idx));

  const updateDiedKid = (idx, key, val) => setDiedKids(ks => ks.map((k, i) => i === idx ? { ...k, [key]: val } : k));

  const addDiedKidRow = () => {
    const usedCodes = [...allGoatCodes, ...diedKids.map(k => k.goat_code), ...kids.map(k => k.goat_code)];
    const code = genUniqueCode(`D-${selectedRecord?.female_code || 'G'}`, diedKids.length, usedCodes);
    setDiedKids(ks => [...ks, { goat_code: code, gender: 'Female', birth_date: selectedRecord?.actual_delivery || '' }]);
  };

  const removeDiedKidRow = (idx) => setDiedKids(ks => ks.filter((_, i) => i !== idx));

  const saveKids = async () => {
    const validKids = kids.filter(k => k.goat_code.trim());
    const validDied = diedKids.filter(k => k.goat_code.trim());
    const diedCount = Number(selectedRecord?.died) || 0;
    const survived = Number(selectedRecord?.survived) || 0;

    if (survived > 0 && !validKids.length) {
      setToast({ msg: 'Kam se kam ek survived kid ka code daalein', type: 'error' }); return;
    }

    // Check duplicates within the form
    const allFormCodes = [
      ...validKids.map(k => k.goat_code.trim().toLowerCase()),
      ...validDied.map(k => k.goat_code.trim().toLowerCase()),
    ];
    if (new Set(allFormCodes).size !== allFormCodes.length) {
      setToast({ msg: '⚠️ Duplicate Goat Codes! Har kid ka code unique hona chahiye.', type: 'error' }); return;
    }

// Check survived kids against existing farm codes
const existingLower = allGoatCodes.map(c => c.toLowerCase());
for (const code of validKids.map(k => k.goat_code.trim())) {
  if (existingLower.includes(code.toLowerCase())) {
    setToast({ msg: `❌ "${code}" already exists in your farm! Please use a different code.`, type: 'error' }); return;
  }
}
// Check died kids only against each other and survived kids (they are new by nature)
const survivedCodesLower = validKids.map(k => k.goat_code.trim().toLowerCase());
for (const code of validDied.map(k => k.goat_code.trim())) {
  if (survivedCodesLower.includes(code.toLowerCase())) {
    setToast({ msg: `❌ "${code}" is already used by a survived kid!`, type: 'error' }); return;
  }
}

    try {
      let survivedRegistered = 0, survivedErrors = 0;

      if (validKids.length > 0) {
        const kidsWithGroup = validKids.map(k => ({ ...k, group_id: kidGroupId || null }));
        const res = await fetch(`${API}/breeding/${selectedRecord.id}/register-kids`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kids: kidsWithGroup, user_id: uid }),
        });
        const data = await res.json();
        if (!res.ok) { setToast({ msg: data.error || 'Failed to save kids', type: 'error' }); return; }
        survivedRegistered = data.registered?.length || 0;
        survivedErrors = data.errors?.length || 0;
        if (data.registered?.length) {
          setAllGoatCodes(prev => [...prev, ...data.registered.map(k => k.goat_code)]);
        }
        setRecords(rs => rs.map(r => r.id === selectedRecord.id
          ? { ...r, kids_registered: (r.kids_registered || 0) + survivedRegistered }
          : r));
      }

      let diedRegisteredCount = 0, diedErrors = 0;
      const existingDied = diedRegistered[selectedRecord.id] || [];

      if (diedCount > 0 && validDied.length > 0 && existingDied.length < diedCount) {
        const diedRes = await fetch(`${API}/breeding/${selectedRecord.id}/register-died-kids`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kids: validDied, user_id: uid }),
        });
        const diedData = await diedRes.json();
        if (!diedRes.ok) { setToast({ msg: diedData.error || 'Died kids save failed', type: 'error' }); return; }
        diedRegisteredCount = diedData.registered?.length || 0;
        diedErrors = diedData.errors?.length || 0;

        if (diedData.registered?.length) {
          const newDiedList = [
            ...existingDied,
            ...diedData.registered.map(k => ({ id: k.id, goat_code: k.goat_code, gender: k.gender || 'Female' })),
          ];
          setDiedRegistered(prev => ({ ...prev, [selectedRecord.id]: newDiedList }));
          setAllGoatCodes(prev => [...prev, ...diedData.registered.map(k => k.goat_code)]);
        }
      }

      setKidModal(false);
      const parts = [];
      if (survivedRegistered > 0) parts.push(`${survivedRegistered} kid${survivedRegistered !== 1 ? 's' : ''} registered`);
      if (diedRegisteredCount > 0) parts.push(`${diedRegisteredCount} died kid${diedRegisteredCount !== 1 ? 's' : ''} registered`);
      const errTotal = survivedErrors + diedErrors;
      if (errTotal > 0) {
        setToast({ msg: `${parts.join(', ')}. ${errTotal} failed (duplicate IDs?).`, type: 'error' });
      } else if (parts.length > 0) {
        setToast({ msg: parts.join(' & ') + ' successfully!', type: 'success' });
      } else {
        setToast({ msg: 'Saved!', type: 'success' });
      }
    } catch (e) {
      console.error(e);
      setToast({ msg: 'Server error', type: 'error' });
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this breeding record?')) return;
    const res = await fetch(`${API}/breeding/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRecords(rs => rs.filter(r => r.id !== id));
      setToast({ msg: 'Record deleted.', type: 'error' });
    }
  };

  const diedTableRecords = records.filter(r => r.status === 'Delivered' && Number(r.died) > 0);
  const totalDied = diedTableRecords.reduce((s, r) => s + Number(r.died), 0);
  const totalDiedRegistered = Object.values(diedRegistered).reduce((s, arr) => s + arr.length, 0);

  const filtered = records.filter(r => {
    const matchFilter = filter === 'All' || r.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (r.female_code && r.female_code.toLowerCase().includes(q)) ||
      (r.male_code && r.male_code.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  const counts = {
    all: records.length,
    pending: records.filter(r => r.status === 'Pending').length,
    delivered: records.filter(r => r.status === 'Delivered').length,
    failed: records.filter(r => r.status === 'Failed').length,
  };

  const statusColor = { Pending: 'badge-yellow', Delivered: 'badge-green', Failed: 'badge-red' };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading breeding records...</div>;

  return (
    <div>
      {/* ── SUMMARY BAR ── */}
      <div className="summary-bar">
        <div className="summary-item"><div className="label">Total Records</div><div className="value">{counts.all}</div></div>
        <div className="summary-item"><div className="label">Pending / Pregnant</div><div className="value" style={{ color: '#F57F17' }}>{counts.pending}</div></div>
        <div className="summary-item"><div className="label">Delivered</div><div className="value" style={{ color: '#2E7D32' }}>{counts.delivered}</div></div>
        <div className="summary-item"><div className="label">Failed / Aborted</div><div className="value" style={{ color: '#C62828' }}>{counts.failed}</div></div>
      </div>

      {/* ── UPCOMING DELIVERIES ALERT ── */}
      {records.filter(r => r.status === 'Pending' && daysUntil(r.expected_delivery) !== null && daysUntil(r.expected_delivery) <= 7 && daysUntil(r.expected_delivery) >= 0).length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,#E8F5E9,#C8E6C9)', border: '1.5px solid #4CAF50', borderRadius: 12, padding: '14px 20px', marginBottom: 20, boxShadow: '0 2px 8px rgba(76,175,80,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 22 }}>🍼</span>
            <strong style={{ color: '#1B5E20', fontSize: 15 }}>Upcoming Deliveries This Week!</strong>
          </div>
          {records
            .filter(r => r.status === 'Pending' && daysUntil(r.expected_delivery) !== null && daysUntil(r.expected_delivery) <= 7 && daysUntil(r.expected_delivery) >= 0)
            .map(r => {
              const days = daysUntil(r.expected_delivery);
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 14px', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, color: '#1B5E20', background: '#E8F5E9', padding: '2px 10px', borderRadius: 6, fontSize: 13 }}>♀ {r.female_code}</span>
                    <span style={{ color: '#555', fontSize: 13 }}>× ♂ {r.male_code}</span>
                    <span style={{ fontWeight: 700, color: '#E65100', fontSize: 13 }}>{days === 0 ? '⚠️ Today!' : `📅 In ${days} day${days !== 1 ? 's' : ''}!`}</span>
                  </div>
                  <button className="btn btn-sm btn-primary" onClick={() => openOutcome(r)} style={{ fontSize: 12 }}>+ Record Birth</button>
                </div>
              );
            })}
        </div>
      )}

      {/* ── FILTER + ADD BAR ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {['All', 'Pending', 'Delivered', 'Failed'].map(f => (
            <button key={f}
              className={`btn btn-sm ${filter === f && !showDiedTable ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => { setFilter(f); setShowDiedTable(false); }}
            >{f}</button>
          ))}
          <button
            className="btn btn-sm"
            style={{
              background: showDiedTable ? '#C62828' : '#FFEBEE',
              color: showDiedTable ? '#fff' : '#C62828',
              border: '1.5px solid #C62828',
              fontWeight: 600,
            }}
            onClick={() => { setShowDiedTable(v => !v); if (!showDiedTable) setFilter('All'); }}
          >
            💀 Died {diedTableRecords.length > 0 && `(${totalDied})`}
          </button>
          <input
            style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 13, outline: 'none', width: 220, fontFamily: 'inherit', background: '#fafafa' }}
            placeholder="🔍 Search Goat ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Breeding Record</button>
      </div>

      {/* ════════════════════════════════════════════════════
          ── DIED KIDS TABLE (completely redesigned) ──
          ════════════════════════════════════════════════════ */}
      {showDiedTable && (
        <div className="card" style={{ marginBottom: 20 }}>

          {/* Card header */}
          <div style={{
            padding: '16px 20px 14px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: '#FFEBEE', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 20, flexShrink: 0,
            }}>💀</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#B71C1C', fontSize: 15 }}>Died Kids Records</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>
                Deceased kids from delivered breeding records
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ background: '#FFEBEE', color: '#C62828', padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: '1px solid #FFCDD2' }}>
                💀 {totalDied} Total Deaths
              </span>
              <span style={{
                background: totalDiedRegistered === totalDied ? '#E8F5E9' : '#FFF3E0',
                color: totalDiedRegistered === totalDied ? '#1B5E20' : '#E65100',
                padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                border: `1px solid ${totalDiedRegistered === totalDied ? '#A5D6A7' : '#FFB74D'}`,
              }}>
                ✅ {totalDiedRegistered}/{totalDied} Registered
              </span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
<th>#</th>
<th>♀ Female</th>
<th>♂ Male</th>
<th>Delivery Date</th>
<th>Deaths</th>
<th>Registered Codes</th>
<th>Status</th>
                </tr>
              </thead>
              <tbody>
                {diedTableRecords.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-icon">✅</div>
                      <p>No died records found</p>
                    </div>
                  </td></tr>
                ) : diedTableRecords.map((r, i) => {
                  const regDied = diedRegistered[r.id] || [];
                  const diedCount = Number(r.died) || 0;
                  const allRegistered = regDied.length >= diedCount;
                  const pending = diedCount - regDied.length;

                  return (
                    <tr key={r.id}>
                      <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#880E4F', background: '#FCE4EC', padding: '3px 10px', borderRadius: 6, fontSize: 13 }}>
                          ♀ {r.female_code}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1565C0', background: '#E3F2FD', padding: '3px 10px', borderRadius: 6, fontSize: 13 }}>
                          ♂ {r.male_code}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#555' }}>
                        {r.actual_delivery || '—'}
                      </td>
                      <td>
                        <span style={{
                          background: '#FFEBEE', color: '#C62828',
                          padding: '3px 12px', borderRadius: 6,
                          fontSize: 13, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          💀 {diedCount}
                        </span>
                      </td>
                      <td>
                        {regDied.length > 0 ? (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                            {regDied.map((k, ki) => (
                              <span key={ki} style={{
                                background: '#fff', color: '#B71C1C',
                                padding: '2px 9px', borderRadius: 6,
                                fontSize: 12, fontWeight: 600,
                                border: '1.5px solid #FFCDD2',
                                display: 'inline-flex', alignItems: 'center', gap: 3,
                              }}>
                                💀 {k.goat_code}
                              </span>
                            ))}
                            {!allRegistered && (
                              <span style={{
                                background: '#FFF3E0', color: '#E65100',
                                padding: '2px 8px', borderRadius: 6,
                                fontSize: 11, fontWeight: 600,
                                border: '1px dashed #FF9800',
                              }}>
                                +{pending} more pending
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#bbb', fontSize: 13 }}>— Not registered yet</span>
                        )}
                      </td>
                      <td>
                        {allRegistered ? (
                          <span className="badge badge-green">✅ Complete</span>
                        ) : (
                          <span className="badge badge-yellow">⏳ {pending} Pending</span>
                        )}
                      </td>
                    
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          ── MAIN BREEDING TABLE ──
          ════════════════════════════════════════════════════ */}
      {!showDiedTable && (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>♀ Female</th>
                  <th>♂ Male</th>
                  <th>Crossing Date</th>
                  <th>Expected Delivery</th>
                  <th>Actual Delivery</th>
                  <th>Born / Sur / Died</th>
                  <th>Kids Reg.</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={10}><div className="empty-state"><div className="empty-icon">🐐</div><p>No breeding records found</p></div></td></tr>
                ) : filtered.map((r, i) => {
                  const days = daysUntil(r.expected_delivery);
                  const isNear = r.status === 'Pending' && days !== null && days >= 0 && days <= 7;
                  const kidsReg = Number(r.kids_registered) || 0;
                  const survived = Number(r.survived) || 0;
                  const diedCount = Number(r.died) || 0;
                  const needsKidReg = r.status === 'Delivered' && survived > 0 && kidsReg < survived;
                  const regDied = diedRegistered[r.id] || [];
                  const needsDiedReg = r.status === 'Delivered' && diedCount > 0 && regDied.length < diedCount;

                  return (
                    <tr key={r.id} style={{ background: isNear ? '#F1F8E9' : 'transparent' }}>
                      <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#880E4F', background: '#FCE4EC', padding: '2px 10px', borderRadius: 6, fontSize: 13 }}>
                          ♀ {r.female_code}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: '#1565C0', background: '#E3F2FD', padding: '2px 10px', borderRadius: 6, fontSize: 13 }}>
                          ♂ {r.male_code}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: '#555' }}>{r.crossing_date || '—'}</td>
                      <td style={{ fontSize: 13 }}>
                        {r.expected_delivery ? (
                          <span style={{ color: isNear ? '#E65100' : '#555', fontWeight: isNear ? 700 : 400 }}>
                            {r.expected_delivery}
                            {isNear && (
                              <span style={{ marginLeft: 6, fontSize: 10, background: '#FF9800', color: '#fff', borderRadius: 4, padding: '1px 6px' }}>
                                {days === 0 ? 'Today!' : `${days}d`}
                              </span>
                            )}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: 13, color: '#555' }}>{r.actual_delivery || '—'}</td>

                      {/* Born / Survived / Died */}
                      <td>
                        {r.status === 'Delivered' ? (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            <span style={{ background: '#E8F5E9', color: '#1B5E20', padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>🐣 {r.total_born ?? '—'}</span>
                            <span style={{ background: '#E3F2FD', color: '#1565C0', padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>✅ {r.survived ?? '—'}</span>
                            <span style={{ background: '#FFEBEE', color: '#C62828', padding: '2px 7px', borderRadius: 5, fontSize: 12, fontWeight: 600 }}>✗ {r.died ?? '—'}</span>
                          </div>
                        ) : <span style={{ color: '#bbb', fontSize: 12 }}>Not delivered</span>}
                      </td>

{/* ── KIDS REG. COLUMN — SIDE BY SIDE ── */}
<td>
  {r.status === 'Delivered' ? (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {survived > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 20,
          background: kidsReg >= survived ? '#E8F5E9' : '#FFF3E0',
          color: kidsReg >= survived ? '#1B5E20' : '#E65100',
          border: `1px solid ${kidsReg >= survived ? '#A5D6A7' : '#FFB74D'}`,
          whiteSpace: 'nowrap',
        }}>
          ✅ {kidsReg}/{survived}
        </span>
      )}
      {diedCount > 0 && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700,
          padding: '2px 8px', borderRadius: 20,
          background: regDied.length >= diedCount ? '#FFEBEE' : '#FFF3E0',
          color: regDied.length >= diedCount ? '#C62828' : '#E65100',
          border: `1px solid ${regDied.length >= diedCount ? '#FFCDD2' : '#FFB74D'}`,
          whiteSpace: 'nowrap',
        }}>
          💀 {regDied.length}/{diedCount}
        </span>
      )}
      {survived === 0 && diedCount === 0 && (
        <span style={{ color: '#bbb', fontSize: 12 }}>—</span>
      )}
    </div>
  ) : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
</td>

                      <td>
                        <span className={`badge ${statusColor[r.status] || 'badge-gray'}`}>{r.status}</span>
                      </td>

                      <td>
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(r)}>✏️</button>
                        {r.status === 'Pending' && (
                          <button
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, padding: '3px 10px', marginRight: 4 }}
                            onClick={() => openOutcome(r)}
                            title="Record Birth"
                          >
                            🍼 Birth
                          </button>
                        )}
                        {r.status === 'Delivered' && (survived > 0 || diedCount > 0) && (
                          <button
                            className="btn btn-sm"
                            style={{
                              fontSize: 11, padding: '3px 10px', marginRight: 4,
                              background: (needsKidReg || needsDiedReg) ? '#FFF3E0' : '#E8F5E9',
                              color: (needsKidReg || needsDiedReg) ? '#E65100' : '#1B5E20',
                              border: `1px solid ${(needsKidReg || needsDiedReg) ? '#FF9800' : '#4CAF50'}`,
                              borderRadius: 6, cursor: 'pointer',
                            }}
                            onClick={() => openKidModalManual(r)}
                            title="Register Kids & Died Codes"
                          >
                            🐣 Kids
                          </button>
                        )}
                        <button className="btn-icon" title="Delete" onClick={() => remove(r.id)}>🗑️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ADD/EDIT MODAL ── */}
      {modal && (
        <Modal title={editId ? 'Edit Breeding Record' : 'Add Breeding Record'} onClose={() => setModal(false)} onSave={save}>
          <div className="form-group">
            <label className="form-label">♀ Female Goat *</label>
            <select className="form-input" value={form.female_goat_id} onChange={e => set('female_goat_id', e.target.value)}>
              <option value="">-- Select Female Goat --</option>
              {femaleGoats.map(g => <option key={g.id} value={g.id}>{g.goat_code} ({g.breed})</option>)}
            </select>
            {femaleGoats.length === 0 && <div style={{ fontSize: 12, color: '#E65100', marginTop: 4 }}>⚠️ No adult female goats found.</div>}
          </div>
          <div className="form-group">
            <label className="form-label">♂ Male Goat *</label>
            <select className="form-input" value={form.male_goat_id} onChange={e => set('male_goat_id', e.target.value)}>
              <option value="">-- Select Male Goat --</option>
              {maleGoats.map(g => <option key={g.id} value={g.id}>{g.goat_code} ({g.breed})</option>)}
            </select>
            {maleGoats.length === 0 && <div style={{ fontSize: 12, color: '#E65100', marginTop: 4 }}>⚠️ No adult male goats found.</div>}
          </div>
          {(form.female_goat_id || form.male_goat_id) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              {form.female_goat_id && (() => {
                const g = femaleGoats.find(x => String(x.id) === String(form.female_goat_id));
                return g ? <div style={{ fontSize: 12, color: '#880E4F', background: '#FCE4EC', padding: '5px 12px', borderRadius: 6, flex: 1 }}>♀ {g.goat_code} | {g.breed} | {g.weight} kg</div> : null;
              })()}
              {form.male_goat_id && (() => {
                const g = maleGoats.find(x => String(x.id) === String(form.male_goat_id));
                return g ? <div style={{ fontSize: 12, color: '#1565C0', background: '#E3F2FD', padding: '5px 12px', borderRadius: 6, flex: 1 }}>♂ {g.goat_code} | {g.breed} | {g.weight} kg</div> : null;
              })()}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Crossing / Mating Date *</label>
            <input className="form-input" type="date" value={form.crossing_date} onChange={e => handleCrossingDateChange(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">
              Expected Delivery Date
              <span style={{ color: '#888', fontWeight: 400, fontSize: 11, marginLeft: 6 }}>(auto: crossing + 150 days)</span>
            </label>
            <input className="form-input" type="date" value={form.expected_delivery} onChange={e => set('expected_delivery', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea className="form-input" rows={2} placeholder="Any additional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </Modal>
      )}

      {/* ── BIRTH OUTCOME MODAL ── */}
      {outcomeModal && selectedRecord && (
        <Modal title={`🍼 Record Birth — ${selectedRecord.female_code}`} onClose={() => setOutcomeModal(false)} onSave={saveOutcome}>
          <div style={{ background: '#E8F5E9', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#2E7D32' }}>
            <strong>♀ {selectedRecord.female_code}</strong> × <strong>♂ {selectedRecord.male_code}</strong>
            <span style={{ marginLeft: 12, color: '#555' }}>Crossed: {selectedRecord.crossing_date}</span>
          </div>
          <div className="form-group">
            <label className="form-label">Actual Delivery Date *</label>
            <input className="form-input" type="date" value={outcomeForm.actual_delivery} onChange={e => setOut('actual_delivery', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#1B5E20' }}>🐣 Total Born</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={outcomeForm.total_born}
                onChange={e => { const b = Number(e.target.value); setOut('total_born', e.target.value); if (outcomeForm.survived !== '') setOut('died', Math.max(0, b - Number(outcomeForm.survived))); }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: '#1565C0' }}>✅ Survived</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={outcomeForm.survived}
                onChange={e => { const s = Number(e.target.value); setOut('survived', e.target.value); if (outcomeForm.total_born !== '') setOut('died', Math.max(0, Number(outcomeForm.total_born) - s)); }} />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: '#C62828' }}>✗ Died</label>
              <input className="form-input" type="number" min="0" placeholder="0" value={outcomeForm.died}
                onChange={e => setOut('died', e.target.value)} style={{ background: outcomeForm.died > 0 ? '#FFEBEE' : '' }} />
            </div>
          </div>
          {(outcomeForm.total_born || outcomeForm.survived) && (
            <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#444', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>🐣 Born: <strong>{outcomeForm.total_born || 0}</strong></span>
              <span style={{ color: '#1565C0' }}>✅ Survived: <strong>{outcomeForm.survived || 0}</strong></span>
              <span style={{ color: '#C62828' }}>✗ Died: <strong>{outcomeForm.died || 0}</strong></span>
              {outcomeForm.total_born > 0 && (
                <span style={{ color: '#2E7D32', fontWeight: 600 }}>
                  Rate: {Math.round((Number(outcomeForm.survived || 0) / Number(outcomeForm.total_born)) * 100)}%
                </span>
              )}
            </div>
          )}
          {(Number(outcomeForm.survived) > 0 || Number(outcomeForm.died) > 0) && (
            <div style={{ background: '#E3F2FD', borderRadius: 8, padding: '10px 14px', marginTop: 12, fontSize: 13, color: '#1565C0' }}>
              💡 After saving, you'll register survived kids <strong>and</strong> assign codes to died kids — all in one modal.
            </div>
          )}
        </Modal>
      )}

      {/* ════════════════════════════════════════════════════
          ── COMBINED KID + DIED REGISTRATION MODAL ──
          ════════════════════════════════════════════════════ */}
      {kidModal && selectedRecord && (
        <Modal
          title={`🐣 Register Kids — ${selectedRecord.female_code} × ${selectedRecord.male_code}`}
          onClose={() => setKidModal(false)}
          onSave={saveKids}
        >
          {/* Info bar */}
          <div style={{ background: '#E8F5E9', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1B5E20' }}>
            <strong>♀ {selectedRecord.female_code}</strong> × <strong>♂ {selectedRecord.male_code}</strong>
            <span style={{ color: '#555', marginLeft: 10 }}>Born: {selectedRecord.actual_delivery || '—'}</span>
            <span style={{ marginLeft: 12 }}>
              ✅ Survived: <strong>{selectedRecord.survived ?? 0}</strong>
              {Number(selectedRecord.died) > 0 && (
                <span style={{ color: '#C62828', marginLeft: 10 }}>💀 Died: <strong>{selectedRecord.died}</strong></span>
              )}
            </span>
          </div>

          {/* Note about auto-codes */}
          <div style={{ background: '#E3F2FD', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1565C0' }}>
            💡 Codes are <strong>auto-generated as unique</strong>. You can edit them. Any code that already exists in your farm will be rejected.
          </div>

          {/* ── SURVIVED KIDS SECTION ── */}
          {Number(selectedRecord.survived) > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E20', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                ✅ Survived Kids ({selectedRecord.survived})
              </div>
              <div className="form-group">
                <label className="form-label">Assign all survived kids to group (optional)</label>
                <select className="form-input" value={kidGroupId} onChange={e => setKidGroupId(e.target.value)}>
                  <option value="">-- No Group --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              {kids.map((kid, idx) => {
                const isDuplicate =
                  allGoatCodes.map(c => c.toLowerCase()).includes(kid.goat_code.trim().toLowerCase()) ||
                  kids.some((k, i) => i !== idx && k.goat_code.trim().toLowerCase() === kid.goat_code.trim().toLowerCase());
                return (
                  <div key={idx} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto',
                    gap: 10, marginBottom: 10, alignItems: 'end',
                    background: isDuplicate ? '#FFF8E1' : '#fafafa',
                    padding: '10px 12px', borderRadius: 8,
                    border: `1.5px solid ${isDuplicate ? '#FFB74D' : '#e0e0e0'}`,
                  }}>
                    <div>
                      <label style={{ fontSize: 11, color: '#666', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                        Kid #{idx + 1} — Goat Code *
                      </label>
                      <input
                        className="form-input"
                        style={{ marginBottom: 0, borderColor: isDuplicate ? '#FF9800' : '' }}
                        placeholder="e.g. KID-101-A"
                        value={kid.goat_code}
                        onChange={e => updateKid(idx, 'goat_code', e.target.value)}
                      />
                      {isDuplicate && (
                        <div style={{ fontSize: 11, color: '#E65100', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          ⚠️ This code already exists!
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#666', fontWeight: 600, display: 'block', marginBottom: 3 }}>Gender</label>
                      <select className="form-input" style={{ marginBottom: 0 }} value={kid.gender} onChange={e => updateKid(idx, 'gender', e.target.value)}>
                        <option value="Female">♀ Female</option>
                        <option value="Male">♂ Male</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: '#666', fontWeight: 600, display: 'block', marginBottom: 3 }}>Weight (kg)</label>
                      <input className="form-input" style={{ marginBottom: 0 }} type="number" placeholder="e.g. 3.5"
                        value={kid.weight} onChange={e => updateKid(idx, 'weight', e.target.value)} />
                    </div>
                    <button type="button" onClick={() => removeKidRow(idx)}
                      style={{ background: '#FFEBEE', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#C62828', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>×</button>
                  </div>
                );
              })}
              <button type="button" className="btn btn-outline" style={{ width: '100%', marginTop: 4, fontSize: 13 }} onClick={addKidRow}>
                + Add Another Survived Kid
              </button>
            </>
          )}

          {/* ── DIED KIDS SECTION ── */}
          {Number(selectedRecord.died) > 0 && (
            <div style={{
              marginTop: Number(selectedRecord.survived) > 0 ? 22 : 0,
              borderTop: Number(selectedRecord.survived) > 0 ? '2px dashed #FFCDD2' : 'none',
              paddingTop: Number(selectedRecord.survived) > 0 ? 18 : 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#C62828', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                💀 Died Kids ({selectedRecord.died})
              </div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
                These are recorded as deceased. Unique codes are required for tracking.
              </div>

              {/* Already all registered — show read-only */}
              {(diedRegistered[selectedRecord.id] || []).length >= Number(selectedRecord.died) ? (
                <div style={{ background: '#FFF5F5', borderRadius: 10, padding: '14px 16px', border: '1.5px solid #FFCDD2' }}>
                  <div style={{ fontWeight: 700, color: '#B71C1C', marginBottom: 10, fontSize: 13 }}>
                    ✅ All {Number(selectedRecord.died)} died kid{Number(selectedRecord.died) !== 1 ? 's' : ''} registered:
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {(diedRegistered[selectedRecord.id] || []).map(k => (
                      <span key={k.goat_code} style={{
                        background: '#fff', border: '1.5px solid #FFCDD2', borderRadius: 6,
                        padding: '4px 12px', fontWeight: 700, fontSize: 13, color: '#B71C1C',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                      }}>
                        💀 {k.goat_code}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {diedKids.map((kid, idx) => {
                    const isDuplicate =
                      allGoatCodes.map(c => c.toLowerCase()).includes(kid.goat_code.trim().toLowerCase()) ||
                      diedKids.some((k, i) => i !== idx && k.goat_code.trim().toLowerCase() === kid.goat_code.trim().toLowerCase()) ||
                      kids.some(k => k.goat_code.trim().toLowerCase() === kid.goat_code.trim().toLowerCase());
                    return (
                      <div key={idx} style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr auto',
                        gap: 10, marginBottom: 8, alignItems: 'end',
                        background: isDuplicate ? '#FFF8E1' : '#FFF5F5',
                        padding: '10px 12px', borderRadius: 8,
                        border: `1.5px solid ${isDuplicate ? '#FFB74D' : '#FFCDD2'}`,
                      }}>
                        <div>
                          <label style={{ fontSize: 11, color: '#C62828', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                            💀 Died Kid #{idx + 1} — Code *
                          </label>
                          <input
                            className="form-input"
                            style={{ marginBottom: 0, borderColor: isDuplicate ? '#FF9800' : '#FFCDD2' }}
                            placeholder="e.g. D-104-A"
                            value={kid.goat_code}
                            onChange={e => updateDiedKid(idx, 'goat_code', e.target.value)}
                          />
                          {isDuplicate && (
                            <div style={{ fontSize: 11, color: '#E65100', marginTop: 3 }}>
                              ⚠️ This code already exists!
                            </div>
                          )}
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: '#C62828', fontWeight: 600, display: 'block', marginBottom: 3 }}>Gender</label>
                          <select className="form-input" style={{ marginBottom: 0 }} value={kid.gender}
                            onChange={e => updateDiedKid(idx, 'gender', e.target.value)}>
                            <option value="Female">♀ Female</option>
                            <option value="Male">♂ Male</option>
                          </select>
                        </div>
                        <button type="button" onClick={() => removeDiedKidRow(idx)}
                          style={{ background: '#FFEBEE', border: 'none', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#C62828', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' }}>×</button>
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-outline"
                    style={{ width: '100%', marginTop: 4, fontSize: 12, borderColor: '#FFCDD2', color: '#C62828' }}
                    onClick={addDiedKidRow}>
                    + Add Died Kid Code
                  </button>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}