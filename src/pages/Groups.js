import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const API = 'http://localhost:4000/api';

const GROUP_COLORS = [
  '#4CAF50','#2196F3','#FF9800','#E91E63',
  '#9C27B0','#00BCD4','#F44336','#795548',
];

const blank = { name: '', description: '', color: '#4CAF50' };

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [groupGoats, setGroupGoats] = useState({});
  const [groupFinance, setGroupFinance] = useState({});
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const uid = user.id || 1;

  useEffect(() => {
    fetch(`${API}/groups?user_id=${uid}`)
      .then(r => r.json())
      .then(data => { setGroups(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setToast({ msg: 'Failed to load groups', type: 'error' }); setLoading(false); });
  }, []);

  const toggleExpand = async (gid) => {
    if (expandedId === gid) { setExpandedId(null); return; }
    setExpandedId(gid);
    if (!groupGoats[gid]) {
      const [goatsRes, finRes] = await Promise.all([
        fetch(`${API}/groups/${gid}/goats?user_id=${uid}`).then(r => r.json()),
        fetch(`${API}/groups/${gid}/finance?user_id=${uid}`).then(r => r.json()),
      ]);
      setGroupGoats(p => ({ ...p, [gid]: goatsRes }));
      setGroupFinance(p => ({ ...p, [gid]: finRes }));
    }
  };

  const openAdd = () => { setEditId(null); setForm(blank); setModal(true); };
  const openEdit = (g) => {
    setEditId(g.id);
    setForm({ name: g.name, description: g.description || '', color: g.color || '#4CAF50' });
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setToast({ msg: 'Group name required', type: 'error' }); return; }
    try {
      if (editId) {
        const res = await fetch(`${API}/groups/${editId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const data = await res.json();
        if (!res.ok) { setToast({ msg: data.error || 'Update failed', type: 'error' }); return; }
        setGroups(gs => gs.map(g => g.id === editId ? { ...g, ...form } : g));
        setToast({ msg: 'Group updated!', type: 'success' });
      } else {
        const res = await fetch(`${API}/groups`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, user_id: uid }),
        });
        const data = await res.json();
        if (!res.ok) { setToast({ msg: data.error || 'Failed to add', type: 'error' }); return; }
        setGroups(gs => [...gs, data]);
        setToast({ msg: 'Group created!', type: 'success' });
      }
      setModal(false);
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this group? Goats will be unlinked but not deleted.')) return;
    const res = await fetch(`${API}/groups/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setGroups(gs => gs.filter(g => g.id !== id));
      setToast({ msg: 'Group deleted.', type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading groups...</div>;

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Goat Groups ({groups.length})</span>
        <button className="btn btn-primary" onClick={openAdd}>+ New Group</button>
      </div>

      {groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🐐</div>
            <p>No groups yet. Create a group to organise your goats.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.map(g => (
            <div key={g.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header row */}
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 20px', cursor: 'pointer',
                  borderLeft: `5px solid ${g.color || '#4CAF50'}`,
                }}
                onClick={() => toggleExpand(g.id)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: g.color || '#4CAF50',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                }}>
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{g.name}</div>
                  {g.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{g.description}</div>}
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 600, background: '#E8F5E9', color: '#1B5E20',
                  padding: '3px 12px', borderRadius: 20,
                }}>
                  🐐 {g.goat_count} goat{g.goat_count !== 1 ? 's' : ''}
                </span>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(g); }}>✏️</button>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); remove(g.id); }}>🗑️</button>
                <span style={{ color: '#aaa', fontSize: 18 }}>{expandedId === g.id ? '▲' : '▼'}</span>
              </div>

              {/* Expanded detail */}
              {expandedId === g.id && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f0f0f0' }}>
                  {/* Finance summary */}
                  {groupFinance[g.id] && (
                    <div style={{ display: 'flex', gap: 16, margin: '14px 0 12px', flexWrap: 'wrap' }}>
                      <div style={{ background: '#E8F5E9', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                        💰 Income: <strong style={{ color: '#2E7D32' }}>₹{groupFinance[g.id].totalIncome.toLocaleString()}</strong>
                      </div>
                      <div style={{ background: '#FFEBEE', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                        📉 Expenses: <strong style={{ color: '#C62828' }}>₹{groupFinance[g.id].totalExpense.toLocaleString()}</strong>
                      </div>
                      <div style={{ background: '#F3F4F6', borderRadius: 8, padding: '8px 16px', fontSize: 13 }}>
                        Net: <strong style={{ color: groupFinance[g.id].net >= 0 ? '#2E7D32' : '#C62828' }}>
                          {groupFinance[g.id].net >= 0 ? '+' : ''}₹{groupFinance[g.id].net.toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  )}

                  {/* Goats list — CLICKABLE */}
                  {groupGoats[g.id] && (
                    groupGoats[g.id].length === 0 ? (
                      <div style={{ color: '#aaa', fontSize: 13, padding: '8px 0' }}>No goats in this group yet.</div>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {groupGoats[g.id].map(gt => (
                          <span
                            key={gt.id}
                            onClick={() => navigate(`/goats/${gt.goat_code}`)}
                            style={{
                              background: '#F5F5F5', borderRadius: 6, padding: '4px 12px',
                              fontSize: 13, fontWeight: 600, color: '#2E7D32',
                              border: '1px solid #e0e0e0', cursor: 'pointer',
                              textDecoration: 'none',  // ✅ underline removed
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#E8F5E9'}
                            onMouseLeave={e => e.currentTarget.style.background = '#F5F5F5'}
                          >
                            🐐 {gt.goat_code}
                            <span style={{ color: '#888', fontWeight: 400, marginLeft: 6 }}>{gt.breed}</span>
                          </span>
                        ))}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          title={editId ? 'Edit Group' : 'Create New Group'}
          onClose={() => setModal(false)}
          onSave={save}
        >
          <div className="form-group">
            <label className="form-label">Group Name *</label>
            <input
              className="form-input"
              placeholder="e.g. Milking Does, Breeders, Kids Batch 2026"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (optional)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="What is this group for?"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Group Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {GROUP_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => set('color', c)}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: form.color === c ? '3px solid #333' : '3px solid transparent',
                    boxSizing: 'border-box', transition: 'border 0.1s',
                  }}
                />
              ))}
            </div>
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}