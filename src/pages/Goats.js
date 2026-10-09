import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const BASE_BREEDS = [
  'Boer', 'Sirohi', 'Barbari', 'Beetal', 'Black Bengal',
  'Jamnapari', 'Osmanabadi', 'Malabari', 'Surti', 'Kanni Adu',
  'Kodi Adu', 'Sangamneri', 'Mehsana', 'Marwari', 'Ganjam',
];

const STORAGE_KEY = 'goatfarm_custom_breeds';

function loadCustomBreeds() {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; }
  catch { return []; }
}
function saveCustomBreed(breed) {
  const c = loadCustomBreeds();
  if (!c.includes(breed)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...c, breed]));
}

const blank = {
  goat_code: '',
  breed: '',
  customBreed: '',
  birth_date: '',
  weight: '',
  health: 'Healthy',
  gender: 'Female',
  group_id: '',
};
const API = 'http://localhost:4000/api';

export default function Goats() {
  const navigate = useNavigate();
  const [goats, setGoats] = useState([]);
  const [search, setSearch] = useState('');
  const [filterHealth, setFilterHealth] = useState('All');
  const [filterStage, setFilterStage] = useState('All');
  const [modal, setModal] = useState(false);
  const [promoteModal, setPromoteModal] = useState(false);
  const [promoteGoat, setPromoteGoat] = useState(null);
  const [promoteGender, setPromoteGender] = useState('Female');
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState(blank);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customBreeds, setCustomBreeds] = useState(loadCustomBreeds());
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupDropdownRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Close group dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/goats?user_id=${user.id || 1}`).then(r => r.json()),
      fetch(`${API}/groups?user_id=${user.id || 1}`).then(r => r.json()),
    ]).then(([goatData, groupData]) => {
      setGoats(Array.isArray(goatData) ? goatData : []);
      setGroups(Array.isArray(groupData) ? groupData : []);
      setLoading(false);
    }).catch(() => {
      setToast({ msg: 'Failed to load goats', type: 'error' });
      setLoading(false);
    });
  }, []);

  const filtered = goats.filter(g => {
    if (!g || !g.goat_code) return false;
    const matchSearch =
      g.goat_code.toLowerCase().includes(search.toLowerCase()) ||
      (g.breed && g.breed.toLowerCase().includes(search.toLowerCase()));
    const matchHealth = filterHealth === 'All' || g.health === filterHealth;
    const matchStage = filterStage === 'All' || (g.life_stage || 'Adult') === filterStage;
    const matchGroup = selectedGroups.length === 0 || selectedGroups.includes(String(g.group_id));
    return matchSearch && matchHealth && matchStage && matchGroup;
  });

  const adultCount = goats.filter(g => (g.life_stage || 'Adult') === 'Adult').length;
  const kidCount = goats.filter(g => g.life_stage === 'Kid').length;

  const promoteAlerts = goats.filter(g =>
    g.life_stage === 'Kid' && g.birth_date && g.age_months >= 6
  );

  const openAdd = () => { setEdit(null); setForm(blank); setModal(true); };

  const openEdit = (g, e) => {
    e.stopPropagation();
    setEdit(g.id);
    const knownBreeds = [...BASE_BREEDS, ...loadCustomBreeds()];
    const isKnown = knownBreeds.includes(g.breed);
    setForm({
      goat_code: g.goat_code,
      breed: isKnown ? g.breed : 'Other (Custom)',
      customBreed: isKnown ? '' : g.breed,
      birth_date: g.birth_date || '',
      weight: g.weight ?? '',
      health: g.health,
      gender: g.gender || 'Female',
      group_id: g.group_id || '',
    });
    setModal(true);
  };

  const openPromote = (g, e) => {
    e.stopPropagation();
    setPromoteGoat(g);
    setPromoteGender(g.gender || 'Female');
    setPromoteModal(true);
  };

  const confirmPromote = async () => {
    try {
      const res = await fetch(`${API}/goats/${promoteGoat.id}/promote`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gender: promoteGender }),
      });
      if (res.ok) {
        setGoats(gs => gs.map(g => g.id === promoteGoat.id
          ? { ...g, life_stage: 'Adult', gender: promoteGender }
          : g));
        setPromoteModal(false);
        setToast({ msg: `${promoteGoat.goat_code} promoted to Adult ${promoteGender}!`, type: 'success' });
      } else {
        const err = await res.json();
        setToast({ msg: err.error || 'Promote failed', type: 'error' });
      }
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
  };

  const getFinalBreed = () => form.breed === 'Other (Custom)' ? form.customBreed.trim() : form.breed;

  const save = async () => {
    const finalBreed = getFinalBreed();
    if (!form.goat_code || !finalBreed) {
      setToast({ msg: 'Goat ID aur Breed required hai', type: 'error' }); return;
    }
    if (form.breed === 'Other (Custom)' && finalBreed) {
      saveCustomBreed(finalBreed);
      setCustomBreeds(loadCustomBreeds());
    }
    const payload = {
      goat_code: form.goat_code,
      breed: finalBreed,
      birth_date: form.birth_date || null,
      weight: form.weight || null,
      health: form.health,
      gender: form.gender,
      group_id: form.group_id || null,
    };
    if (edit) {
      const res = await fetch(`${API}/goats/${edit}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setGoats(gs => gs.map(g => g.id === edit ? { ...g, ...payload } : g));
        setToast({ msg: 'Goat updated!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ msg: err.error || 'Update failed', type: 'error' });
      }
    } else {
      const res = await fetch(`${API}/goats`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, user_id: user.id || 1 }),
      });
      if (res.ok) {
        const newGoat = await res.json();
        setGoats(gs => [newGoat, ...gs]);
        setToast({ msg: 'Goat added!', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ msg: err.error || 'Failed to add goat', type: 'error' });
      }
    }
    setModal(false);
  };

  const remove = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this goat?')) return;
    const res = await fetch(`${API}/goats/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setGoats(gs => gs.filter(g => g.id !== id));
      setToast({ msg: 'Goat deleted.', type: 'error' });
    }
  };

  // Label for the group filter trigger
  const groupLabel = selectedGroups.length === 0
    ? 'All Groups'
    : selectedGroups.length === 1
      ? groups.find(g => String(g.id) === selectedGroups[0])?.name || 'Group'
      : `${selectedGroups.length} Groups`;

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading goats...</div>;

  return (
    <div>
      {/* ── PROMOTE ALERT BANNER ── */}
      {promoteAlerts.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#E8F5E9,#C8E6C9)',
          border: '1.5px solid #4CAF50', borderRadius: 12,
          padding: '14px 20px', marginBottom: 16,
          boxShadow: '0 2px 8px rgba(76,175,80,0.15)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <strong style={{ color: '#1B5E20', fontSize: 15 }}>
              {promoteAlerts.length} Kid{promoteAlerts.length > 1 ? 's' : ''} Ready to Promote to Adult!
            </strong>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {promoteAlerts.map(g => (
              <div key={g.id} style={{
                background: 'rgba(255,255,255,0.7)', borderRadius: 8, padding: '6px 14px',
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
              }}>
                <span style={{ fontWeight: 700, color: '#1B5E20' }}>🐐 {g.goat_code}</span>
                <span style={{ color: '#555' }}>
                  {g.age_years > 0
                    ? `${g.age_years} yr ${g.age_months % 12} mo old`
                    : `${g.age_months} months old`}
                </span>
                <button className="btn btn-sm btn-primary" style={{ fontSize: 11, padding: '2px 10px' }} onClick={e => openPromote(g, e)}>
                  Promote →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PAGE HEADER ── */}
      <div className="page-header">
        <div>
          <span className="page-title">All Goats ({goats.length})</span>
          <div style={{ display: 'inline-flex', gap: 8, marginLeft: 16 }}>
            <span style={{ fontSize: 12, background: '#E8F5E9', color: '#1B5E20', padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>Adults: {adultCount}</span>
            {kidCount > 0 && <span style={{ fontSize: 12, background: '#F3E5F5', color: '#7B1FA2', padding: '2px 10px', borderRadius: 6, fontWeight: 600 }}>Kids: {kidCount}</span>}
          </div>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Goat</button>
      </div>

      {/* ── SEARCH + FILTER BAR ── */}
      <div className="search-bar">
        <input
          className="search-input"
          placeholder="🔍 Search Goat ID or Breed"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="form-input" style={{ width: 160 }} value={filterHealth} onChange={e => setFilterHealth(e.target.value)}>
          <option value="All">All Health</option>
          <option>Healthy</option>
          <option>Under Treatment</option>
          <option>Sick</option>
        </select>
        <select className="form-input" style={{ width: 140 }} value={filterStage} onChange={e => setFilterStage(e.target.value)}>
          <option value="All">All Stages</option>
          <option value="Adult">Adult</option>
          <option value="Kid">Kid</option>
          <option value="Juvenile">Juvenile</option>
        </select>

        {/* ── Group Filter: div trigger (not select) so no browser dropdown conflict ── */}
        <div ref={groupDropdownRef} style={{ position: 'relative' }}>
          {/* Trigger styled to look exactly like the other form-input selects */}
          <div
            onClick={() => setGroupDropdownOpen(o => !o)}
            style={{
              width: 160,
              padding: '0 14px',
              height: 42,
              borderRadius: 8,
              border: selectedGroups.length > 0 ? '1.5px solid #2E7D32' : '1.5px solid #e0e0e0',
              background: selectedGroups.length > 0 ? '#E8F5E9' : '#fafafa',
              cursor: 'pointer',
              fontSize: 14,
              fontFamily: 'inherit',
              color: selectedGroups.length > 0 ? '#1B5E20' : '#555',
              fontWeight: selectedGroups.length > 0 ? 600 : 400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              userSelect: 'none',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              {groupLabel}
            </span>
            {/* Chevron arrow matching native select look */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginLeft: 6 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Dropdown panel */}
          {groupDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              background: '#fff',
              border: '1.5px solid #e0e0e0',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              zIndex: 999,
              minWidth: 210,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#555' }}>Filter by Group</span>
                {selectedGroups.length > 0 && (
                  <button
                    onClick={() => setSelectedGroups([])}
                    style={{ fontSize: 11, color: '#C62828', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Clear all
                  </button>
                )}
              </div>

              {/* All Groups row */}
              <div
                onClick={() => setSelectedGroups([])}
                style={{
                  padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: selectedGroups.length === 0 ? '#E8F5E9' : '#fff',
                  borderBottom: '1px solid #f5f5f5',
                }}
                onMouseEnter={e => { if (selectedGroups.length !== 0) e.currentTarget.style.background = '#f9f9f9'; }}
                onMouseLeave={e => { e.currentTarget.style.background = selectedGroups.length === 0 ? '#E8F5E9' : '#fff'; }}
              >
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#9E9E9E', flexShrink: 0 }} />
                <span style={{ fontSize: 13, flex: 1, color: '#333' }}>All Groups</span>
                <div style={{
                  width: 16, height: 16, borderRadius: 4,
                  border: selectedGroups.length === 0 ? 'none' : '1.5px solid #ccc',
                  background: selectedGroups.length === 0 ? '#2E7D32' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {selectedGroups.length === 0 && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </div>
              </div>

              {/* Individual group rows */}
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {groups.length === 0 ? (
                  <div style={{ padding: '12px 14px', fontSize: 13, color: '#aaa', textAlign: 'center' }}>
                    No groups created yet
                  </div>
                ) : groups.map(g => {
                  const isSelected = selectedGroups.includes(String(g.id));
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedGroups(prev =>
                        isSelected ? prev.filter(id => id !== String(g.id)) : [...prev, String(g.id)]
                      )}
                      style={{
                        padding: '10px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: isSelected ? '#E8F5E9' : '#fff',
                        borderBottom: '1px solid #f5f5f5',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9f9f9'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#E8F5E9' : '#fff'; }}
                    >
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: g.color || '#4CAF50', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, flex: 1, color: '#333' }}>{g.name}</span>
                      <span style={{ fontSize: 11, color: '#888' }}>{g.goat_count} 🐐</span>
                      <div style={{
                        width: 16, height: 16, borderRadius: 4,
                        border: isSelected ? 'none' : '1.5px solid #ccc',
                        background: isSelected ? '#2E7D32' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {isSelected && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div style={{ padding: '8px 14px', borderTop: '1px solid #f0f0f0', background: '#fafafa', textAlign: 'center' }}>
                <button
                  onClick={() => setGroupDropdownOpen(false)}
                  style={{ fontSize: 12, color: '#2E7D32', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
                >
                  Apply ✓
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Goat ID</th><th>Stage</th><th>Breed</th><th>Gender</th>
                <th>Age</th><th>Weight</th><th>Health</th><th>Group</th><th>Parents</th>
                <th>Added</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={12}><div className="empty-state"><div className="empty-icon">🐐</div><p>No goats found</p></div></td></tr>
              ) : filtered.map((g, i) => {
                const stage = g.life_stage || 'Adult';
                const isKid = stage === 'Kid';
                const readyToPromote = isKid && g.age_months >= 6;
                const weaningDays = g.weaning_date
                  ? Math.round((new Date(g.weaning_date) - new Date()) / 86400000)
                  : null;
                return (
                  <tr key={g.id}
                    onClick={() => navigate(`/goats/${g.goat_code}`)}
                    style={{ cursor: 'pointer', background: readyToPromote ? '#F1F8E9' : 'transparent' }}
                    onMouseEnter={e => e.currentTarget.style.background = readyToPromote ? '#E8F5E9' : '#f0f7f0'}
                    onMouseLeave={e => e.currentTarget.style.background = readyToPromote ? '#F1F8E9' : 'transparent'}
                  >
                    <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#2E7D32', background: '#E8F5E9', padding: '3px 10px', borderRadius: 6, fontSize: 13 }}>
                        {g.goat_code}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                        background: isKid ? '#F3E5F5' : stage === 'Juvenile' ? '#FFF3E0' : '#E8F5E9',
                        color: isKid ? '#7B1FA2' : stage === 'Juvenile' ? '#E65100' : '#1B5E20',
                      }}>
                        {stage === 'Kid' ? '🐣 Kid' : stage === 'Juvenile' ? '🌱 Juvenile' : '🐐 Adult'}
                      </span>
                      {isKid && weaningDays !== null && weaningDays >= 0 && weaningDays <= 7 && (
                        <span style={{ marginLeft: 4, fontSize: 10, background: '#FF9800', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>
                          Wean {weaningDays === 0 ? 'Today!' : `${weaningDays}d`}
                        </span>
                      )}
                      {readyToPromote && (
                        <span style={{ marginLeft: 4, fontSize: 10, background: '#4CAF50', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>
                          Promote!
                        </span>
                      )}
                    </td>
                    <td>{g.breed}</td>
                    <td>
                      <span style={{
                        fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 6,
                        background: g.gender === 'Male' ? '#E3F2FD' : '#FCE4EC',
                        color: g.gender === 'Male' ? '#1565C0' : '#880E4F',
                      }}>
                        {g.gender === 'Male' ? '♂ Male' : '♀ Female'}
                      </span>
                    </td>
                    <td>
                      {g.birth_date ? (
                        g.age_years > 0
                          ? `${g.age_years} yr ${g.age_months % 12} mo`
                          : g.age_months > 0
                            ? `${g.age_months} mo`
                            : `${g.age_days} days`
                      ) : '—'}
                    </td>
                    <td>{g.weight ? `${g.weight} kg` : '—'}</td>
                    <td>
                      <span className={`badge ${g.health === 'Healthy' ? 'badge-green' : g.health === 'Sick' ? 'badge-red' : 'badge-yellow'}`}>
                        {g.health}
                      </span>
                    </td>
                    <td>
                      {g.group_name
                        ? <span style={{
                          fontSize: 12, padding: '2px 10px', borderRadius: 6,
                          background: g.group_color ? g.group_color + '22' : '#F3E5F5',
                          color: g.group_color || '#7B1FA2',
                          fontWeight: 600, border: `1px solid ${g.group_color || '#CE93D8'}`,
                        }}>{g.group_name}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: '#666' }}>
                      {g.mother_code && <span style={{ color: '#880E4F' }}>♀{g.mother_code}</span>}
                      {g.mother_code && g.father_code && ' '}
                      {g.father_code && <span style={{ color: '#1565C0' }}>♂{g.father_code}</span>}
                      {!g.mother_code && !g.father_code && <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ color: '#666', fontSize: 13 }}>{g.added}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {readyToPromote && (
                        <button className="btn btn-sm" title="Promote to Adult"
                          style={{ fontSize: 11, padding: '2px 8px', marginRight: 4, background: '#E8F5E9', color: '#1B5E20', border: '1px solid #4CAF50', borderRadius: 6, cursor: 'pointer' }}
                          onClick={e => openPromote(g, e)}>
                          🎉 Promote
                        </button>
                      )}
                      <button className="btn-icon" title="Edit" onClick={e => openEdit(g, e)}>✏️</button>
                      <button className="btn-icon" title="Delete" onClick={e => remove(g.id, e)}>🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD/EDIT MODAL ── */}
      {modal && (
        <Modal title={edit ? 'Edit Goat' : 'Add New Goat'} onClose={() => setModal(false)} onSave={save}>
          <div className="form-group">
            <label className="form-label">Goat ID * <span style={{ color: '#888', fontWeight: 400, fontSize: 12 }}>(unique, e.g. G-101)</span></label>
            <input className="form-input" placeholder="e.g. G-101" value={form.goat_code} onChange={e => set('goat_code', e.target.value)} />
          </div>
          <div className="form-group">
            <div style={{ display: 'flex', gap: 8 }}></div>
          </div>
          <div className="form-group">
            <label className="form-label">Breed *</label>
            <select className="form-input" value={form.breed}
              onChange={e => { set('breed', e.target.value); if (e.target.value !== 'Other (Custom)') set('customBreed', ''); }}>
              <option value="">-- Select Breed --</option>
              <optgroup label="Standard Indian Breeds">
                {BASE_BREEDS.map(b => <option key={b} value={b}>{b}</option>)}
              </optgroup>
              {customBreeds.length > 0 && (
                <optgroup label="Your Custom Breeds">
                  {customBreeds.map(b => <option key={b} value={b}>{b}</option>)}
                </optgroup>
              )}
              <option value="Other (Custom)">＋ Add New Breed...</option>
            </select>
          </div>
          {form.breed === 'Other (Custom)' && (
            <div className="form-group">
              <label className="form-label">Enter New Breed Name *</label>
              <input className="form-input" placeholder="Type breed name"
                value={form.customBreed} onChange={e => set('customBreed', e.target.value)} autoFocus />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Gender</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Female', 'Male'].map(g => (
                <button key={g} type="button" onClick={() => set('gender', g)}
                  style={{
                    flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
                    border: form.gender === g ? `2px solid ${g === 'Female' ? '#880E4F' : '#1565C0'}` : '2px solid #e0e0e0',
                    background: form.gender === g ? (g === 'Female' ? '#FCE4EC' : '#E3F2FD') : '#fafafa',
                    color: form.gender === g ? (g === 'Female' ? '#880E4F' : '#1565C0') : '#888',
                  }}>
                  {g === 'Female' ? '♀ Female' : '♂ Male'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Birth Date *</label>
              <input className="form-input" type="date" value={form.birth_date || ''} onChange={e => set('birth_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Weight (kg)</label>
              <input className="form-input" type="number" placeholder="35" value={form.weight} onChange={e => set('weight', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Group (optional)</label>
            <select className="form-input" value={form.group_id || ''} onChange={e => set('group_id', e.target.value)}>
              <option value="">-- No Group --</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Health Status</label>
            <select className="form-input" value={form.health} onChange={e => set('health', e.target.value)}>
              <option>Healthy</option>
              <option>Under Treatment</option>
              <option>Sick</option>
            </select>
          </div>
        </Modal>
      )}

      {/* ── PROMOTE MODAL ── */}
      {promoteModal && promoteGoat && (
        <Modal title={`🎉 Promote ${promoteGoat.goat_code} to Adult`} onClose={() => setPromoteModal(false)} onSave={confirmPromote}>
          <div style={{ background: '#E8F5E9', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13 }}>
            <strong>🐐 {promoteGoat.goat_code}</strong> is{' '}
            <strong>
              {promoteGoat.age_years > 0
                ? `${promoteGoat.age_years} yr ${promoteGoat.age_months % 12} mo`
                : `${promoteGoat.age_months} months`}
            </strong>— ready to be an adult goat!
          </div>
          <div style={{ marginBottom: 14, fontSize: 14, color: '#444' }}>
            Promoting will change life_stage from <strong>Kid → Adult</strong> and make this goat available for breeding.
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Gender *</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {['Female', 'Male'].map(g => (
                <button key={g} type="button" onClick={() => setPromoteGender(g)}
                  style={{
                    flex: 1, padding: '11px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
                    border: promoteGender === g ? `2px solid ${g === 'Female' ? '#880E4F' : '#1565C0'}` : '2px solid #e0e0e0',
                    background: promoteGender === g ? (g === 'Female' ? '#FCE4EC' : '#E3F2FD') : '#fafafa',
                    color: promoteGender === g ? (g === 'Female' ? '#880E4F' : '#1565C0') : '#888',
                  }}>
                  {g === 'Female' ? '♀ Female' : '♂ Male'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
            After promotion, this goat will appear in breeding selectors as an {promoteGender} goat.
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}