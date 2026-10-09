import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, CartesianGrid
} from 'recharts';

const COLORS = ['#4CAF50','#FF9800','#2196F3','#E91E63','#9C27B0','#FFC107'];
const API = 'http://localhost:4000/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [goats, setGoats] = useState([]);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const uid = user.id || 1;
    Promise.all([
      fetch(`${API}/goats?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/income?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/expenses?user_id=${uid}`).then(r => r.json()),
      fetch(`${API}/dashboard/stats?user_id=${uid}`).then(r => r.json()),
    ]).then(([g, inc, exp, st]) => {
      setGoats(Array.isArray(g) ? g : []);
      setIncome(Array.isArray(inc) ? inc : []);
      setExpenses(Array.isArray(exp) ? exp : []);
      setStats(st);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netProfit = totalIncome - totalExpense;

  const adultGoats = goats.filter(g => g.life_stage === 'Adult' || !g.life_stage);
  const kidGoats = goats.filter(g => g.life_stage === 'Kid');

  const breedMap = {};
  adultGoats.forEach(g => { breedMap[g.breed] = (breedMap[g.breed] || 0) + 1; });
  const breedData = Object.entries(breedMap).map(([name, value]) => ({ name, value }));

  const allMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthMap = {};
  allMonths.forEach(m => { monthMap[m] = { month: m, income: 0, expense: 0 }; });
  income.forEach(i => {
    const m = new Date(i.date).toLocaleString('default', { month: 'short' });
    if (monthMap[m]) monthMap[m].income += Number(i.amount);
  });
  expenses.forEach(e => {
    const m = new Date(e.date).toLocaleString('default', { month: 'short' });
    if (monthMap[m]) monthMap[m].expense += Number(e.amount);
  });
  const chartData = allMonths.map(m => monthMap[m]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toISOString().slice(0, 10);
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr); d.setHours(0,0,0,0);
    return Math.round((d - today) / 86400000);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading dashboard...</div>;

  return (
    <div>
      {/* ── ALERT BANNERS ── */}

      {/* Promote alerts */}
      {stats?.promoteAlerts?.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg,#E8F5E9,#C8E6C9)',
          border: '1.5px solid #4CAF50', borderRadius: 12,
          padding: '14px 20px', marginBottom: 16,
          boxShadow: '0 2px 8px rgba(76,175,80,0.15)'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:22 }}>🎉</span>
            <strong style={{ color:'#1B5E20', fontSize:15 }}>
              {stats.promoteAlerts.length} Kid{stats.promoteAlerts.length > 1 ? 's' : ''} Ready to Promote!
            </strong>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {stats.promoteAlerts.map(k => (
              <div key={k.id} style={{
                background:'rgba(255,255,255,0.7)', borderRadius:8,
                padding:'6px 14px', fontSize:13, display:'flex', alignItems:'center', gap:10
              }}>
                <span style={{ fontWeight:700, color:'#1B5E20' }}>🐐 {k.goat_code}</span>
                <span style={{ color:'#555' }}>{k.age_months} months old</span>
                <button
                  className="btn btn-sm btn-primary"
                  style={{ fontSize:11, padding:'2px 10px' }}
                  onClick={() => navigate(`/goats/${k.goat_code}`)}
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaning alerts */}
      {stats?.weaningAlerts?.length > 0 && (
        <div style={{
          background:'linear-gradient(135deg,#FFF3E0,#FFE0B2)',
          border:'1.5px solid #FF9800', borderRadius:12,
          padding:'14px 20px', marginBottom:16,
          boxShadow:'0 2px 8px rgba(255,152,0,0.15)'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:22 }}>🍼</span>
            <strong style={{ color:'#E65100', fontSize:15 }}>
              Weaning Due This Week ({stats.weaningAlerts.length})
            </strong>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {stats.weaningAlerts.map(k => {
              const days = Number(k.days_left);
              return (
                <div key={k.id} style={{
                  background:'rgba(255,255,255,0.7)', borderRadius:8,
                  padding:'6px 14px', fontSize:13, display:'flex', alignItems:'center', gap:10
                }}>
                  <span style={{ fontWeight:700, color:'#E65100' }}>🐐 {k.goat_code}</span>
                  <span style={{ color:'#555' }}>
                    {days <= 0 ? '⚠️ Overdue!' : `In ${days} day${days !== 1 ? 's' : ''}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TOP STATS ── */}
      <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#E8F5E9' }}>🐐</div>
          <div className="stat-label">Adult Goats</div>
          <div className="stat-value" style={{ color:'#2E7D32' }}>{adultGoats.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#F3E5F5' }}>🐣</div>
          <div className="stat-label">Kids / Juveniles</div>
          <div className="stat-value" style={{ color:'#7B1FA2' }}>{kidGoats.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#E8F5E9' }}>📈</div>
          <div className="stat-label">Total Income</div>
          <div className="stat-value" style={{ color:'#2E7D32' }}>₹{totalIncome.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#FFEBEE' }}>📉</div>
          <div className="stat-label">Total Expenses</div>
          <div className="stat-value" style={{ color:'#C62828' }}>₹{totalExpense.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: netProfit >= 0 ? '#E8F5E9' : '#FFEBEE' }}>💰</div>
          <div className="stat-label">Net Profit / Loss</div>
          <div className="stat-value" style={{ color: netProfit >= 0 ? '#2E7D32' : '#C62828' }}>
            {netProfit >= 0 ? '+' : ''}₹{netProfit.toLocaleString()}
          </div>
        </div>
        <div className="stat-card" style={{ cursor:'pointer' }} onClick={() => navigate('/vaccinations')}>
          <div className="stat-icon" style={{ background:'#FFF8E1' }}>💉</div>
          <div className="stat-label">Vaccinations This Week</div>
          <div className="stat-value" style={{ color: (stats?.vaccinationsDueCount || 0) > 0 ? '#E65100' : '#2E7D32' }}>
            {stats?.vaccinationsDueCount || 0}
          </div>
        </div>
        <div className="stat-card">
         
 <div
  className="stat-card"
  style={{ cursor:'pointer' }}
  onClick={() => navigate('/breeding')}
>
  <div className="stat-icon" style={{ background:'#FCE4EC' }}>🤰</div>

  <div className="stat-label">Pregnant Goats</div>

  <div className="stat-value" style={{ color:'#AD1457' }}>
    {stats?.pregnantCount ?? 0}
  </div>
</div> 
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background:'#E3F2FD' }}>🍼</div>
          <div className="stat-label">Kids Born This Month</div>
          <div className="stat-value" style={{ color:'#1565C0' }}>{stats?.kidsThisMonth || 0}</div>
        </div>
      </div>

      

      {/* ── CHARTS ── */}
      <div className="charts-row">
        <div className="card">
          <div className="section-title">Monthly Income vs Expenses</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill:'#777', fontSize:12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill:'#777', fontSize:12 }} tickFormatter={v => `₹${v/1000}k`} />
              <Tooltip contentStyle={{ borderRadius:'12px', border:'none', boxShadow:'0 6px 20px rgba(0,0,0,0.15)' }} formatter={v => `₹${v.toLocaleString()}`} />
              <Legend iconType="circle" />
              <Bar dataKey="income" fill="#43A047" radius={[8,8,0,0]} name="Income" />
              <Bar dataKey="expense" fill="#E53935" radius={[8,8,0,0]} name="Expense" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <div className="section-title">Breed Distribution</div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={breedData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value">
                {breedData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize:16, fontWeight:'bold' }}>
                {adultGoats.length} Adults
              </text>
              <Tooltip contentStyle={{ borderRadius:'10px', border:'none', boxShadow:'0 4px 15px rgba(0,0,0,0.1)' }} />
              <Legend verticalAlign="bottom" iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── RECENTLY ADDED GOATS ── */}
      <div className="card">
        <div className="section-title">Recently Added Goats</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Goat Code</th><th>Breed</th><th>Stage</th>
                <th>Age</th><th>Weight</th><th>Status</th><th>Added</th>
              </tr>
            </thead>
            <tbody>
              {goats.slice(0, 6).map(g => (
                <tr key={g.id} onClick={() => navigate(`/goats/${g.goat_code}`)}
                  style={{ cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background='#f0f7f0'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}
                >
                  <td>
                    <span style={{ fontWeight:700, color:'#2E7D32', background:'#E8F5E9', padding:'3px 10px', borderRadius:6, fontSize:13 }}>
                      {g.goat_code}
                    </span>
                  </td>
                  <td>{g.breed}</td>
                  <td>
                    <span style={{
                      fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:6,
                      background: g.life_stage === 'Kid' ? '#F3E5F5' : '#E8F5E9',
                      color: g.life_stage === 'Kid' ? '#7B1FA2' : '#1B5E20',
                    }}>
                      {g.life_stage || 'Adult'}
                    </span>
                  </td>
                  <td>{g.age_months ? `${g.age_months} mo` : '—'}</td>
                  <td>{g.weight ? `${g.weight} kg` : '—'}</td>
                  <td>
                    <span className={`badge ${g.health === 'Healthy' ? 'badge-green' : g.health === 'Sick' ? 'badge-red' : 'badge-yellow'}`}>
                      {g.health || '—'}
                    </span>
                  </td>
                  <td style={{ color:'#666', fontSize:13 }}>{formatDate(g.added)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}