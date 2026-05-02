import { useEffect, useMemo, useState } from 'react';
import Dashboard from './pages/Dashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorNotifications from './pages/DoctorNotifications';
import Chat from './pages/Chat';
import PatientDoctorPanel from './pages/PatientDoctorPanel';
import Form from './pages/Form';
import History from './pages/History';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import Toast from './components/Toast';
import API from './services/api';
import { useChronicareState } from './hooks/useChronicareState';
import { initials } from './utils/constants';
import logo from './assets/logo.png';
import './App.css';

const PATIENT_TABS = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'saisie', label: 'Saisie' },
  { key: 'historique', label: 'Historique' },
  { key: 'alertes', label: 'Alertes' },
  { key: 'medecin', label: 'Médecin' },
  { key: 'profil', label: 'Profil' },
];

const DOCTOR_TABS = [
  { key: 'doctor', label: 'Tableau de bord' },
  { key: 'notifications', label: 'Requêtes' },
  { key: 'chat', label: 'Messages' },
  { key: 'profil', label: 'Profil' },
];

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch (error) {
      return 'light';
    }
  });
  const [authView, setAuthView] = useState('login');
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('authToken') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState('dashboard');
  const [selectedChatContact, setSelectedChatContact] = useState(null);
  const [doctorPatients, setDoctorPatients] = useState([]);

  const {
    data,
    profile,
    thresholds,
    alerts,
    toast,
    addEntry,
    deleteEntry,
    updateProfile,
    updateThresholds,
    showToast,
    patientDoctors,
  } = useChronicareState({ authToken, currentUser });

  const alertCount = alerts.length;
  const isDoctor = currentUser?.role === 'doctor';
  const displayFirstName = currentUser?.firstName || currentUser?.first_name || '';
  const displayLastName = currentUser?.lastName || currentUser?.last_name || '';

  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    } catch (error) {
      // ignore storage issues
    }
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function verifySession() {
      if (!authToken) {
        setCurrentUser(null);
        return;
      }

      try {
        const response = await API.get('/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        if (!mounted) return;
        setCurrentUser(response.data);
        setTab(response.data.role === 'doctor' ? 'doctor' : 'dashboard');
      } catch (error) {
        if (!mounted) return;
        setAuthToken('');
        setCurrentUser(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setAuthView('login');
      }
    }

    verifySession();
    return () => {
      mounted = false;
    };
  }, [authToken]);

  useEffect(() => {
    if (currentUser?.role === 'doctor' && tab === 'chat' && authToken) {
      fetchDoctorPatients();
    }
  }, [currentUser?.role, tab, authToken]);

  async function fetchDoctorPatients() {
    try {
      const response = await API.get('/patients', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setDoctorPatients(response.data || []);
    } catch (error) {
      console.error('Failed to fetch patients:', error);
    }
  }

  const visibleTabs = useMemo(() => {
    if (currentUser?.role === 'doctor') {
      return DOCTOR_TABS;
    }
    return PATIENT_TABS;
  }, [currentUser]);

  async function handleLogin({ email, password }) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await API.post('/auth/login', { email, password });
      const { token, user } = response.data;
      setAuthToken(token);
      setCurrentUser(user);
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
      setTab(user.role === 'doctor' ? 'doctor' : 'dashboard');
    } catch (error) {
      setAuthError(error?.response?.data?.error || 'Impossible de se connecter');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleRegister(payload) {
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await API.post('/auth/register', payload);
      const { token, user } = response.data;
      setAuthToken(token);
      setCurrentUser(user);
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(user));
      setTab(user.role === 'doctor' ? 'doctor' : 'dashboard');
    } catch (error) {
      setAuthError(error?.response?.data?.error || 'Impossible de créer le compte');
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLogout() {
    setAuthToken('');
    setCurrentUser(null);
    setAuthView('login');
    setTab('dashboard');
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
  }

  if (!currentUser) {
    return authView === 'register' ? (
      <Register
        onRegister={handleRegister}
        onSwitchToLogin={() => setAuthView('login')}
        loading={authLoading}
        error={authError}
      />
    ) : (
      <Login
        onLogin={handleLogin}
        onSwitchToRegister={() => setAuthView('register')}
        loading={authLoading}
        error={authError}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">
            <img src={logo} alt="ChroniCare" />
          </div>
          <div>
            <h1 className="brand-name">ChroniCare</h1>
            <span className="brand-sub">Suivi santé personnalisé</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="theme-toggle" onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>
          <button className="profile-chip" onClick={() => setTab('profil')}>
            <div className="avatar-chip">{initials(displayFirstName, displayLastName)}</div>
            <span>
              {displayFirstName} {displayLastName?.[0]}.
            </span>
          </button>
          <button className="logout-chip" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {!isDoctor && (
        <nav className="tabs" role="tablist">
          {visibleTabs.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab ${tab === t.key ? 'tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'alertes' && alertCount > 0 && <span className="tab-badge">{alertCount}</span>}
            </button>
          ))}
        </nav>
      )}

      {isDoctor && (
        <nav className="tabs" role="tablist">
          {visibleTabs.map(t => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab ${tab === t.key ? 'tab-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      )}

      <main>
        {isDoctor ? (
          <>
            {tab === 'doctor' && (
              <DoctorDashboard
                token={authToken}
                doctorName={`${displayFirstName} ${displayLastName}`.trim()}
                doctorProfile={currentUser.profile || profile}
              />
            )}
            {tab === 'notifications' && (
              <DoctorNotifications
                token={authToken}
                onRequestProcessed={() => {
                  showToast('Requête traitée');
                }}
              />
            )}
            {tab === 'chat' && (
              <div className="doctorChatShell">
                <div className="doctorChatSidebar">
                  <h3 className="doctorChatSidebarTitle">Patients</h3>
                  <div className="doctorChatPatients">
                    {doctorPatients.length === 0 ? (
                      <p className="doctorChatEmptyState">Aucun patient</p>
                    ) : (
                      doctorPatients.map(patient => (
                        <button
                          key={patient.id}
                          type="button"
                          className={`doctorChatPatient ${selectedChatContact?.id === patient.id ? 'doctorChatPatientActive' : ''}`}
                          onClick={() => setSelectedChatContact(patient)}
                        >
                          <div className="doctorChatPatientName">
                            {patient.firstName} {patient.lastName}
                          </div>
                          <div className="doctorChatPatientEmail">
                            {patient.email}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <div className="doctorChatPane">
                  {selectedChatContact ? (
                    <Chat
                      token={authToken}
                      currentUserId={currentUser.id}
                      currentUserRole={currentUser.role}
                      contactId={selectedChatContact.id}
                      contactName={`${selectedChatContact.firstName} ${selectedChatContact.lastName}`}
                    />
                  ) : (
                    <div className="doctorChatEmptyState doctorChatEmptyStateCenter">
                      Sélectionnez un patient pour commencer
                    </div>
                  )}
                </div>
              </div>
            )}
            {tab === 'profil' && (
              <Profile
                profile={profile}
                updateProfile={updateProfile}
                data={data}
                showToast={showToast}
                role={currentUser.role}
              />
            )}
          </>
        ) : (
          <>
            {tab === 'dashboard' && (
              <Dashboard
                data={data}
                thresholds={thresholds}
                alerts={alerts}
                onDelete={id => {
                  deleteEntry(id);
                  showToast('Mesure supprimée');
                }}
              />
            )}
            {tab === 'saisie' && <Form addEntry={addEntry} showToast={showToast} onSuccess={() => setTab('dashboard')} />}
            {tab === 'historique' && <History data={data} thresholds={thresholds} onDelete={id => { deleteEntry(id); showToast('Mesure supprimée'); }} />}
            {tab === 'alertes' && <Alerts thresholds={thresholds} updateThresholds={updateThresholds} alerts={alerts} showToast={showToast} />}
            {tab === 'medecin' && (
              <PatientDoctorPanel
                token={authToken}
                patientId={currentUser.id}
                currentUserName={`${displayFirstName} ${displayLastName}`.trim()}
                patientDoctors={patientDoctors}
              />
            )}
            {tab === 'profil' && <Profile profile={profile} updateProfile={updateProfile} data={data} showToast={showToast} role={currentUser.role} />}
          </>
        )}
      </main>

      <Toast message={toast} />
    </div>
  );
}
