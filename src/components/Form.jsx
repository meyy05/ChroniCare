import { useState } from 'react';
import { LABELS, UNITS, HINTS, PLACEHOLDERS, CONTEXTS } from '../utils/constants';
import styles from './Form.module.css';

const TYPES = ['glycemie', 'tension', 'poids', 'frequence'];

export default function Form({ addEntry, showToast, onSuccess }) {
  const now    = new Date();
  const today  = now.toISOString().split('T')[0];
  const time   = now.toTimeString().slice(0, 5);

  const [type,    setType]    = useState('glycemie');
  const [val,     setVal]     = useState('');
  const [date,    setDate]    = useState(today);
  const [heure,   setHeure]   = useState(time);
  const [context, setContext] = useState('');
  const [note,    setNote]    = useState('');
  const [error,   setError]   = useState('');

  const submit = () => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed <= 0) { setError('Veuillez entrer une valeur numérique valide.'); return; }
    if (!date) { setError('Veuillez sélectionner une date.'); return; }
    setError('');
    addEntry({ id: Date.now(), type, val: parsed, date, time: heure, context, note: note.trim() });
    showToast('Mesure enregistrée avec succès');
    setVal(''); setNote(''); setContext('');
    if (onSuccess) onSuccess();
  };

  return (
    <div className={styles.card}>
      <p className={styles.cardTitle}>Nouvelle mesure</p>

      <div className={styles.typeGrid}>
        {TYPES.map(t => (
          <button
            key={t}
            className={`${styles.typeBtn} ${type === t ? styles.typeActive : ''}`}
            onClick={() => { setType(t); setVal(''); setError(''); }}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>

      <div className={styles.hint}>{HINTS[type]}</div>

      <div className={styles.grid2}>
        <div className={styles.field}>
          <label>Valeur <span className={styles.unitLabel}>({UNITS[type]})</span></label>
          <input
            type="number"
            step="0.01"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder={PLACEHOLDERS[type]}
            className={styles.inputLarge}
          />
        </div>
        <div className={styles.field}>
          <label>Contexte</label>
          <select value={context} onChange={e => setContext(e.target.value)}>
            <option value="">— Optionnel</option>
            {CONTEXTS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label>Heure</label>
          <input type="time" value={heure} onChange={e => setHeure(e.target.value)} />
        </div>
        <div className={`${styles.field} ${styles.fullCol}`}>
          <label>Note libre</label>
          <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Remarque complémentaire..." />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}
      <button className={styles.btnPrimary} onClick={submit}>
        Enregistrer la mesure
      </button>
    </div>
  );
}