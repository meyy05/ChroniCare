const express = require('express');
const db      = require('../db');
const { authenticate, selfOrDoctor, doctorOnly } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

const LABELS = {
  glycemie:  'Glycémie',
  tension:   'Tension artérielle',
  poids:     'Poids',
  frequence: 'Fréq. cardiaque',
};

const UNITS = {
  glycemie:  'g/L',
  tension:   'mmHg',
  poids:     'kg',
  frequence: 'bpm',
};

function getSeverity(type, val, min, max) {
  if (val >= min && val <= max) return null;
  if (type === 'glycemie'  && (val < 0.55  || val > 2.50)) return 'danger';
  if (type === 'tension'   && (val > 160   || val < 80))   return 'danger';
  if (type === 'frequence' && (val > 120   || val < 50))   return 'danger';
  return 'warning';
}

function buildMessage(type, val, min, max) {
  const label = LABELS[type] || type;
  const unit  = UNITS[type]  || '';
  if (val > max) return `${label} élevée : ${val} ${unit} (seuil max : ${max} ${unit})`;
  if (val < min) return `${label} basse : ${val} ${unit} (seuil min : ${min} ${unit})`;
  return `${label} hors normes : ${val} ${unit}`;
}

/**
 * GET /api/patients/:patientId/alerts
 * Returns all out-of-range entries as alerts, sorted by date desc
 * Query: type, level (danger|warning), limit, offset
 */
router.get('/', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const { type, level, limit = 50, offset = 0 } = req.query;

  // Fetch thresholds
  const thrRows = db.prepare('SELECT * FROM thresholds WHERE patient_id = ?').all(patientId);
  const thrMap  = Object.fromEntries(thrRows.map(t => [t.type, { min: t.min_val, max: t.max_val }]));

  // Fetch entries
  let eQuery = 'SELECT * FROM health_entries WHERE patient_id = ?';
  const eArgs = [patientId];
  if (type) { eQuery += ' AND type = ?'; eArgs.push(type); }
  eQuery += ' ORDER BY date DESC, time DESC';

  const entries = db.prepare(eQuery).all(...eArgs);

  // Build alerts
  let alerts = [];
  for (const e of entries) {
    const thr = thrMap[e.type];
    if (!thr) continue;
    const severity = getSeverity(e.type, e.val, thr.min, thr.max);
    if (!severity) continue;
    alerts.push({
      id:       e.id,
      entryId:  e.id,
      type:     e.type,
      val:      e.val,
      date:     e.date,
      time:     e.time,
      context:  e.context,
      level:    severity,
      label:    severity === 'danger' ? 'Critique' : 'Limite',
      message:  buildMessage(e.type, e.val, thr.min, thr.max),
    });
  }

  // Filter by level
  if (level === 'danger' || level === 'warning') {
    alerts = alerts.filter(a => a.level === level);
  }

  const total  = alerts.length;
  const paged  = alerts.slice(Number(offset), Number(offset) + Number(limit));

  return res.json({ alerts: paged, total });
});

/**
 * GET /api/alerts/overview   (doctor route – across all their patients)
 */
router.get('/overview', authenticate, doctorOnly, (req, res) => {
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
    const entries = db.prepare('SELECT * FROM health_entries WHERE patient_id = ? ORDER BY date DESC, time DESC LIMIT 100').all(pid);

    let dangerCount = 0, warningCount = 0;
    for (const e of entries) {
      const thr = thrMap[e.type];
      if (!thr) continue;
      const sev = getSeverity(e.type, e.val, thr.min, thr.max);
      if (sev === 'danger')  dangerCount++;
      if (sev === 'warning') warningCount++;
    }

    summary.push({
      patientId:   pid,
      firstName:   patient.first_name,
      lastName:    patient.last_name,
      danger:      dangerCount,
      warning:     warningCount,
      total:       entries.length,
    });
  }

  return res.json(summary);
});

module.exports = router;
