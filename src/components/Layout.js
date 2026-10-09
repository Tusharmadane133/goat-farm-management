import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>) },
  { path: '/goats', label: 'Goat Management', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>) },
  { path: '/groups', label: 'Groups', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>) },
  { path: '/hitting-cycle', label: 'Hitting Cycle', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>) },
  { path: '/breeding', label: 'Breeding', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>) },
  { path: '/finance', label: 'Finance', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
  { path: '/vaccinations', label: 'Vaccinations', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>) },
  { path: '/settings', label: 'Settings', icon: (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>) },
];

const STATIC = {
  en: {
    dashboard: 'Dashboard', goatMgmt: 'Goat Management', hittingCycle: 'Hitting Cycle',
    breeding: 'Breeding', finance: 'Finance', vaccinations: 'Vaccinations', settings: 'Settings',
    groups: 'Groups', mainMenu: 'Main Menu', farmMgmt: 'By SinaSoft Solution LLP', logout: 'Logout',
    hittingCycleHeat: 'Hitting Cycle (Heat)', breedingCrossing: 'Breeding & Crossing',
    financeTrkr: 'Finance Tracker', vaccinationTrkr: 'Vaccination Tracker', goatProfile: 'Goat Profile',
  },
  hi: {
    dashboard: 'डैशबोर्ड', goatMgmt: 'बकरी प्रबंधन', hittingCycle: 'हीट साइकल',
    breeding: 'प्रजनन', finance: 'वित्त', vaccinations: 'टीकाकरण', settings: 'सेटिंग्स',
    groups: 'ग्रुप्स', mainMenu: 'मुख्य मेनू', farmMgmt: 'फार्म प्रबंधन', logout: 'लॉग आउट',
    hittingCycleHeat: 'हीट साइकल (गर्मी)', breedingCrossing: 'प्रजनन और क्रॉसिंग',
    financeTrkr: 'वित्त ट्रैकर', vaccinationTrkr: 'टीकाकरण ट्रैकर', goatProfile: 'बकरी प्रोफाइल',
  },
  mr: {
    dashboard: 'डॅशबोर्ड', goatMgmt: 'शेळी व्यवस्थापन', hittingCycle: 'हीट सायकल',
    breeding: 'प्रजनन', finance: 'वित्त', vaccinations: 'लसीकरण', settings: 'सेटिंग्ज',
    groups: 'गट', mainMenu: 'मुख्य मेनू', farmMgmt: 'फार्म व्यवस्थापन', logout: 'लॉग आउट',
    hittingCycleHeat: 'हीट सायकल (उष्णता)', breedingCrossing: 'प्रजनन आणि क्रॉसिंग',
    financeTrkr: 'वित्त ट्रॅकर', vaccinationTrkr: 'लसीकरण ट्रॅकर', goatProfile: 'शेळी प्रोफाइल',
  },
};

const NAV_KEYS = {
  '/dashboard': 'dashboard', '/goats': 'goatMgmt', '/groups': 'groups',
  '/hitting-cycle': 'hittingCycle', '/breeding': 'breeding',
  '/finance': 'finance', '/vaccinations': 'vaccinations', '/settings': 'settings',
};
const PAGE_TITLE_KEYS = {
  '/dashboard': 'dashboard', '/goats': 'goatMgmt', '/groups': 'groups',
  '/hitting-cycle': 'hittingCycleHeat', '/breeding': 'breedingCrossing',
  '/finance': 'financeTrkr', '/vaccinations': 'vaccinationTrkr', '/settings': 'settings',
};

