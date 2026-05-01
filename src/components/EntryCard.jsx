import Badge from './Badge';
import { ICONS, LABELS, UNITS, getStatus, formatDate } from '../utils/constants';
import styles from './EntryCard.module.css';

const ICON_BG = {
  glycemie:  '#eff6ff',
  tension:   '#f5f3ff',
  poids:     '#f0fdf4',
  frequence: '#fffbeb',
};

export default function EntryCard({ item, thresholds, onDelete }) {
  const status = getStatus(item.type, item.val, thresholds);
  const note = [item.context, item.note].filter(Boolean).join(' · ');

  return (
    <div className={styles.entry}>
      <div className={styles.icon} style={{ background: ICON_BG[item.type] || '#f3f4f6' }}>
        {ICONS[item.type] || '📊'}
      </div>
      <div className={styles.info}>
        <div className={styles.top}>
          <span className={styles.typeName}>{LABELS[item.type] || item.type}</span>
          <Badge level={status.level} label={status.label} />
        </div>
        <div className={styles.date}>{formatDate(item.date)}{item.time ? ` — ${item.time}` : ''}</div>
        {note && <div className={styles.note}>{note}</div>}
      </div>
      <div className={styles.right}>
        <div className={styles.valBox}>
          <span className={styles.num}>{item.val}</span>
          <span className={styles.unit}>{UNITS[item.type] || ''}</span>
        </div>
        {onDelete && (
          <button className={styles.deleteBtn} onClick={() => onDelete(item.id)} aria-label="Supprimer">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
