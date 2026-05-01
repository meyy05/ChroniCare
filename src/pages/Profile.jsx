import { useState } from 'react';
import { initials, formatDate } from '../utils/constants';
import styles from './Profile.module.css';

const BLOOD_TYPES = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export default function Profile({ profile, updateProfile, data, showToast }) {
  const [local, setLocal] = useState({ ...profile });
  const [editing, setEditing] = useState(false);

  const handle = (key, val) => setLocal(p => ({ ...p, [key]: val }));

  const save = () => {
    updateProfile(local);
    setEditing(false);
    showToast('Profil mis à jour');
  };

  const cancel = () => {
    setLocal({ ...profile });
    setEditing(false);
  };

  const age = calcAge(profile.dob);
  const ini = initials(profile.firstName, profile.lastName);

  // quick stats from data
  const total    = data.length;
  const thisWeek = data.filter(d => {
    const diff = (Date.now() - new Date(d.date)) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  }).length;
  const lastDate = data[0]?.date;

  return (
    <div>
      {/* profile header */}
      <div className={styles.headerCard}>
        <div className={styles.avatar}>{ini}</div>
        <div className={styles.headerInfo}>
          <h2 className={styles.fullName}>{profile.firstName} {profile.lastName}</h2>
          <p className={styles.sub}>
            {age !== null ? `${age} ans` : ''}
            {profile.bloodType ? ` · Groupe ${profile.bloodType}` : ''}
            {profile.sex ? ` · ${profile.sex === 'M' ? 'Homme' : profile.sex === 'F' ? 'Femme' : 'Autre'}` : ''}
          </p>
          {profile.conditions && (
            <p className={styles.conditions}>{profile.conditions}</p>
          )}
        </div>
        <button className={styles.editBtn} onClick={() => setEditing(e => !e)}>
          {editing ? 'Annuler' : 'Modifier'}
        </button>
      </div>

      {/* quick stats */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{total}</span>
          <span className={styles.statLbl}>Mesures totales</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{thisWeek}</span>
          <span className={styles.statLbl}>Cette semaine</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statVal}>{lastDate ? formatDate(lastDate) : '—'}</span>
          <span className={styles.statLbl}>Dernière mesure</span>
        </div>
      </div>

      {/* edit form */}
      {editing && (
        <div className={styles.formCard}>
          <p className={styles.formTitle}>Modifier le profil</p>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label>Prénom</label>
              <input value={local.firstName} onChange={e => handle('firstName', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Nom</label>
              <input value={local.lastName} onChange={e => handle('lastName', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Date de naissance</label>
              <input type="date" value={local.dob} onChange={e => handle('dob', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label>Sexe</label>
              <select value={local.sex} onChange={e => handle('sex', e.target.value)}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
                <option value="-">Non précisé</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>Groupe sanguin</label>
              <select value={local.bloodType} onChange={e => handle('bloodType', e.target.value)}>
                <option value="">—</option>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label>Médecin traitant</label>
              <input value={local.doctor} onChange={e => handle('doctor', e.target.value)} placeholder="Dr. ..." />
            </div>
            <div className={styles.field}>
              <label>Téléphone</label>
              <input value={local.phone} onChange={e => handle('phone', e.target.value)} placeholder="+216 ..." />
            </div>
            <div className={styles.field}>
              <label>Email</label>
              <input type="email" value={local.email} onChange={e => handle('email', e.target.value)} placeholder="exemple@mail.com" />
            </div>
            <div className={`${styles.field} ${styles.fullCol}`}>
              <label>Pathologies / conditions</label>
              <input value={local.conditions} onChange={e => handle('conditions', e.target.value)} placeholder="Diabète type 2, Hypertension..." />
            </div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} onClick={cancel}>Annuler</button>
            <button className={styles.btnPrimary} onClick={save}>Enregistrer</button>
          </div>
        </div>
      )}

      {/* doctor info (read-only) */}
      {!editing && (profile.doctor || profile.phone || profile.email) && (
        <div className={styles.infoCard}>
          <p className={styles.formTitle}>Informations de contact</p>
          <div className={styles.infoGrid}>
            {profile.doctor && <InfoRow icon="👨‍⚕️" label="Médecin" value={profile.doctor} />}
            {profile.phone  && <InfoRow icon="📞" label="Téléphone" value={profile.phone} />}
            {profile.email  && <InfoRow icon="✉️" label="Email" value={profile.email} />}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.6rem 0', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-primary)', marginTop: 1 }}>{value}</div>
      </div>
    </div>
  );
}
