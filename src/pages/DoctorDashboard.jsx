import { useEffect, useState } from 'react';
import styles from './DoctorDashboard.module.css';
import API from '../services/api';

export default function DoctorDashboard({ token: tokenFromApp = '', doctorName = '', doctorProfile = null }) {
  const [token, setToken] = useState(tokenFromApp);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(tokenFromApp);
  }, [tokenFromApp]);

  useEffect(() => {
    if (tokenFromApp) {
      loadOverview(tokenFromApp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromApp]);

  async function loadOverview(explicitToken = token) {
    setLoading(true);
    setError('');
    setOverview(null);
    try {
      const res = await API.get('/alerts/overview', {
        headers: { Authorization: `Bearer ${explicitToken}` }
      });
      setOverview(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div>
          <h2 className={styles.title}>Vue Médecin — Aperçu des patients</h2>
          <p className={styles.subtitle}>
            {doctorName ? `Bienvenue, ${doctorName}.` : 'Connectez-vous pour voir vos patients.'}
          </p>
        </div>
        <button className={styles.btn} onClick={() => loadOverview()} disabled={loading || !token}>
          {loading ? 'Chargement…' : 'Rafraîchir'}
        </button>
      </div>

      {doctorProfile && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardHeader}>
            <div className={styles.patientName}>Mon profil médecin</div>
          </div>
          <div className={styles.meta}>
            {doctorProfile.practice_type ? `Type: ${doctorProfile.practice_type}` : 'Type de pratique non renseigné'}
          </div>
          <div className={styles.meta}>
            {doctorProfile.workplace_name || doctorProfile.workplace_city
              ? `${doctorProfile.workplace_name || 'Lieu non renseigné'}${doctorProfile.workplace_city ? `, ${doctorProfile.workplace_city}` : ''}`
              : 'Aucune structure renseignée'}
          </div>
          {doctorProfile.specialty && <div className={styles.meta}>Spécialité: {doctorProfile.specialty}</div>}
          {doctorProfile.phone && <div className={styles.meta}>Téléphone: {doctorProfile.phone}</div>}
        </div>
      )}

      <div className={styles.tokenRow}>
        <input
          className={styles.tokenInput}
          placeholder="JWT du médecin"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button className={styles.btn} onClick={() => loadOverview()} disabled={loading || !token}>
          {loading ? 'Chargement…' : 'Charger'}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {overview && Array.isArray(overview) && (
        <div className={styles.grid}>
          {overview.map(p => (
            <div key={p.patientId} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.patientName}>{p.firstName} {p.lastName}</div>
                <div className={styles.counts}>
                  <span className={styles.danger}>⚠️ {p.danger}</span>
                  <span className={styles.warning}>⚠ {p.warning}</span>
                </div>
              </div>
              <div className={styles.meta}>Mesures: {p.totalEntries}</div>
              {p.recentAlerts && p.recentAlerts.length > 0 && (
                <ul className={styles.alertsList}>
                  {p.recentAlerts.map((a, i) => (
                    <li key={i} className={styles.alertItem}>
                      <strong className={styles.alertLevel}>{a.level === 'danger' ? 'CRITIQUE' : 'Limite'}</strong>
                      <div className={styles.alertMsg}>{a.message}</div>
                      <div className={styles.alertDate}>{a.date} {a.time || ''}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {overview && (!Array.isArray(overview) || overview.length === 0) && (
        <div className={styles.empty}>
          Aucun patient n’est encore associé à ce compte.
          <br />
          Votre profil médecin est bien enregistré, mais vous devez encore ajouter des patients.
        </div>
      )}
    </div>
  );
}
