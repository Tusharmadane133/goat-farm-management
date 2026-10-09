import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:4000/api';

const COUNTRY_CODES = [
  { code: '+91',  flag: '🇮🇳', name: 'India' },
  { code: '+1',   flag: '🇺🇸', name: 'USA' },
  { code: '+44',  flag: '🇬🇧', name: 'UK' },
  { code: '+61',  flag: '🇦🇺', name: 'Australia' },
  { code: '+971', flag: '🇦🇪', name: 'UAE' },
  { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  { code: '+92',  flag: '🇵🇰', name: 'Pakistan' },
  { code: '+880', flag: '🇧🇩', name: 'Bangladesh' },
  { code: '+94',  flag: '🇱🇰', name: 'Sri Lanka' },
  { code: '+977', flag: '🇳🇵', name: 'Nepal' },
  { code: '+60',  flag: '🇲🇾', name: 'Malaysia' },
  { code: '+65',  flag: '🇸🇬', name: 'Singapore' },
  { code: '+49',  flag: '🇩🇪', name: 'Germany' },
  { code: '+33',  flag: '🇫🇷', name: 'France' },
  { code: '+86',  flag: '🇨🇳', name: 'China' },
];

const PASSWORD_RULES = [
  { id: 'len',     label: 'At least 8 characters',          test: pw => pw.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',      test: pw => /[A-Z]/.test(pw) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',      test: pw => /[a-z]/.test(pw) },
  { id: 'number',  label: 'One number (0-9)',                test: pw => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (!@#$...)', test: pw => /[^A-Za-z0-9]/.test(pw) },
];

function isStrongPassword(pw) {
  return PASSWORD_RULES.every(r => r.test(pw));
}

function getStrength(pw) {
  if (!pw) return null;
  const passed = PASSWORD_RULES.filter(r => r.test(pw)).length;
  if (passed <= 1) return { label: 'Too weak', color: '#C62828', pct: '20%' };
  if (passed === 2) return { label: 'Weak',     color: '#FF9800', pct: '40%' };
  if (passed === 3) return { label: 'Fair',     color: '#FDD835', pct: '60%' };
  if (passed === 4) return { label: 'Good',     color: '#8BC34A', pct: '80%' };
  return               { label: 'Strong ✓',  color: '#2E7D32', pct: '100%' };
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder, onKeyDown }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        className="form-input"
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        style={{ paddingRight: 40 }}
      />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4, display: 'flex', alignItems: 'center' }}
        tabIndex={-1}>
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

function PasswordRules({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'A-Z',      ok: /[A-Z]/.test(password) },
    { label: 'a-z',      ok: /[a-z]/.test(password) },
    { label: '0-9',      ok: /[0-9]/.test(password) },
    { label: '!@#$',     ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
      {checks.map((c, i) => (
        <span key={i} style={{ fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: c.ok ? '#E8F5E9' : '#FFEBEE', color: c.ok ? '#2E7D32' : '#C62828', border: `1px solid ${c.ok ? '#A5D6A7' : '#FFCDD2'}` }}>
          {c.ok ? '✓' : '✗'} {c.label}
        </span>
      ))}
    </div>
  );
}

function PhoneInput({ countryCode, onCountryChange, phone, onPhoneChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select className="form-input" value={countryCode} onChange={e => onCountryChange(e.target.value)}
        style={{ width: 140, flexShrink: 0, cursor: 'pointer', fontSize: 13 }}>
        {COUNTRY_CODES.map(c => (
          <option key={c.code} value={c.code}>{c.flag} {c.code} {c.name}</option>
        ))}
      </select>
      <input className="form-input" value={phone} placeholder="e.g. 9876543210" maxLength={15} style={{ flex: 1 }}
        onChange={e => onPhoneChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  );
}

export default function Login() {
  const [tab, setTab] = useState('login');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({ name: '', email: '', password: '', confirm: '', farm_name: '' });
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassRules, setShowPassRules] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const setLogin = (k, v) => setLoginForm(f => ({ ...f, [k]: v }));
  const setReg   = (k, v) => setRegForm(f => ({ ...f, [k]: v }));

  const handleLogin = async () => {
    if (!loginForm.email || !loginForm.password) return setError('Please fill in all fields.');
    if (!loginForm.email.includes('@')) return setError('Enter a valid email.');
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginForm.email, password: loginForm.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed.'); setLoading(false); return; }
      localStorage.setItem('user', JSON.stringify(data));
      window.dispatchEvent(new Event('userUpdated'));
      navigate('/dashboard');
    } catch {
      setError('Server error. Is the backend running?');
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setSubmitted(true); // ← pehle submitted true karo taaki validation highlight ho
    if (!regForm.name || !regForm.email || !regForm.password || !regForm.confirm || !regForm.farm_name.trim())
      return setError('Please fill in all fields including Farm Name.');
    if (!regForm.email.includes('@')) return setError('Enter a valid email address.');
    if (!phoneNumber || phoneNumber.length < 7) return setError('Enter a valid phone number.');
    if (!isStrongPassword(regForm.password)) {
      setShowPassRules(true);
      return setError('Password does not meet strength requirements.');
    }
    if (regForm.password !== regForm.confirm) return setError('Passwords do not match.');

    setError(''); setLoading(true);
    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      const res = await fetch(`${API}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regForm.name,
          email: regForm.email,
          password: regForm.password,
          phone: fullPhone,
          role: 'farmer',
          farm_name: regForm.farm_name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return; }
      setLoading(false);
      setSuccess('Account registered successfully! Please login.');
      setRegForm({ name: '', email: regForm.email, password: '', confirm: '', farm_name: '' });
      setPhoneNumber('');
      setShowPassRules(false);
      setSubmitted(false);
      setTab('login');
    } catch {
      setError('Server error. Is the backend running?');
      setLoading(false);
    }
  };

  const strength = getStrength(regForm.password);
  const passStrong = isStrongPassword(regForm.password);

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-logo">
          <div className="icon">🐐</div>
          <h1>GoatFarm Pro</h1>
          <p>Farm Management System</p>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: '#f4f4f4', borderRadius: 8, padding: 4 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => {
              setTab(t);
              setError('');
              setSuccess('');
              setShowPassRules(false);
              setSubmitted(false); // ← tab switch hone par reset
            }}
              style={{ flex: 1, padding: '8px', border: 'none', cursor: 'pointer', borderRadius: 6, fontWeight: 500, fontSize: 14, fontFamily: 'inherit', background: tab === t ? '#fff' : 'transparent', color: tab === t ? '#2E7D32' : '#666', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
              {t === 'login' ? 'Login' : 'Register'}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#FFEBEE', color: '#C62828', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: '#E8F5E9', color: '#2E7D32', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 13, fontWeight: 500 }}>
            ✅ {success}
          </div>
        )}

        {/* ── LOGIN FORM ── */}
        {tab === 'login' && (
          <>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={loginForm.email} onChange={e => setLogin('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput
                value={loginForm.password}
                onChange={e => setLogin('password', e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px' }}
              onClick={handleLogin} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </>
        )}

        {/* ── REGISTER FORM ── */}
        {tab === 'register' && (
          <>
            {/* Full Name */}
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" placeholder="Rahul Patil"
                value={regForm.name} onChange={e => setReg('name', e.target.value)} />
            </div>

            {/* Farm Name — REQUIRED */}
            <div className="form-group">
              <label className="form-label">
                🏡 Farm Name *
              </label>
              <input
                className="form-input"
                placeholder="e.g. Patil Goat Farm"
                value={regForm.farm_name}
                onChange={e => setReg('farm_name', e.target.value)}
                style={{
                  borderColor: submitted && regForm.farm_name.trim() === '' ? '#FF9800' : '',
                }}
              />
              {regForm.farm_name.trim() !== '' && (
                <div style={{ fontSize: 12, color: '#2E7D32', marginTop: 4 }}>
                  ✓ : <strong>{regForm.farm_name}</strong>
                </div>
              )}
              {submitted && regForm.farm_name.trim() === '' && (
                <div style={{ fontSize: 12, color: '#E65100', marginTop: 4 }}>
                  
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <PhoneInput countryCode={countryCode} onCountryChange={setCountryCode} phone={phoneNumber} onPhoneChange={setPhoneNumber} />
              {phoneNumber.length > 0 && phoneNumber.length < 7 && (
                <span style={{ fontSize: 11, color: '#FF9800', marginTop: 3, display: 'inline-block' }}>⚠ Number too short</span>
              )}
              {phoneNumber.length >= 7 && (
                <span style={{ fontSize: 11, color: '#2E7D32', marginTop: 3, display: 'inline-block' }}>✓ Saved as <strong>{countryCode}{phoneNumber}</strong></span>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" placeholder="you@example.com"
                value={regForm.email} onChange={e => setReg('email', e.target.value)} />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Password *
                {regForm.password && (passStrong
                  ? <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>✓ Strong</span>
                  : <span style={{ fontSize: 12, color: '#C62828', fontWeight: 600 }}>✗ Too weak</span>
                )}
              </label>
              <PasswordInput
                value={regForm.password}
                onChange={e => { setReg('password', e.target.value); setShowPassRules(true); }}
                placeholder="Min 8 chars, upper, number, symbol"
              />
              {strength && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ height: 4, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: strength.pct, background: strength.color, transition: 'width 0.3s ease, background 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600, marginTop: 2, display: 'inline-block' }}>{strength.label}</span>
                </div>
              )}
              {showPassRules && <PasswordRules password={regForm.password} />}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Confirm Password *
                {regForm.confirm.length > 0 && (
                  regForm.password === regForm.confirm
                    ? <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>✓ Match</span>
                    : <span style={{ fontSize: 12, color: '#C62828', fontWeight: 600 }}>✗ No match</span>
                )}
              </label>
              <PasswordInput
                value={regForm.confirm}
                onChange={e => setReg('confirm', e.target.value)}
                placeholder="Repeat password"
              />
            </div>

            <button className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', opacity: (regForm.password && !passStrong) ? 0.6 : 1 }}
              onClick={handleRegister}
              disabled={loading || (regForm.password.length > 0 && !passStrong)}>
              {loading ? 'Registering...' : 'Create Account'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}