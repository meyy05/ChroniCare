import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Form      from './pages/Form';
import History   from './pages/History';
import Alerts    from './pages/Alerts';
import Profile   from './pages/Profile';
import Toast     from './components/Toast';
import { useChronicareState } from './hooks/useChronicareState';
import { initials } from './utils/constants';
import './App.css';

const TABS = [
  { key: 'dashboard',  label: 'Tableau de bord' },
  { key: 'saisie',     label: 'Saisie' },
  { key: 'historique', label: 'Historique' },
  { key: 'alertes',    label: 'Alertes' },
  { key: 'profil',     label: 'Profil' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const {
    data, profile, thresholds, alerts, toast,
    addEntry, deleteEntry,
    updateProfile, updateThresholds,
    showToast,
  } = useChronicareState();

  // Load Chart.js via CDN once
  useEffect(() => {
    if (window.Chart) return;
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    document.head.appendChild(s);
  }, []);

  const alertCount = alerts.length;

  return (
    <div className="app">
      {/* ── Top bar ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
            </svg>
          </div>
          <div>
            <h1 className="brand-name">ChroniCare</h1>
            <span className="brand-sub">Suivi santé personnalisé</span>
          </div>
        </div>
        <button className="profile-chip" onClick={() => setTab('profil')}>
          <div className="avatar-chip">{initials(profile.firstName, profile.lastName)}</div>
          <span>{profile.firstName} {profile.lastName[0]}.</span>
        </button>
      </header>

      {/* ── Tabs ── */}
      <nav className="tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`tab ${tab === t.key ? 'tab-active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'alertes' && alertCount > 0 && (
              <span className="tab-badge">{alertCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ── Pages ── */}
      <main>
        {tab === 'dashboard' && (
          <Dashboard
            data={data}
            thresholds={thresholds}
            alerts={alerts}
            onDelete={id => { deleteEntry(id); showToast('Mesure supprimée'); }}
          />
        )}
        {tab === 'saisie' && (
          <Form
            addEntry={addEntry}
            showToast={showToast}
            onSuccess={() => setTab('dashboard')}
          />
        )}
        {tab === 'historique' && (
          <History
            data={data}
            thresholds={thresholds}
            onDelete={id => { deleteEntry(id); showToast('Mesure supprimée'); }}
          />
        )}
        {tab === 'alertes' && (
          <Alerts
            thresholds={thresholds}
            updateThresholds={updateThresholds}
            alerts={alerts}
            showToast={showToast}
          />
        )}
        {tab === 'profil' && (
          <Profile
            profile={profile}
            updateProfile={updateProfile}
            data={data}
            showToast={showToast}
          />
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}
