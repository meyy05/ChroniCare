import styles from './StatCard.module.css';

export default function StatCard({ label, value, unit, highlight }) {
  return (
    <div className={`${styles.card} ${highlight ? styles.highlight : ''}`}>
      <div className={styles.value}>{value !== null && value !== undefined ? value : '—'}{unit && value !== null ? <span className={styles.unit}> {unit}</span> : ''}</div>
      <div className={styles.label}>{label}</div>
    </div>
  );
}