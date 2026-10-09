import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const API = 'http://localhost:4000/api';

export default function GoatProfile() {
  const { goat_code } = useParams();   // App.js mein route: /goats/:goat_code
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');

fetch(`${API}/goats/${goat_code}/profile?user_id=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return; }
        setData(d);
        setLoading(false);
      })
      .catch(() => { setError('Server se data nahi aaya.'); setLoading(false); });
  }, [goat_code]);

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🐐</div>
      Loading goat profile...
    </div>
  );

  if (error || !data || !data.goat) return (
    <div style={{ padding: 40 }}>
      <button className="btn btn-outline" onClick={() => navigate('/goats')} style={{ marginBottom: 20 }}>← Wapas Goats</button>
      <div style={{ color: '#C62828', background: '#FFEBEE', padding: 20, borderRadius: 12 }}>
        ❌ {error || 'Goat nahi mila.'}
      </div>
    </div>
  );

  const { goat, income, expenses, vaccinations, totalIncome, totalExpense, netProfit } = data;

  return (
    <div>
      {/* Back Button */}
      <button className="btn btn-outline" onClick={() => navigate('/goats')}
        style={{ marginBottom: 20 }}>←Back</button>

      {/* Goat Info Card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2E7D32, #66BB6A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
            flexShrink: 0
          }}>🐐</div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 26, fontWeight: 800, color: '#1B5E20',
                background: '#E8F5E9', padding: '4px 16px', borderRadius: 10,
                letterSpacing: 1
              }}>
                {goat.goat_code}
              </span>
              <span className={`badge ${goat.health_status === 'Healthy' ? 'badge-green' : goat.health_status === 'Sick' ? 'badge-red' : 'badge-yellow'}`}>
                {goat.health_status}
              </span>
            </div>
            <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>
              <span style={{ marginRight: 16 }}>🐾 Breed: <strong>{goat.breed || '—'}</strong></span>
              <span style={{ marginRight: 16 }}>📅 Age: <strong>{goat.age_months !== null
  ? `${goat.age_months} months`: '—'}</strong></span>
              <span>⚖️ Weight: <strong>{goat.weight ? `${goat.weight} kg` : '—'}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="summary-bar" style={{ marginBottom: 20 }}>
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
          <div className="value" style={{ color: netProfit >= 0 ? '#2E7D32' : '#C62828' }}>
            {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Income & Expense Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="section-title">💰 Income</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Source</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                {income.length === 0
                  ? <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 20 }}>No income.</td></tr>
                  : income.map(i => (
                    <tr key={i.id}>
                      <td>{i.source}</td>
                      <td style={{ color: '#2E7D32', fontWeight: 600 }}>+₹{Number(i.amount).toLocaleString()}</td>
                      <td style={{ fontSize: 13, color: '#666' }}>{i.date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="section-title">📉 Expenses</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Type</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                {expenses.length === 0
                  ? <tr><td colSpan={3} style={{ textAlign: 'center', color: '#999', padding: 20 }}>No expenses.</td></tr>
                  : expenses.map(e => (
                    <tr key={e.id}>
                      <td>{e.type}</td>
                      <td style={{ color: '#C62828', fontWeight: 600 }}>-₹{Number(e.amount).toLocaleString()}</td>
                      <td style={{ fontSize: 13, color: '#666' }}>{e.date}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Vaccinations */}
      <div className="card">
        <div className="section-title">💉 Vaccinations</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Vaccine</th><th>Date Given</th><th>Next Due</th><th>Status</th></tr>
            </thead>
            <tbody>
              {vaccinations.length === 0
                ? <tr><td colSpan={4} style={{ textAlign: 'center', color: '#999', padding: 20 }}>No vaccination record available.</td></tr>
                : vaccinations.map(v => (
                  <tr key={v.id}>
                    <td>{v.vaccine_name}</td>
                    <td style={{ fontSize: 13 }}>{v.given || '-'}</td>
                    <td style={{ fontSize: 13, color: v.status === 'Overdue' ? '#C62828' : '#555' }}>{v.nextDue || '-'}</td>
                    <td>
                      <span className={`badge ${v.status === 'Done' ? 'badge-green' : v.status === 'Overdue' ? 'badge-red' : 'badge-yellow'}`}>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}