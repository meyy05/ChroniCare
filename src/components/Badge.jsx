import styles from './Badge.module.css';

export default function Badge({ level = 'normal', label }) {
  return <span className={`${styles.badge} ${styles[level]}`}>{label}</span>;
}
