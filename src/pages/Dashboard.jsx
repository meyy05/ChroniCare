import { useEffect, useRef, useState } from 'react';
import EntryCard from '../components/EntryCard';
import StatCard from '../components/StatCard';
import Badge from '../components/Badge';
import { LABELS, UNITS, CHART_COLORS, getStatus, formatDate, computeStats } from '../utils/constants';
import styles from './Dashboard.module.css';

const METRIC_TYPES = ['glycemie', 'tension', 'poids', 'frequence'];

export default function Dashboard({ data, thresholds, alerts, onDelete }) {
  const [chartType, setChartType] = useState('glycemie');
  const [chartRange, setChartRange] = useState(10);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const filtered = data.filter(d => d.type === chartType);
  const sliced   = chartRange === 'all' ? [...filtered].reverse() : [...filtered].reverse().slice(-chartRange);
  const stats    = computeStats(sliced);

  useEffect(() => {
    if (!chartRef.current || !window.Chart) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const color  = CHART_COLORS[chartType] || '#2fa69e';
    const thr    = thresholds[chartType];
    const labels = sliced.map(d => d.date.slice(5).replace('-', '/') + (d.time ? ` ${d.time.slice(0,5)}` : ''));
    const values = sliced.map(d => d.val);

    const annotations = {};
    if (thr && window.Chart) {
      annotations.maxLine = { type: 'line', yMin: thr.max, yMax: thr.max, borderColor: '#dc2626', borderWidth: 1, borderDash: [4, 4], label: { content: `Max ${thr.max}`, display: true, position: 'end', font: { size: 10 }, color: '#dc2626', backgroundColor: 'transparent' } };
      annotations.minLine = { type: 'line', yMin: thr.min, yMax: thr.min, borderColor: '#1f7f79', borderWidth: 1, borderDash: [4, 4], label: { content: `Min ${thr.min}`, display: true, position: 'end', font: { size: 10 }, color: '#1f7f79', backgroundColor: 'transparent' } };
    }

    chartInstance.current = new window.Chart(chartRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: LABELS[chartType],
          data: values,
          borderColor: color,
          backgroundColor: color + '14',
          pointBackgroundColor: values.map(v => {
            if (!thr) return color;
            return (v < thr.min || v > thr.max) ? '#dc2626' : color;
          }),
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.35,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.y} ${UNITS[chartType] || ''}`,
            },
          },
        },
        scales: {
          x: { grid: { color: 'rgba(128,128,128,.08)' }, ticks: { font: { size: 10 }, color: '#9ca3af', maxRotation: 40 } },
          y: { grid: { color: 'rgba(128,128,128,.08)' }, ticks: { font: { size: 11 }, color: '#9ca3af' } },
        },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data, chartType, chartRange, thresholds]);

  return (
    <div>
      {data.length === 0 && (
        <div style={{
          padding: '1rem 1.1rem',
          marginBottom: '1rem',
          border: '1px solid var(--color-border-tertiary)',
          borderRadius: 14,
          background: 'var(--color-background-secondary)',
          color: 'var(--color-text-secondary)'
        }}>
          Aucune mesure enregistrée pour ce compte pour le moment.
        </div>
      )}

      {/* summary metric cards */}
      <div className={styles.metricsGrid}>
        {METRIC_TYPES.map(type => {
          const items = data.filter(d => d.type === type);
          const last  = items[0];
          const s     = last ? getStatus(type, last.val, thresholds) : null;
          return (
            <div key={type} className={`${styles.metricCard} ${s ? styles[s.level] : ''}`}>
              <div className={styles.mLabel}>{LABELS[type]}</div>
              <div className={styles.mVal}>
                {last ? <>{last.val}<span className={styles.mUnit}> {UNITS[type]}</span></> : '—'}
              </div>
              {s && <Badge level={s.level} label={s.label} />}
              <div className={styles.mDate}>{last ? formatDate(last.date) : 'Aucune mesure'}</div>
            </div>
          );
        })}
      </div>

      {/* chart + stats */}
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <span className={styles.sectionTitle}>Évolution</span>
          <div className={styles.chartControls}>
            <select value={chartType} onChange={e => setChartType(e.target.value)} className={styles.sel}>
              {METRIC_TYPES.map(t => <option key={t} value={t}>{LABELS[t]}</option>)}
            </select>
            <select value={chartRange} onChange={e => setChartRange(e.target.value)} className={styles.sel}>
              <option value={7}>7 mesures</option>
              <option value={10}>10 mesures</option>
              <option value={20}>20 mesures</option>
              <option value="all">Tout</option>
            </select>
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%', height: 210 }}>
          <canvas ref={chartRef} role="img" aria-label={`Courbe d'évolution de la ${LABELS[chartType]}`}>
            Graphique d'évolution de la {LABELS[chartType]}.
          </canvas>
        </div>
        {stats && (
          <div className={styles.statsRow}>
            <StatCard label="Minimum" value={stats.min.toFixed(chartType === 'glycemie' ? 2 : 0)} unit={UNITS[chartType]} />
            <StatCard label="Maximum" value={stats.max.toFixed(chartType === 'glycemie' ? 2 : 0)} unit={UNITS[chartType]} />
            <StatCard label="Moyenne" value={stats.avg.toFixed(chartType === 'glycemie' ? 2 : 0)} unit={UNITS[chartType]} highlight />
            <StatCard label="Mesures" value={stats.count} />
          </div>
        )}
      </div>

      {/* recent alerts */}
      {alerts.length > 0 && (
        <>
          <div className={styles.sectionTitle} style={{ marginBottom: '0.5rem' }}>
            Alertes récentes
            <span className={styles.alertCount}>{alerts.length}</span>
          </div>
          <div className={styles.alertList}>
            {alerts.slice(0, 3).map(a => (
              <div key={a.id} className={`${styles.alertRow} ${styles[a.level]}`}>
                <span className={`${styles.alertDot} ${styles[a.level]}`} />
                <span className={styles.alertMsg}>{a.message}</span>
                <span className={styles.alertDate}>{formatDate(a.date)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* recent entries */}
      <div className={styles.sectionTitle} style={{ marginTop: '1.25rem', marginBottom: '0.5rem' }}>Dernières mesures</div>
      <div className={styles.entryList}>
        {data.slice(0, 5).map(item => (
          <EntryCard key={item.id} item={item} thresholds={thresholds} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}
