const express = require('express');
const db = require('../db');

const router = express.Router();

// Public demo: profile
router.get('/patients/:patientId/profile', (req, res) => {
  const pid = Number(req.params.patientId);
  const user = db.prepare('SELECT id, first_name, last_name, email FROM users WHERE id = ?').get(pid);
  if (!user) return res.status(404).json({ error: 'Patient not found' });
  const profile = db.prepare('SELECT dob, sex, blood_type, conditions, phone FROM patient_profiles WHERE user_id = ?').get(pid) || {};
  return res.json({
    firstName: user.first_name,
    lastName: user.last_name,
    email: user.email,
    dob: profile.dob || null,
    sex: profile.sex || null,
    bloodType: profile.blood_type || null,
    conditions: profile.conditions || null,
    phone: profile.phone || '',
  });
});

// Public demo: entries (paginated-ish)
router.get('/patients/:patientId/entries', (req, res) => {
  const pid = Number(req.params.patientId);
  const entries = db.prepare('SELECT * FROM health_entries WHERE patient_id = ? ORDER BY date DESC, time DESC LIMIT 200').all(pid);
  return res.json({ entries, total: entries.length });
});

// Public demo: thresholds map
router.get('/patients/:patientId/thresholds', (req, res) => {
  const pid = Number(req.params.patientId);
  const rows = db.prepare('SELECT type, min_val AS min, max_val AS max FROM thresholds WHERE patient_id = ?').all(pid);
  const map = {};
  for (const r of rows) map[r.type] = { min: r.min, max: r.max };
  return res.json(map);
});

module.exports = router;
