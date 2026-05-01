import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Form from './components/Form';
import History from './components/History';
import { mockData } from './data/mockData';
import './App.css';

const TABS = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'saisie', label: 'Saisie' },
  { key: 'historique', label: 'Historique' },
];

function Toast({ message }) {
  return message ? <div className="toast show">{message}</div> : null;
}

export default function App() {
  const [data, setData] = useState(mockData);
  const [tab, setTab] = useState('dashboard');
  const [toast, setToast] = useState('');

  // Load Chart.js once
  useEffect(() => {
    if (window.Chart) return;
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
    document.head.appendChild(script);
  }, []);

  const addData = (item) => {
    setData(prev => [item, ...prev]);
    showToast('Mesure enregistrée !');
    setTab('dashboard');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
            <path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5S13.4 11.5 12 11.5z" />
          </svg>
        </div>
        <div>
          <h1>ChroniCare</h1>
          <span>Suivi santé personnalisé</span>
        </div>
      </header>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <Dashboard data={data} />}

      {tab === 'saisie' && (
        <>
          <p className="section-title">Nouvelle mesure</p>
          <Form addData={addData} onSuccess={() => setTab('dashboard')} />
        </>
      )}

      {tab === 'historique' && <History data={data} />}

      <Toast message={toast} />
    </div>
  );
}
