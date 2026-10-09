import { useState, useEffect, useRef } from 'react';
import Toast from '../components/Toast';

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

function Toggle({ on, onToggle }) {
  return (
    <button className={`toggle ${on ? 'on' : ''}`} onClick={onToggle}>
      <div className="toggle-dot" />
    </button>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function PasswordInput({ value, onChange, placeholder, suffix }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input className="form-input" type={show ? 'text' : 'password'} placeholder={placeholder} value={value} onChange={onChange} style={{ paddingRight: suffix ? 72 : 42 }} />
      <button type="button" onClick={() => setShow(s => !s)}
        style={{ position: 'absolute', right: suffix ? 38 : 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#999', padding: 4, display: 'flex', alignItems: 'center' }}
        tabIndex={-1}><EyeIcon open={show} /></button>
      {suffix && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 17, lineHeight: 1 }}>{suffix}</span>}
    </div>
  );
}

function PhoneInput({ countryCode, onCountryChange, phone, onPhoneChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <select className="form-input" value={countryCode} onChange={e => onCountryChange(e.target.value)} style={{ width: 145, flexShrink: 0, cursor: 'pointer' }}>
        {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code} {c.name}</option>)}
      </select>
      <input className="form-input" value={phone} placeholder="e.g. 9876543210" maxLength={15} style={{ flex: 1 }} onChange={e => onPhoneChange(e.target.value.replace(/\D/g, ''))} />
    </div>
  );
}

const PASSWORD_RULES = [
  { id: 'len',     label: 'At least 8 characters',           test: pw => pw.length >= 8 },
  { id: 'upper',   label: 'One uppercase letter (A-Z)',       test: pw => /[A-Z]/.test(pw) },
  { id: 'lower',   label: 'One lowercase letter (a-z)',       test: pw => /[a-z]/.test(pw) },
  { id: 'number',  label: 'One number (0-9)',                 test: pw => /[0-9]/.test(pw) },
  { id: 'special', label: 'One special character (!@#$...)',  test: pw => /[^A-Za-z0-9]/.test(pw) },
];
function isStrongPassword(pw) { return PASSWORD_RULES.every(r => r.test(pw)); }
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
function getStrength(pw) {
  if (!pw) return null;
  const passed = PASSWORD_RULES.filter(r => r.test(pw)).length;
  if (passed <= 1) return { label: 'Too weak',  color: '#C62828', pct: '20%' };
  if (passed === 2) return { label: 'Weak',      color: '#FF9800', pct: '40%' };
  if (passed === 3) return { label: 'Fair',      color: '#FDD835', pct: '60%' };
  if (passed === 4) return { label: 'Good',      color: '#8BC34A', pct: '80%' };
  return               { label: 'Strong ✓',   color: '#2E7D32', pct: '100%' };
}

// ── PROFILE PHOTO UPLOAD COMPONENT ───────────────────────
function ProfilePhotoUpload({ userId, currentPhoto, name, onPhotoUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(
    currentPhoto ? `http://localhost:4000${currentPhoto}` : null
  );
  const fileRef = useRef(null);
  const initials = (name || 'U').charAt(0).toUpperCase();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('File too large! Max 2MB allowed.');
      return;
    }
    // Immediate local preview
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await fetch(`${API}/users/${userId}/photo`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        onPhotoUpdate(data.photo_url);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed. Check server.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: 16 }}>
      <div style={{ position: 'relative', display: 'inline-block' }}>
        {/* Main avatar */}
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 84, height: 84, borderRadius: '50%',
            background: preview ? 'transparent' : 'linear-gradient(135deg, #2E7D32, #66BB6A)',
            color: '#fff', fontSize: 30, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', overflow: 'hidden', cursor: 'pointer',
            border: '3px solid #E8F5E9',
            boxShadow: '0 2px 12px rgba(46,125,50,0.25)',
            position: 'relative',
          }}
        >
          {preview
            ? <img src={preview} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span>{initials}</span>
          }
          {/* Dark overlay on hover */}
          <div
            className="photo-hover-overlay"
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.2s', borderRadius: '50%',
              fontSize: 24,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            📷
          </div>
        </div>

        {/* Small camera badge */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Change photo"
          style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 26, height: 26, borderRadius: '50%',
            background: '#2E7D32', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 12, color: '#fff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
          }}
        >
          {uploading ? '⏳' : '📷'}
        </button>

        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: '#aaa' }}>
        {uploading ? 'Uploading...' : 'Photo (max 2MB)'}
      </div>
    </div>
  );
}

