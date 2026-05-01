import { ICONS, LABELS, UNITS, getStatus, formatDate } from '../utils/constants';
import styles from './EntryCard.module.css';

export default function EntryCard({ item }) {
  const s = getStatus(item.type, item.val);
  return (
    <div className={styles.entry}>
      <div className={`${styles.icon} ${styles[item.type]}`}>
        {ICONS[item.type] || '📊'}
      </div>
      <div className={styles.info}>
        <div className={styles.type}>
          {LABELS[item.type] || item.type}
          <span className={`${styles.pill} ${styles[s.cls]}`}>{s.label}</span>
        </div>
        <div className={styles.date}>
          {formatDate(item.date)}{item.time ? ` — ${item.time}` : ''}
        </div>
        {item.note && <div className={styles.note}>{item.note}</div>}
      </div>
      <div className={styles.valBox}>
        <div className={styles.num}>{item.val}</div>
        <div className={styles.unit}>{UNITS[item.type] || ''}</div>
      </div>
    </div>
  );
}
