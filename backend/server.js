require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');

// Initialize DB (runs migrations + seeding)
require('./db');

// Route modules
const authRouter       = require('./auth');
const patientsRouter   = require('./routes/patients');
const entriesRouter    = require('./routes/entries');
const thresholdsRouter = require('./routes/thresholds');
const alertsRouter     = require('./routes/alerts');
const publicRouter     = require('./routes/public');
const doctorsRouter    = require('./routes/doctors');
const requestsRouter   = require('./routes/requests');
const messagesRouter   = require('./routes/messages');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ─────────────────────────────────────────────
   Middleware
───────────────────────────────────────────── */
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (dev only)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

/* ─────────────────────────────────────────────
   Routes
───────────────────────────────────────────── */
app.use('/api/auth',       authRouter);
app.use('/api/patients',   patientsRouter);
app.use('/api/doctors',    doctorsRouter);
app.use('/api/requests',   requestsRouter);
app.use('/api/messages',   messagesRouter);

// Nested patient resources
app.use('/api/patients/:patientId/entries',    entriesRouter);
app.use('/api/patients/:patientId/thresholds', thresholdsRouter);
app.use('/api/patients/:patientId/alerts',     alertsRouter);

// Public demo endpoints (no auth) used by the frontend in development/demo
app.use('/api/public', publicRouter);

// Doctor-level alert overview (not nested under a patient)
const { authenticate, doctorOnly } = require('./middleware/auth');
const db = require('./db');

const LABELS = { glycemie: 'Glycémie', tension: 'Tension artérielle', poids: 'Poids', frequence: 'Fréq. cardiaque' };
const UNITS  = { glycemie: 'g/L',      tension: 'mmHg',               poids: 'kg',    frequence: 'bpm' };

function getSeverity(type, val, min, max) {
  if (val >= min && val <= max) return null;
  if (type === 'glycemie'  && (val < 0.55 || val > 2.50)) return 'danger';
  if (type === 'tension'   && (val > 160  || val < 80))   return 'danger';
  if (type === 'frequence' && (val > 120  || val < 50))   return 'danger';
  return 'warning';
}

app.get('/api/alerts/overview', authenticate, doctorOnly, (req, res) => {
  const patientRows = db.prepare(`
    SELECT u.id FROM users u
    JOIN doctor_patients dp ON dp.patient_id = u.id
    WHERE dp.doctor_id = ?
  `).all(req.user.id);

  const summary = [];
  for (const { id: pid } of patientRows) {
    const patient = db.prepare('SELECT id, first_name, last_name FROM users WHERE id = ?').get(pid);
    const thrRows = db.prepare('SELECT * FROM thresholds WHERE patient_id = ?').all(pid);
    const thrMap  = Object.fromEntries(thrRows.map(t => [t.type, { min: t.min_val, max: t.max_val }]));
    const entries = db.prepare(
      'SELECT * FROM health_entries WHERE patient_id = ? ORDER BY date DESC, time DESC LIMIT 100'
    ).all(pid);

    let dangerCount = 0, warningCount = 0;
    const recentAlerts = [];
    for (const e of entries) {
      const thr = thrMap[e.type];
      if (!thr) continue;
      const sev = getSeverity(e.type, e.val, thr.min, thr.max);
      if (sev === 'danger')  dangerCount++;
      if (sev === 'warning') warningCount++;
      if (sev && recentAlerts.length < 3) {
        const label = LABELS[e.type] || e.type;
        const unit  = UNITS[e.type]  || '';
        recentAlerts.push({
          type:    e.type,
          val:     e.val,
          date:    e.date,
          level:   sev,
          message: e.val > thr.max
            ? `${label} élevée : ${e.val} ${unit}`
            : `${label} basse : ${e.val} ${unit}`,
        });
      }
    }

    summary.push({
      patientId:    pid,
      firstName:    patient.first_name,
      lastName:     patient.last_name,
      danger:       dangerCount,
      warning:      warningCount,
      totalEntries: entries.length,
      recentAlerts,
    });
  }

  return res.json(summary);
});

/* ─────────────────────────────────────────────
   Health check
───────────────────────────────────────────── */
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/* ─────────────────────────────────────────────
   404 catch-all
───────────────────────────────────────────── */
app.use((_req, res) => {
  res.status(404).json({ error: 'Route introuvable' });
});

/* ─────────────────────────────────────────────
   Global error handler
───────────────────────────────────────────── */
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

/* ─────────────────────────────────────────────
   Start
───────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀  ChroniCare API running on http://localhost:${PORT}`);
  console.log(`    Health check → http://localhost:${PORT}/api/health\n`);
});