export default function Settings() {
  const [profile, setProfile] = useState({ name: '', email: '', phone: '', farm_name: '' });
  const [photoUrl, setPhotoUrl] = useState(null);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pass, setPass] = useState({ current: '', newp: '', confirm: '' });
  const [notifs, setNotifs] = useState({ sms: true, email: true, vaccination: true, finance: false });
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [showNewRules, setShowNewRules] = useState(false);
  const [currPassStatus, setCurrPassStatus] = useState(null);
  const debounceRef = useRef(null);

  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = storedUser.id || 1;

  useEffect(() => {
    fetch(`${API}/users/${userId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setToast({ msg: data.error, type: 'error' }); return; }
        setProfile({
          name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          farm_name: data.farm_name || '',
        });
        setPhotoUrl(data.photo_url || null);
        if (data.phone) {
          const matched = COUNTRY_CODES.find(c => data.phone.startsWith(c.code));
          if (matched) { setCountryCode(matched.code); setPhoneNumber(data.phone.slice(matched.code.length)); }
          else setPhoneNumber(data.phone);
        }
        setLoading(false);
      })
      .catch(() => { setToast({ msg: 'Failed to load profile', type: 'error' }); setLoading(false); });
  }, [userId]);

  const handlePhotoUpdate = (newPhotoUrl) => {
    setPhotoUrl(newPhotoUrl);
    const updated = { ...storedUser, photo_url: newPhotoUrl };
    localStorage.setItem('user', JSON.stringify(updated));
    window.dispatchEvent(new Event('userUpdated'));
    setToast({ msg: '✅ Profile photo updated!', type: 'success' });
  };

  const handleCurrentPassChange = (val) => {
    setPass(p => ({ ...p, current: val }));
    setCurrPassStatus(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 6) return;
    setCurrPassStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/users/${userId}/check-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: val }) });
        const data = await res.json();
        setCurrPassStatus(data.correct ? 'correct' : 'wrong');
      } catch { setCurrPassStatus(null); }
    }, 600);
  };

  const currPassSuffix = currPassStatus === 'checking' ? '⏳' : currPassStatus === 'correct' ? '✅' : currPassStatus === 'wrong' ? '❌' : null;

  const saveProfile = async () => {
    if (!profile.name || !profile.email) { setToast({ msg: 'Name and Email are required', type: 'error' }); return; }
    if (!profile.email.includes('@')) { setToast({ msg: 'Enter a valid email address', type: 'error' }); return; }
    if (!profile.farm_name || !profile.farm_name.trim()) { setToast({ msg: 'Farm Name is required', type: 'error' }); return; }
    if (!phoneNumber || phoneNumber.length < 7) { setToast({ msg: 'Enter a valid phone number', type: 'error' }); return; }
    const fullPhone = `${countryCode}${phoneNumber}`;
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, email: profile.email, phone: fullPhone, farm_name: profile.farm_name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setToast({ msg: data.error || 'Update failed', type: 'error' }); }
      else {
        const updated = { ...storedUser, name: profile.name, full_name: profile.name, email: profile.email, farm_name: profile.farm_name.trim() };
        localStorage.setItem('user', JSON.stringify(updated));
        window.dispatchEvent(new Event('userUpdated'));
        setToast({ msg: 'Profile updated successfully!', type: 'success' });
      }
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
    finally { setSaving(false); }
  };

  const savePass = async () => {
    if (!pass.current || !pass.newp || !pass.confirm) { setToast({ msg: 'Please fill in all password fields.', type: 'error' }); return; }
    if (currPassStatus === 'wrong') { setToast({ msg: 'Current password is incorrect.', type: 'error' }); return; }
    if (!isStrongPassword(pass.newp)) { setToast({ msg: 'New password does not meet strength requirements.', type: 'error' }); setShowNewRules(true); return; }
    if (pass.newp !== pass.confirm) { setToast({ msg: 'New passwords do not match.', type: 'error' }); return; }
    if (pass.newp === pass.current) { setToast({ msg: 'New password must be different from current.', type: 'error' }); return; }
    setSavingPass(true);
    try {
      const res = await fetch(`${API}/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: pass.current, newPassword: pass.newp }) });
      const data = await res.json();
      if (!res.ok) { setToast({ msg: data.error || 'Password update failed', type: 'error' }); }
      else { setPass({ current: '', newp: '', confirm: '' }); setCurrPassStatus(null); setShowNewRules(false); setToast({ msg: 'Password updated successfully!', type: 'success' }); }
    } catch { setToast({ msg: 'Server error', type: 'error' }); }
    finally { setSavingPass(false); }
  };

  const strength = getStrength(pass.newp);
  const newPassStrong = isStrongPassword(pass.newp);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading settings...</div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* ─── LEFT COLUMN ─── */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">Profile Information</div>

            {/* 🆕 PHOTO UPLOAD */}
            <ProfilePhotoUpload
              userId={userId}
              currentPhoto={photoUrl}
              name={profile.name || storedUser.full_name}
              onPhotoUpdate={handlePhotoUpdate}
            />

            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>
                {storedUser.role || 'Farmer'}
              </span>
            </div>

            {/* Farm Name — REQUIRED */}
            <div className="form-group">
              <label className="form-label">
                🏡 Farm Name *
              </label>
              <input
                className="form-input"
                value={profile.farm_name}
                placeholder="e.g. Patil Goat Farm"
                onChange={e => setProfile(p => ({ ...p, farm_name: e.target.value }))}
                style={{ borderColor: !profile.farm_name.trim() ? '#FF9800' : '' }}
              />
              {profile.farm_name.trim() && (
                <div style={{ fontSize: 12, color: '#2E7D32', marginTop: 4 }}>
                  ✓ : <strong>{profile.farm_name}</strong>
                </div>
              )}
              {!profile.farm_name.trim() && (
                <div style={{ fontSize: 12, color: '#E65100', marginTop: 4 }}>
                  
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-input" value={profile.name} placeholder="Your full name"
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-input" type="email" value={profile.email} placeholder="your@email.com"
                onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <PhoneInput countryCode={countryCode} onCountryChange={setCountryCode} phone={phoneNumber} onPhoneChange={setPhoneNumber} />
              <div style={{ marginTop: 5, fontSize: 12 }}>
                {phoneNumber.length === 0 && <span style={{ color: '#aaa' }}>Enter your phone number without country code</span>}
                {phoneNumber.length > 0 && phoneNumber.length < 7 && <span style={{ color: '#FF9800' }}>⚠ Number too short</span>}
                {phoneNumber.length >= 7 && <span style={{ color: '#2E7D32' }}>✓ Will be saved as <strong>{countryCode}{phoneNumber}</strong></span>}
              </div>
            </div>

            <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          <div className="card" style={{ borderColor: '#FFCDD2' }}>
            <div className="section-title" style={{ color: '#C62828' }}>Danger Zone</div>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              Permanently delete your account and all farm data. This action cannot be undone.
            </p>
            <button className="btn btn-danger" style={{ opacity: 0.5, cursor: 'not-allowed' }}
              onClick={() => setToast({ msg: 'Please contact admin to delete your account.', type: 'error' })}>
              Delete Account
            </button>
          </div>
        </div>

        {/* ─── RIGHT COLUMN ─── */}
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="section-title">Change Password</div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Current Password *
                {currPassStatus === 'correct' && <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>✓ Correct</span>}
                {currPassStatus === 'wrong'   && <span style={{ fontSize: 12, color: '#C62828', fontWeight: 600 }}>✗ Incorrect</span>}
              </label>
              <PasswordInput value={pass.current} onChange={e => handleCurrentPassChange(e.target.value)} placeholder="Enter current password" suffix={currPassSuffix} />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                New Password *
                {pass.newp && (newPassStrong ? <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>✓ Strong</span> : <span style={{ fontSize: 12, color: '#C62828', fontWeight: 600 }}>✗ Too weak</span>)}
              </label>
              <PasswordInput value={pass.newp} onChange={e => { setPass(p => ({ ...p, newp: e.target.value })); setShowNewRules(true); }} placeholder="Min 8 chars, upper, number, symbol" />
              {strength && (
                <div style={{ marginTop: 5 }}>
                  <div style={{ height: 4, borderRadius: 4, background: '#eee', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, width: strength.pct, background: strength.color, transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontWeight: 600, marginTop: 2, display: 'inline-block' }}>{strength.label}</span>
                </div>
              )}
              {showNewRules && <PasswordRules password={pass.newp} />}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                Confirm New Password *
                {pass.confirm.length > 0 && (pass.newp === pass.confirm ? <span style={{ fontSize: 12, color: '#2E7D32', fontWeight: 600 }}>✓ Match</span> : <span style={{ fontSize: 12, color: '#C62828', fontWeight: 600 }}>✗ No match</span>)}
              </label>
              <PasswordInput value={pass.confirm} onChange={e => setPass(p => ({ ...p, confirm: e.target.value }))} placeholder="Repeat new password" />
            </div>

            <div style={{ background: '#FFF8E1', border: '1px solid #FFE082', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#5D4037', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
              <span>Strong password is <strong>mandatory</strong>. Must include uppercase, lowercase, number and special character.</span>
            </div>

            <button className="btn btn-primary" onClick={savePass}
              disabled={savingPass || currPassStatus === 'wrong' || (pass.newp && !newPassStrong)}
              style={{ opacity: (pass.newp && !newPassStrong) ? 0.5 : 1 }}>
              {savingPass ? 'Updating...' : 'Update Password'}
            </button>
          </div>

          <div className="card">
            <div className="section-title">Notification Preferences</div>
            {[
              { key: 'sms',         label: 'SMS Notifications',     desc: 'Receive alerts via SMS' },
              { key: 'email',       label: 'Email Notifications',   desc: 'Receive alerts via email' },
              { key: 'vaccination', label: 'Vaccination Reminders', desc: 'Remind before due dates' },
              { key: 'finance',     label: 'Finance Alerts',        desc: 'Weekly finance summaries' },
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{item.desc}</div>
                </div>
                <Toggle on={notifs[item.key]} onToggle={() => setNotifs(n => ({ ...n, [item.key]: !n[item.key] }))} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}