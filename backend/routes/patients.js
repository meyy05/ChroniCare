const express = require('express');
const db      = require('../db');
const { authenticate, doctorOnly, selfOrDoctor } = require('../middleware/auth');

const router = express.Router();

/* Helper: build full patient object */
function buildPatient(userId) {
  const user    = db.prepare('SELECT id, email, first_name, last_name, created_at FROM users WHERE id = ? AND role = ?').get(userId, 'patient');
  if (!user) return null;
  const profile = db.prepare('SELECT * FROM patient_profiles WHERE user_id = ?').get(userId) || {};
  return {
    id:         user.id,
    email:      user.email,
    firstName:  user.first_name,
    lastName:   user.last_name,
    createdAt:  user.created_at,
    dob:        profile.dob        || null,
    sex:        profile.sex        || null,
    bloodType:  profile.blood_type || null,
    conditions: profile.conditions || null,
    phone:      profile.phone      || null,
  };
}

/**
 * GET /api/patients
 * Doctor: list their patients
 * Patient: return own profile (convenience)
 */
router.get('/', authenticate, (req, res) => {
  if (req.user.role === 'doctor') {
    const rows = db.prepare(`
      SELECT u.id FROM users u
      JOIN doctor_patients dp ON dp.patient_id = u.id
      WHERE dp.doctor_id = ?
      ORDER BY u.last_name, u.first_name
    `).all(req.user.id);

    const patients = rows.map(r => buildPatient(r.id)).filter(Boolean);
    return res.json(patients);
  }

  // Patient: own info
  const own = buildPatient(req.user.id);
  return own ? res.json([own]) : res.status(404).json({ error: 'Introuvable' });
});

/**
 * GET /api/patients/me/doctors
 * Patient: list accepted doctors linked to their account
 */
router.get('/me/doctors', authenticate, (req, res) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Accès réservé aux patients' });
  }

  const doctors = db.prepare(`
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      d.practice_type,
      d.workplace_name,
      d.workplace_city,
      d.specialty,
      d.phone,
      dp.added_at
    FROM doctor_patients dp
    JOIN users u ON u.id = dp.doctor_id
    LEFT JOIN doctor_profiles d ON d.user_id = u.id
    WHERE dp.patient_id = ?
    ORDER BY dp.added_at DESC, u.last_name, u.first_name
  `).all(req.user.id).map(row => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    practiceType: row.practice_type,
    workplaceName: row.workplace_name,
    workplaceCity: row.workplace_city,
    specialty: row.specialty,
    phone: row.phone,
    addedAt: row.added_at,
  }));

  return res.json(doctors);
});

/**
 * GET /api/patients/:patientId
 * Doctor or the patient themselves
 */
router.get('/:patientId', authenticate, selfOrDoctor, (req, res) => {
  const patient = buildPatient(Number(req.params.patientId));
  if (!patient) return res.status(404).json({ error: 'Patient introuvable' });
  return res.json(patient);
});

/**
 * POST /api/patients
 * Doctor assigns existing patient by email
 * Body: { email }
 */
router.post('/', authenticate, doctorOnly, (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const user = db.prepare("SELECT * FROM users WHERE email = ? AND role = 'patient'").get(email);
  if (!user) return res.status(404).json({ error: 'Aucun patient avec cet email' });

  const exists = db.prepare('SELECT 1 FROM doctor_patients WHERE doctor_id = ? AND patient_id = ?').get(req.user.id, user.id);
  if (exists) return res.status(409).json({ error: 'Patient déjà dans votre liste' });

  db.prepare('INSERT INTO doctor_patients (doctor_id, patient_id) VALUES (?, ?)').run(req.user.id, user.id);

  return res.status(201).json(buildPatient(user.id));
});

/**
 * DELETE /api/patients/:patientId
 * Doctor removes patient from their list
 */
router.delete('/:patientId', authenticate, doctorOnly, (req, res) => {
  const patientId = Number(req.params.patientId);
  const result = db.prepare('DELETE FROM doctor_patients WHERE doctor_id = ? AND patient_id = ?').run(req.user.id, patientId);

  if (result.changes === 0) return res.status(404).json({ error: 'Association introuvable' });
  return res.json({ message: 'Patient retiré de votre liste' });
});

/**
 * PUT /api/patients/:patientId/profile
 * Update patient profile (doctor or patient themselves)
 * Body: { dob, sex, bloodType, conditions, phone }
 */
router.put('/:patientId/profile', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const { dob, sex, bloodType, conditions, phone } = req.body;

  db.prepare(`
    INSERT INTO patient_profiles (user_id, dob, sex, blood_type, conditions, phone, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET
      dob        = excluded.dob,
      sex        = excluded.sex,
      blood_type = excluded.blood_type,
      conditions = excluded.conditions,
      phone      = excluded.phone,
      updated_at = excluded.updated_at
  `).run(patientId, dob, sex, bloodType, conditions, phone);

  return res.json(buildPatient(patientId));
});

/**
 * GET /api/patients/:patientId/summary
 * Returns last measurement per metric + active alert counts
 */
router.get('/:patientId/summary', authenticate, selfOrDoctor, (req, res) => {
  const pid      = Number(req.params.patientId);
  const types    = ['glycemie', 'tension', 'poids', 'frequence'];
  const thr      = db.prepare('SELECT * FROM thresholds WHERE patient_id = ?').all(pid);
  const thrMap   = Object.fromEntries(thr.map(t => [t.type, { min: t.min_val, max: t.max_val }]));

  const lastPerType = {};
  for (const type of types) {
    lastPerType[type] = db.prepare(
      'SELECT * FROM health_entries WHERE patient_id = ? AND type = ? ORDER BY date DESC, time DESC LIMIT 1'
    ).get(pid, type) || null;
  }

  const allEntries  = db.prepare('SELECT * FROM health_entries WHERE patient_id = ? ORDER BY date DESC, time DESC').all(pid);
  let dangerCount   = 0;
  let warningCount  = 0;

  for (const e of allEntries) {
    const t = thrMap[e.type];
    if (!t) continue;
    if (e.val < t.min || e.val > t.max) {
      // rough severity
      if (e.type === 'glycemie'  && (e.val < 0.55  || e.val > 2.50)) dangerCount++;
      else if (e.type === 'tension'   && (e.val > 160   || e.val < 80))  dangerCount++;
      else if (e.type === 'frequence' && (e.val > 120   || e.val < 50))  dangerCount++;
      else warningCount++;
    }
  }

  return res.json({
    lastMeasurements: lastPerType,
    thresholds:       thrMap,
    alerts:           { danger: dangerCount, warning: warningCount },
    totalEntries:     allEntries.length,
  });
});

module.exports = router;