const translationCache = {};
async function translateText(text, targetLang) {
  if (!text || !text.trim() || targetLang === 'en') return text;
  const key = `${targetLang}:${text}`;
  if (translationCache[key]) return translationCache[key];
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLang}`);
    const data = await res.json();
    const translated = data?.responseData?.translatedText || text;
    translationCache[key] = translated;
    return translated;
  } catch { return text; }
}
async function translateContainer(container, targetLang) {
  if (!container || targetLang === 'en') return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName?.toLowerCase();
      if (['script','style','noscript'].includes(tag)) return NodeFilter.FILTER_REJECT;
      if (!node.textContent.trim()) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);
  for (let i = 0; i < nodes.length; i += 5) {
    const batch = nodes.slice(i, i + 5);
    await Promise.all(batch.map(async (n) => {
      const original = n.textContent.trim();
      if (!original || original.length < 2) return;
      if (!n._origText) n._origText = original;
      const translated = await translateText(n._origText, targetLang);
      if (translated && translated !== n._origText) n.textContent = translated;
    }));
  }
}
function restoreOriginal(container) {
  if (!container) return;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node._origText) { node.textContent = node._origText; delete node._origText; }
  }
}

import React, { createContext, useContext } from 'react';
const LangContext = createContext({ lang: 'en', t: (k) => k });
export function useLang() { return useContext(LangContext); }

function LanguageSelector({ lang, setLang, translating }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const LANGS = [
    { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
    { code: 'hi', label: 'हिंदी',   flag: '🇮🇳', short: 'HI' },
    { code: 'mr', label: 'मराठी',   flag: '🟠',  short: 'MR' },
  ];
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  const active = LANGS.find(l => l.code === lang) || LANGS[0];
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 1000 }}>
      <button onClick={() => setOpen(o => !o)} title="Change Language"
        style={{ width: 38, height: 38, borderRadius: '50%', border: open ? '1.5px solid #2E7D32' : '1.5px solid #ddd', background: open ? '#E8F5E9' : '#f9f9f9', cursor: translating ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s', opacity: translating ? 0.7 : 1 }}>
        {translating ? (
          <div style={{ width: 16, height: 16, border: '2px solid #e0e0e0', borderTop: '2px solid #2E7D32', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={open ? '#2E7D32' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        )}
        <span style={{ position: 'absolute', bottom: -3, right: -3, background: '#2E7D32', color: '#fff', fontSize: 7, fontWeight: 800, padding: '1px 3px', borderRadius: 3, lineHeight: 1.3 }}>{active.short}</span>
      </button>
      {open && !translating && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 12, boxShadow: '0 8px 28px rgba(0,0,0,0.13)', minWidth: 170, overflow: 'hidden', padding: '6px', animation: 'fadeSlideDown 0.15s ease' }}>
          <div style={{ fontSize: 10, color: '#999', fontWeight: 700, letterSpacing: 1.1, padding: '4px 10px 8px', textTransform: 'uppercase', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>🌐 Select Language</div>
          {LANGS.map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: 'none', cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: lang === l.code ? 700 : 400, background: lang === l.code ? '#E8F5E9' : 'transparent', color: lang === l.code ? '#1B5E20' : '#333', transition: 'background 0.12s', textAlign: 'left' }}
              onMouseEnter={e => { if (lang !== l.code) e.currentTarget.style.background = '#f5f5f5'; }}
              onMouseLeave={e => { if (lang !== l.code) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ fontSize: 20 }}>{l.flag}</span>
              <span style={{ flex: 1 }}>{l.label}</span>
              {lang === l.code && <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2E7D32', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const API = 'http://localhost:4000/api';

function VaccinationBell({ uid, onNavigate }) {
  const [reminders, setReminders] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!uid) return;
    const loadData = () => {
      fetch(`${API}/vaccinations?user_id=${uid}`)
        .then(r => r.json())
        .then(data => {
          if (!Array.isArray(data)) return;
          const today = new Date(); today.setHours(0,0,0,0);
          const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
          const filtered = data.filter(v => {
            if (v.status === 'Done' || !v.nextDue || v.nextDue === '-') return false;
            const due = new Date(v.nextDue); due.setHours(0,0,0,0);
            return due <= tomorrow;
          });
          setReminders(filtered);
        }).catch(() => {});
    };
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [uid, open]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const hasReminders = reminders.length > 0;
  return (
    <div ref={ref} style={{ position: 'relative', zIndex: 999 }}>
      <button onClick={() => setOpen(o => !o)} title="Vaccination Reminders"
        style={{ width: 38, height: 38, borderRadius: '50%', border: hasReminders ? '1.5px solid #FF9800' : '1px solid #eee', background: hasReminders ? '#FFF3E0' : '#f9f9f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'all 0.15s' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={hasReminders ? '#E65100' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {hasReminders && (
          <span style={{ position: 'absolute', top: -3, right: -3, background: '#E53935', color: '#fff', fontSize: 9, fontWeight: 800, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1, border: '1.5px solid #fff' }}>
            {reminders.length}
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, background: '#fff', border: '1.5px solid #e0e0e0', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.14)', width: 'min(340px, calc(100vw - 24px))', overflow: 'hidden', animation: 'fadeSlideDown 0.15s ease', zIndex: 1001 }}>
          <div style={{ background: hasReminders ? 'linear-gradient(135deg,#FFF3E0,#FFE0B2)' : 'linear-gradient(135deg,#E8F5E9,#C8E6C9)', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <strong style={{ color: hasReminders ? '#E65100' : '#2E7D32', fontSize: 14, flex: 1 }}>Vaccination Reminders</strong>
            {hasReminders && <span style={{ fontSize: 11, background: '#E53935', color: '#fff', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>{reminders.length} Due</span>}
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {reminders.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, color: '#2E7D32', marginBottom: 4 }}>All up to date!</div>
                No vaccinations due today or tomorrow.
              </div>
            ) : reminders.map(r => {
              const due = new Date(r.nextDue); due.setHours(0,0,0,0);
              const today = new Date(); today.setHours(0,0,0,0);
              const diffDays = Math.round((due - today) / 86400000);
              const isToday = diffDays === 0;
              return (
                <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', background: isToday ? '#FFF8F0' : '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#1B5E20', background: '#E8F5E9', padding: '1px 8px', borderRadius: 5, fontSize: 12 }}>🐐 {r.goat}</span>
                    <span style={{ fontSize: 12, color: '#444' }}>💉 {r.vaccine}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>Due: <strong style={{ color: isToday ? '#C62828' : '#E65100' }}>{r.nextDue}</strong></span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: isToday ? '#C62828' : '#FF9800', padding: '1px 7px', borderRadius: 4 }}>
                      {isToday ? '⚠️ Today!' : '📅 Tomorrow!'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', background: '#fafafa' }}>
            <button onClick={() => { setOpen(false); onNavigate('/vaccinations'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#2E7D32', fontWeight: 600, fontFamily: 'inherit' }}>
              View All Vaccinations →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileBottomNav({ location, navigate }) {
  const bottomItems = [
    { path: '/dashboard', label: 'Home', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>) },
    { path: '/goats', label: 'Goats', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/></svg>) },
    { path: '/breeding', label: 'Breeding', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="12" r="4"/><circle cx="16" cy="12" r="4"/><path d="M12 8v8"/></svg>) },
    { path: '/finance', label: 'Finance', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
    { path: '/vaccinations', label: 'Vaccines', icon: (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>) },
  ];
  return (
    <nav className="mobile-bottom-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 62, background: '#fff', borderTop: '1.5px solid #e8e8e8', display: 'flex', alignItems: 'stretch', zIndex: 300, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {bottomItems.map(item => {
        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
        return (
          <button key={item.path} onClick={() => navigate(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, border: 'none', background: 'transparent', cursor: 'pointer', color: isActive ? '#2E7D32' : '#aaa', fontFamily: 'inherit', padding: '6px 2px', position: 'relative', transition: 'color 0.15s', WebkitTapHighlightColor: 'transparent' }}>
            {isActive && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 32, height: 3, background: '#2E7D32', borderRadius: '0 0 4px 4px' }} />}
            <span style={{ color: isActive ? '#2E7D32' : '#aaa', display: 'flex', alignItems: 'center' }}>{item.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: 0.2, lineHeight: 1 }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lang, setLangState] = useState(() => localStorage.getItem('goatfarm_lang') || 'en');
  const [translating, setTranslating] = useState(false);
  const contentRef = useRef(null);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{"full_name":"Farmer","role":"farmer"}'));

  useEffect(() => {
    const handleStorage = () => {
      const updated = JSON.parse(localStorage.getItem('user') || '{}');
      setUser(updated);
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('userUpdated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('userUpdated', handleStorage);
    };
  }, []);

  const initials = (user.full_name || user.name || 'F').charAt(0).toUpperCase();
  const photoUrl = user.photo_url ? `http://localhost:4000${user.photo_url}` : null;

  const t = useCallback((key) => {
    return STATIC[lang]?.[key] || STATIC['en'][key] || key;
  }, [lang]);

  const setLang = useCallback(async (newLang) => {
    if (newLang === lang) return;
    localStorage.setItem('goatfarm_lang', newLang);
    setLangState(newLang);
    if (newLang === 'en') { restoreOriginal(contentRef.current); return; }
    setTranslating(true);
    try { await translateContainer(contentRef.current, newLang); }
    finally { setTranslating(false); }
  }, [lang]);

  useEffect(() => {
    setSidebarOpen(false);
    const currentLang = localStorage.getItem('goatfarm_lang') || 'en';
    if (currentLang !== 'en') {
      setTimeout(async () => {
        setTranslating(true);
        try { await translateContainer(contentRef.current, currentLang); }
        finally { setTranslating(false); }
      }, 300);
    }
  }, [location.pathname]);

  const navLabel = (path) => {
    const key = NAV_KEYS[path];
    return key ? t(key) : path;
  };

  const pageTitle = () => {
    if (location.pathname.startsWith('/goats/')) return t('goatProfile');
    const key = PAGE_TITLE_KEYS[location.pathname];
    return key ? t(key) : 'GoatFarm Pro';
  };

  // ── AVATAR helper — reusable ──
  const Avatar = ({ size = 34, fontSize = 14, rounded = '50%', style = {} }) => (
    <div style={{
      width: size, height: size, borderRadius: rounded,
      background: photoUrl ? 'transparent' : 'rgba(255,255,255,0.25)',
      overflow: 'hidden', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      ...style,
    }}>
      {photoUrl
        ? <img src={photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontSize }}>{initials}</span>
      }
    </div>
  );

  // ── HEADER AVATAR (green gradient bg when no photo) ──
  const HeaderAvatar = () => (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', overflow: 'hidden',
      background: photoUrl ? 'transparent' : 'linear-gradient(135deg, #2E7D32, #66BB6A)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', boxShadow: '0 2px 8px rgba(46,125,50,0.3)',
    }}>
      {photoUrl
        ? <img src={photoUrl} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>{initials}</span>
      }
    </div>
  );

  return (
    <LangContext.Provider value={{ lang, t }}>
      <div style={{ display: 'flex', height: '100vh', background: '#f5f6fa' }}>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }} />
        )}

        {/* ── Sidebar ── */}
        <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`} style={{
          width: 240, minHeight: '100vh',
          background: 'linear-gradient(180deg, #1B5E20 0%, #2E7D32 60%, #388E3C 100%)',
          display: 'flex', flexDirection: 'column',
          position: 'fixed', top: 0, left: 0, bottom: 0,
          boxShadow: '4px 0 20px rgba(0,0,0,0.15)', zIndex: 100,
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Sidebar Header */}
          <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* 🆕 Farm logo: photo if available, else 🐐 */}
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden', flexShrink: 0 }}>
                {photoUrl
                  ? <img src={photoUrl} alt="farm" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
                  : '🐐'
                }
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.farm_name || 'GoatFarm Pro'}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{t('farmMgmt')}</div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="mobile-close-btn"
                style={{ display: 'none', background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff', borderRadius: 6, cursor: 'pointer', width: 28, height: 28, fontSize: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
            <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 10, fontWeight: 600, letterSpacing: 1.2, padding: '4px 12px 8px', textTransform: 'uppercase' }}>{t('mainMenu')}</div>
            {navItems.map(item => {
              const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <button key={item.path} onClick={() => { navigate(item.path); setSidebarOpen(false); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                  borderRadius: 10, border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
                  background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.7)',
                  fontWeight: active ? 600 : 400, fontSize: 14, fontFamily: 'inherit',
                  transition: 'all 0.15s', position: 'relative',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                  {active && <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: '#fff', borderRadius: '0 3px 3px 0' }} />}
                  <span style={{ color: active ? '#fff' : 'rgba(255,255,255,0.65)', flexShrink: 0 }}>{item.icon}</span>
                  {navLabel(item.path)}
                </button>
              );
            })}
          </nav>

          {/* Sidebar footer — user info + logout */}
          <div style={{ padding: '14px 10px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.08)', marginBottom: 10 }}>
              {/* 🆕 Profile photo in sidebar footer */}
              <Avatar size={34} fontSize={14} />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.full_name || user.name || 'User'}</div>
                <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textTransform: 'capitalize' }}>{user.role || 'Farmer'}</div>
              </div>
            </div>
            <button onClick={() => { localStorage.removeItem('user'); navigate('/login'); }} style={{
              width: '100%', padding: '9px', border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              {t('logout')}
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <div className="main-content" style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <header style={{
            height: 64, background: '#fff', borderBottom: '1px solid #eee',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 28px', position: 'sticky', top: 0, zIndex: 99,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#333', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#1a1a1a' }}>{pageTitle()}</div>
                <div className="topbar-date" style={{ fontSize: 12, color: '#999', marginTop: 1 }}>
                  {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <VaccinationBell uid={user.id} onNavigate={navigate} />
              <LanguageSelector lang={lang} setLang={setLang} translating={translating} />
              {/* 🆕 Header avatar with photo */}
              <HeaderAvatar />
            </div>
          </header>

          {translating && (
            <div style={{ position: 'fixed', top: 64, left: 240, right: 0, bottom: 0, background: 'rgba(255,255,255,0.6)', zIndex: 98, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }} className="translating-overlay">
              <div style={{ width: 36, height: 36, border: '3px solid #e0e0e0', borderTop: '3px solid #2E7D32', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              <div style={{ fontSize: 14, color: '#2E7D32', fontWeight: 600 }}>
                {lang === 'hi' ? 'अनुवाद हो रहा है...' : lang === 'mr' ? 'भाषांतर होत आहे...' : 'Translating...'}
              </div>
            </div>
          )}

          <div ref={contentRef} className="page-content" style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
            {children}
          </div>
        </div>

        <MobileBottomNav location={location} navigate={navigate} />

        <style>{`
          @keyframes fadeSlideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
          @media (min-width: 1025px) {
            .sidebar { transform: translateX(0) !important; }
            .hamburger-btn { display: none !important; }
            .mobile-close-btn { display: none !important; }
            .main-content { margin-left: 240px !important; }
            .translating-overlay { left: 240px !important; }
            .mobile-bottom-nav { display: none !important; }
          }
          @media (max-width: 1024px) {
            .sidebar { transform: translateX(-100%); }
            .sidebar.sidebar-open { transform: translateX(0) !important; }
            .hamburger-btn { display: flex !important; }
            .mobile-close-btn { display: flex !important; }
            .main-content { margin-left: 0 !important; }
            .translating-overlay { left: 0 !important; }
            .mobile-bottom-nav { display: none !important; }
          }
          @media (max-width: 640px) {
            .mobile-bottom-nav { display: flex !important; }
            .page-content { padding: 14px 12px calc(70px + env(safe-area-inset-bottom)) !important; }
            header { padding: 0 12px !important; height: 54px !important; }
            .topbar-date { display: none !important; }
          }
          @media (max-width: 480px) {
            header { padding: 0 10px !important; }
            .page-content { padding: 12px 10px calc(70px + env(safe-area-inset-bottom)) !important; }
          }
          button { -webkit-tap-highlight-color: transparent; }
        `}</style>
      </div>
    </LangContext.Provider>
  );
}