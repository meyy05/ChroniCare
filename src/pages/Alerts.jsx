import { useState } from 'react';
import { LABELS, UNITS, formatDate } from '../utils/constants';
import styles from './Alerts.module.css';

const TYPES = ['glycemie', 'tension', 'poids', 'frequence'];

export default function Alerts({ thresholds, updateThresholds, alerts, showToast }) {
  const [local, setLocal] = useState({ ...thresholds });

  const handleChange = (type, side, value) => {
    setLocal(prev => ({
      ...prev,
      [type]: { ...prev[type], [side]: parseFloat(value) || 0 },
    }));
  };

  const save = () => {
    updateThresholds(local);
    showToast('Seuils mis à jour');
  };

  return (
    <div>
      {/* alert summary banner */}
      {alerts.length > 0 && (
        <div className={styles.banner}>
          <span className={styles.bannerDot} />
          <span>
            <strong>{alerts.length} alerte{alerts.length > 1 ? 's' : ''} active{alerts.length > 1 ? 's' : ''}</strong>
            {' '}— vérifiez vos mesures récentes.
          </span>
        </div>
      )}

      {/* threshold settings */}
      <div className={styles.card}>
        <p className={styles.cardTitle}>Seuils critiques</p>
        <p className={styles.cardDesc}>
          Une alerte est générée automatiquement si une mesure dépasse ces valeurs.
        </p>

        {TYPES.map(type => (
          <div key={type} className={styles.row}>
            <div className={styles.rowLabel}>
              <span className={styles.typeName}>{LABELS[type]}</span>
              <span className={styles.typeUnit}>{UNITS[type]}</span>
            </div>
            <div className={styles.inputs}>
              <div className={styles.inputGroup}>
                <label>Min</label>
                <input
                  type="number"
                  step="0.01"
                  value={local[type]?.min ?? ''}
                  onChange={e => handleChange(type, 'min', e.target.value)}
                  className={styles.thInput}
                />
              </div>
              <span className={styles.sep}>—</span>
              <div className={styles.inputGroup}>
                <label>Max</label>
                <input
                  type="number"
                  step="0.01"
                  value={local[type]?.max ?? ''}
                  onChange={e => handleChange(type, 'max', e.target.value)}
                  className={styles.thInput}
                />
              </div>
            </div>
          </div>
        ))}

        <button className={styles.btnPrimary} onClick={save}>
          Enregistrer les seuils
        </button>
      </div>

      {/* alerts history */}
      <p className={styles.sectionTitle} style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
        Historique des alertes
        {alerts.length > 0 && <span className={styles.badge}>{alerts.length}</span>}
      </p>

      {alerts.length === 0
        ? <div className={styles.empty}>✅ Aucune alerte — toutes vos mesures sont dans les normes.</div>
        : <div className={styles.alertList}>
            {alerts.map(a => (
              <div key={a.id} className={`${styles.alertRow} ${styles[a.level]}`}>
                <div className={styles.alertLeft}>
                  <span className={`${styles.alertIcon} ${styles[a.level]}`}>
                    {a.level === 'danger' ? '🔴' : '🟡'}
                  </span>
                  <div>
                    <p className={styles.alertMsg}>{a.message}</p>
                    <p className={styles.alertMeta}>{formatDate(a.date)}{a.time ? ` — ${a.time}` : ''}</p>
                  </div>
                </div>
                <span className={`${styles.alertBadge} ${styles[a.level]}`}>
                  {a.level === 'danger' ? 'Critique' : 'Limite'}
                </span>
              </div>
            ))}
          </div>
      }
    </div>
  );
}
