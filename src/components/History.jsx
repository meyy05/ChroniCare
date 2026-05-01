import { useState } from 'react';
import EntryCard from './EntryCard';
import styles from './History.module.css';

const FILTERS = [
  { key: 'all', label: 'Tout' },
  { key: 'glycemie', label: 'Glycémie' },
  { key: 'tension', label: 'Tension' },
  { key: 'poids', label: 'Poids' },
  { key: 'frequence', label: 'Fréquence' },
];

export default function History({ data }) {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? data : data.filter(d => d.type === filter);

  return (
    <div>
      <div className={styles.filterBar}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`${styles.filterBtn} ${filter === f.key ? styles.active : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className={styles.list}>
        {filtered.length === 0
          ? <div className={styles.empty}>Aucune mesure pour ce filtre</div>
          : filtered.map(item => <EntryCard key={item.id} item={item} />)
        }
      </div>
    </div>
  );
}
