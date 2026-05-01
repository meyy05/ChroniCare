import { useState } from 'react';
import EntryCard from '../components/EntryCard';
import styles from './History.module.css';

const FILTERS = [
  { key: 'all',      label: 'Tout' },
  { key: 'glycemie', label: 'Glycémie' },
  { key: 'tension',  label: 'Tension' },
  { key: 'poids',    label: 'Poids' },
  { key: 'frequence',label: 'Fréquence' },
];

export default function History({ data, thresholds, onDelete }) {
  const [filter, setFilter] = useState('all');
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = (filter === 'all' ? data : data.filter(d => d.type === filter))
    .slice()
    .sort((a, b) => {
      const cmp = (a.date + a.time).localeCompare(b.date + b.time);
      return sortAsc ? cmp : -cmp;
    });

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.filterBar}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className={`${styles.fbtn} ${filter === f.key ? styles.active : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          className={styles.sortBtn}
          onClick={() => setSortAsc(p => !p)}
          title="Changer l'ordre"
        >
          {sortAsc ? '↑ Ancien' : '↓ Récent'}
        </button>
      </div>

      <p className={styles.count}>{filtered.length} mesure{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0
        ? <div className={styles.empty}>Aucune mesure pour ce filtre</div>
        : <div className={styles.list}>
            {filtered.map(item => (
              <EntryCard key={item.id} item={item} thresholds={thresholds} onDelete={onDelete} />
            ))}
          </div>
      }
    </div>
  );
}
