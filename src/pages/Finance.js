import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const API = 'http://localhost:4000/api';

// ── Searchable Goat Dropdown ──────────────────────────────
function SearchableGoatSelect({ goats, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  const selected = goats.find(g => String(g.id) === String(value));

  const filtered = goats.filter(g => {
    const q = query.toLowerCase();
    return (
      g.goat_code.toLowerCase().includes(q) ||
      (g.breed && g.breed.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => { setOpen(o => !o); setQuery(''); }}
        style={{
          padding: '10px 14px',
          border: open ? '1.5px solid #2E7D32' : '1.5px solid #e0e0e0',
          borderRadius: 8,
          background: '#fff',
          cursor: 'pointer',
          fontSize: 14,
          color: selected ? '#222' : '#aaa',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          userSelect: 'none',
          transition: 'border 0.15s',
        }}
      >
        <span>
          {selected
            ? <><strong style={{ color: '#2E7D32' }}>{selected.goat_code}</strong> ({selected.breed})</>
            : '-- Select Goat Id --'}
        </span>
        <span style={{ color: '#aaa', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          right: 0,
          background: '#fff',
          border: '1.5px solid #e0e0e0',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
            <input
              autoFocus
              placeholder="🔍 Search by Goat ID or Breed..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1.5px solid #e0e0e0',
                borderRadius: 6,
                fontSize: 13,
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            <div
              onClick={() => { onChange(''); setOpen(false); }}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                color: '#aaa',
                cursor: 'pointer',
                background: !value ? '#f5f5f5' : '#fff',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = !value ? '#f5f5f5' : '#fff'}
            >
              -- No Goat Selected --
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: 13, color: '#999', textAlign: 'center' }}>
                No goats found
              </div>
            ) : filtered.map(g => (
              <div
                key={g.id}
                onClick={() => { onChange(g.id); setOpen(false); setQuery(''); }}
                style={{
                  padding: '10px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: String(value) === String(g.id) ? '#E8F5E9' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  borderBottom: '1px solid #f5f5f5',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => {
                  if (String(value) !== String(g.id)) e.currentTarget.style.background = '#f9f9f9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = String(value) === String(g.id) ? '#E8F5E9' : '#fff';
                }}
              >
                <span style={{
                  fontWeight: 700,
                  color: '#2E7D32',
                  background: '#E8F5E9',
                  padding: '2px 8px',
                  borderRadius: 5,
                  fontSize: 12,
                }}>
                  {g.goat_code}
                </span>
                <span style={{ color: '#555' }}>{g.breed}</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: g.gender === 'Male' ? '#1565C0' : '#880E4F',
                  background: g.gender === 'Male' ? '#E3F2FD' : '#FCE4EC',
                  padding: '1px 7px',
                  borderRadius: 4,
                }}>
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

export default function Finance() {
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [goats, setGoats] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ entryType: 'income' });
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('All');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    const uid = u.id || 1;
    Promise.all([
      fetch(`${API}/goats?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/income?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/expenses?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/groups?user_id=${uid}`).then(r => r.json()),
    ]).then(([g, inc, exp, grp]) => {
      setGoats(g);
      setIncome(inc);
      setExpenses(exp);
      setGroups(Array.isArray(grp) ? grp : []);
      setLoading(false);
    }).catch(() => {
      setToast({ msg: 'Failed to load data', type: 'error' });
      setLoading(false);
    });
  }, []);

  const totalIncome = income.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const net = totalIncome - totalExpense;

  const allRows = [
    ...income.map(i => ({ ...i, entryType: 'income', description: i.source })),
    ...expenses.map(e => ({ ...e, entryType: 'expense', description: e.type })),
  ];

  const filteredRows = allRows.filter(r => {
    const matchType =
      filterType === 'All' ||
      (filterType === 'Income' && r.entryType === 'income') ||
      (filterType === 'Expense' && r.entryType === 'expense');
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      (r.goat && r.goat.toLowerCase().includes(q)) ||
      (r.description && r.description.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === 'amount') { av = Number(av); bv = Number(bv); }
    if (sortField === 'date') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const sortIcon = (field) => {
    if (sortField !== field) return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const openAdd = (defaultType = 'income') => {
    setEditId(null); setEditType(null);
    setForm({ entryType: defaultType });
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id); setEditType(row.entryType);
    if (row.entryType === 'income') {
      setForm({ entryType: 'income', goat_id: row.goat_id || '', source: row.source, amount: row.amount, date: row.date, group_id: row.group_id || '' });
    } else {
      setForm({ entryType: 'expense', goat_id: row.goat_id || '', type: row.type, category: row.category, amount: row.amount, date: row.date, group_id: row.group_id || '' });
    }
    setModal(true);
  };

  const save = async () => {
    if (!form.amount) { setToast({ msg: 'Amount required hai', type: 'error' }); return; }
    try {
      const today = new Date().toISOString().slice(0, 10);

      if (form.entryType === 'income') {
        if (!form.source) { setToast({ msg: 'Source required hai', type: 'error' }); return; }
        const body = { goat_id: form.goat_id || null, source: form.source, amount: Number(form.amount), date: form.date || today, user_id: user.id || 1, group_id: form.group_id || null };

        if (editId && editType === 'income') {
          const res = await fetch(`${API}/income/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) { const d = await res.json(); setToast({ msg: d.error || 'Update failed', type: 'error' }); return; }
          const goat = goats.find(g => String(g.id) === String(form.goat_id));
          const grp = groups.find(g => String(g.id) === String(form.group_id));
          setIncome(l => l.map(i => i.id === editId ? { ...i, ...body, goat: goat?.goat_code || null, group_name: grp?.name || null } : i));
          setToast({ msg: 'Income updated!', type: 'success' });
        } else {
          const res = await fetch(`${API}/income`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await res.json();
          if (!res.ok) { setToast({ msg: data.error || 'Failed to add', type: 'error' }); return; }
          const goat = goats.find(g => String(g.id) === String(form.goat_id));
          const grp = groups.find(g => String(g.id) === String(form.group_id));
          setIncome(l => [{ ...data, goat: goat?.goat_code || null, group_name: grp?.name || null }, ...l]);
          setToast({ msg: 'Income added!', type: 'success' });
        }

      } else {
        if (!form.type) { setToast({ msg: 'Description required ', type: 'error' }); return; }
        const body = { goat_id: form.goat_id || null, type: form.type, category: form.category || 'Feed', amount: Number(form.amount), date: form.date || today, user_id: user.id || 1, group_id: form.group_id || null };

        if (editId && editType === 'expense') {
          const res = await fetch(`${API}/expenses/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) { const d = await res.json(); setToast({ msg: d.error || 'Update failed', type: 'error' }); return; }
          const goat = goats.find(g => String(g.id) === String(form.goat_id));
          const grp = groups.find(g => String(g.id) === String(form.group_id));
          setExpenses(l => l.map(e => e.id === editId ? { ...e, ...body, goat: goat?.goat_code || null, group_name: grp?.name || null } : e));
          setToast({ msg: 'Expense updated!', type: 'success' });
        } else {
          const res = await fetch(`${API}/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
          const data = await res.json();
          if (!res.ok) { setToast({ msg: data.error || 'Failed to add', type: 'error' }); return; }
          const goat = goats.find(g => String(g.id) === String(form.goat_id));
          const grp = groups.find(g => String(g.id) === String(form.group_id));
          setExpenses(l => [{ ...data, goat: goat?.goat_code || null, group_name: grp?.name || null }, ...l]);
          setToast({ msg: 'Expense added!', type: 'success' });
        }
      }

      setModal(false); setEditId(null); setEditType(null);
    } catch {
      setToast({ msg: 'Server error. Is backend running?', type: 'error' });
    }
  };

  const remove = async (row) => {
    if (!window.confirm(`Delete this ${row.entryType} record?`)) return;
    const url = row.entryType === 'income' ? `${API}/income/${row.id}` : `${API}/expenses/${row.id}`;
    const res = await fetch(url, { method: 'DELETE' });
    if (res.ok) {
      if (row.entryType === 'income') setIncome(l => l.filter(i => i.id !== row.id));
      else setExpenses(l => l.filter(e => e.id !== row.id));
      setToast({ msg: 'Record deleted.', type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading finance data...</div>;

  return (
    <div>
      {/* Summary */}
      <div className="summary-bar">
        <div className="summary-item">
          <div className="label">Total Income</div>
          <div className="value" style={{ color: '#2E7D32' }}>₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="summary-item">
          <div className="label">Total Expenses</div>
          <div className="value" style={{ color: '#C62828' }}>₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="summary-item">
          <div className="label">Net Profit / Loss</div>
          <div className="value" style={{ color: net >= 0 ? '#2E7D32' : '#C62828' }}>
            {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter + Search + Add buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {['All', 'Income', 'Expense'].map(f => (
            <button key={f} onClick={() => setFilterType(f)}
              className={`btn btn-sm ${filterType === f ? 'btn-primary' : 'btn-outline'}`}>
              {f === 'All' ? `All (${allRows.length})` : f === 'Income' ? `Income (${income.length})` : `Expense (${expenses.length})`}
            </button>
          ))}
          <input
            style={{
              padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e0e0e0',
              fontSize: 13, outline: 'none', width: 220, fontFamily: 'inherit',
              background: '#fafafa'
            }}
            placeholder="🔍 Search Goat ID"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-sm btn-outline" onClick={() => openAdd('expense')}
            style={{ borderColor: '#C62828', color: '#C62828' }}>+ Add Expense</button>
          <button className="btn btn-primary btn-sm" onClick={() => openAdd('income')}>+ Add Income</button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Type</th>
                <th>Goat ID</th>
                <th onClick={() => handleSort('description')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Description {sortIcon('description')}
                </th>
                <th>Category</th>
                <th>Group</th>
                <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Amount {sortIcon('amount')}
                </th>
                <th onClick={() => handleSort('date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Date {sortIcon('date')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><div className="empty-icon">💰</div><p>No records found</p></div></td></tr>
              ) : sortedRows.map((row, i) => (
                <tr key={`${row.entryType}-${row.id}`}>
                  <td style={{ color: '#999', fontSize: 13 }}>{i + 1}</td>
                  <td>
                    <span className={`badge ${row.entryType === 'income' ? 'badge-green' : 'badge-red'}`}
                      style={{ minWidth: 70, textAlign: 'center', display: 'inline-block' }}>
                      {row.entryType === 'income' ? '↑ Income' : '↓ Expense'}
                    </span>
                  </td>
                  <td>
                    {row.goat
                      ? <span
                          onClick={() => navigate(`/goats/${row.goat}`)}
                          style={{
                            fontWeight: 700, color: '#2E7D32', background: '#E8F5E9',
                            padding: '2px 10px', borderRadius: 6, fontSize: 13,
                            cursor: 'pointer', textDecoration: 'none',  // ✅ underline removed
                          }}
                        >{row.goat}</span>
                      : <span style={{ color: '#bbb' }}>—</span>}
                  </td>
                  <td><strong>{row.description}</strong></td>
                  <td>
                    {row.entryType === 'expense'
                      ? <span className="badge badge-gray">{row.category}</span>
                      : <span style={{ color: '#bbb', fontSize: 12 }}>—</span>}
                  </td>
                  <td>
                    {row.group_name
                      ? <span style={{
                          fontSize: 12, padding: '2px 10px', borderRadius: 6, fontWeight: 600,
                          background: row.group_color ? row.group_color + '22' : '#F3E5F5',
                          color: row.group_color || '#7B1FA2',
                          border: `1px solid ${row.group_color || '#CE93D8'}`,
                        }}>{row.group_name}</span>
                      : <span style={{ color: '#ccc' }}>—</span>}
                  </td>
                  <td style={{ fontWeight: 600, color: row.entryType === 'income' ? '#2E7D32' : '#C62828' }}>
                    {row.entryType === 'income' ? '+' : '-'}₹{Number(row.amount).toLocaleString()}
                  </td>
                  <td style={{ color: '#666', fontSize: 13 }}>{row.date}</td>
                  <td>
                    <button className="btn-icon" onClick={() => openEdit(row)}>✏️</button>
                    <button className="btn-icon" onClick={() => remove(row)}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <Modal
          title={editId ? `Edit ${form.entryType === 'income' ? 'Income' : 'Expense'}` : 'Add Record'}
          onClose={() => { setModal(false); setEditId(null); setEditType(null); }}
          onSave={save}
        >
          {!editId && (
            <div className="form-group">
              <label className="form-label">Record Type *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['income', 'expense'].map(t => (
                  <button key={t} type="button" onClick={() => set('entryType', t)}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
                      fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                      border: form.entryType === t ? `2px solid ${t === 'income' ? '#2E7D32' : '#C62828'}` : '2px solid #e0e0e0',
                      background: form.entryType === t ? (t === 'income' ? '#E8F5E9' : '#FFEBEE') : '#fafafa',
                      color: form.entryType === t ? (t === 'income' ? '#2E7D32' : '#C62828') : '#888',
                    }}>
                    {t === 'income' ? '↑ Income' : '↓ Expense'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Searchable Goat Dropdown */}
          <div className="form-group">
            <label className="form-label">Goat ID (Optional)</label>
            <SearchableGoatSelect
              goats={goats}
              value={form.goat_id || ''}
              onChange={val => set('goat_id', val)}
            />
            {form.goat_id && (() => {
              const selected = goats.find(g => String(g.id) === String(form.goat_id));
              return selected ? (
                <div style={{ marginTop: 6, fontSize: 12, color: '#555', background: '#F1F8E9', padding: '5px 10px', borderRadius: 6 }}>
                  🐐 Goat ID: <strong>{selected.goat_code}</strong> &nbsp;|&nbsp; Breed: {selected.breed} &nbsp;|&nbsp; Health: {selected.health}
                </div>
              ) : null;
            })()}
          </div>

          <div className="form-group">
            <label className="form-label">Group (optional)</label>
            <select className="form-input" value={form.group_id || ''} onChange={e => set('group_id', e.target.value)}>
              <option value="">-- No Group --</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {form.entryType === 'income' && (
            <div className="form-group">
              <label className="form-label">Source *</label>
              <input className="form-input" placeholder="e.g. Milk Sale"
                value={form.source || ''} onChange={e => set('source', e.target.value)} />
            </div>
          )}

          {form.entryType === 'expense' && (
            <>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <input className="form-input" placeholder="e.g. Feed Purchase"
                  value={form.type || ''} onChange={e => set('type', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category || 'Feed'} onChange={e => set('category', e.target.value)}>
                  <option>Feed</option>
                  <option>Medical</option>
                  <option>Labour</option>
                  <option>Equipment</option>
                  <option>Other</option>
                </select>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Amount (₹) *</label>
            <input className="form-input" type="number" placeholder="e.g. 5000"
              value={form.amount || ''} onChange={e => set('amount', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date"
              value={form.date || ''} onChange={e => set('date', e.target.value)} />
          </div>
        </Modal>
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}