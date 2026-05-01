const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('./db');
const { authenticate, JWT_SECRET } = require('./middleware/auth');

const router = express.Router();

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}

/* ── Helper: sign a JWT ── */
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, firstName: user.first_name, lastName: user.last_name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/* ── Helper: safe user object ── */
function publicUser(user) {
  const { password: _pw, ...rest } = user;
  return rest;
}

/**
 * POST /api/auth/register
 * Body:
 *  patient: { email, password, role, firstName, lastName, dob, sex, bloodType, conditions, phone }
 *  doctor:  { email, password, role, firstName, lastName, practiceType, workplaceName, workplaceCity, specialty, phone }
 */
router.post('/register', (req, res) => {
  const {
    email,
    password,
    role = 'patient',
    firstName,
    lastName,
    dob,
    sex,
    bloodType,
    conditions,
    phone,
    practiceType = 'hospital',
    workplaceName,
    workplaceCity,
    specialty,
  } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Tous les champs sont requis' });
  }
  if (!['patient', 'doctor'].includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit comporter au moins 6 caractères' });
  }
  if (role === 'doctor' && !['hospital', 'private', 'cabinet'].includes(practiceType)) {
    return res.status(400).json({ error: 'Type de pratique invalide' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'Adresse e-mail déjà utilisée' });

  const hash  = bcrypt.hashSync(password, 10);
  const stmt  = db.prepare('INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, ?, ?, ?, ?)');
  const result = stmt.run(email, hash, role, firstName, lastName);
  const userId = result.lastInsertRowid;

  // Create default patient profile + thresholds
  if (role === 'patient') {
    db.prepare('INSERT INTO patient_profiles (user_id) VALUES (?)').run(userId);
    const defaults = [
      { type: 'glycemie',  min: 0.70, max: 1.26 },
      { type: 'tension',   min: 90,   max: 139  },
      { type: 'poids',     min: 50,   max: 120  },
      { type: 'frequence', min: 60,   max: 100  },
    ];
    const thrStmt = db.prepare('INSERT INTO thresholds (patient_id, type, min_val, max_val) VALUES (?, ?, ?, ?)');
    for (const t of defaults) thrStmt.run(userId, t.type, t.min, t.max);

    const seedEntryStmt = db.prepare('INSERT INTO health_entries (patient_id, type, val, date, time, context, note) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const seedEntries = [
      { type: 'glycemie',  val: 1.08, date: daysAgo(2), time: '07:45', context: 'À jeun',      note: 'Suivi de départ' },
      { type: 'tension',   val: 126,  date: daysAgo(1), time: '08:20', context: 'Au repos',    note: '' },
      { type: 'poids',     val: 74.2, date: daysAgo(3), time: '07:10', context: 'Matin',       note: '' },
      { type: 'frequence', val: 71,   date: daysAgo(1), time: '18:00', context: 'Au repos',    note: '' },
      { type: 'glycemie',  val: 1.72, date: daysAgo(0), time: '13:10', context: 'Après repas', note: 'Premier enregistrement' },
    ];
    for (const entry of seedEntries) {
      seedEntryStmt.run(userId, entry.type, entry.val, entry.date, entry.time, entry.context, entry.note);
    }
  }

  const user  = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (role === 'doctor') {
    db.prepare(
      'INSERT INTO doctor_profiles (user_id, practice_type, workplace_name, workplace_city, specialty, phone) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(userId, practiceType, workplaceName || null, workplaceCity || null, specialty || null, phone || null);
  }

  if (role === 'patient') {
    db.prepare(
      'UPDATE patient_profiles SET dob = ?, sex = ?, blood_type = ?, conditions = ?, phone = ? WHERE user_id = ?'
    ).run(dob || null, sex || null, bloodType || null, conditions || null, phone || null, userId);
  }

  const token = signToken(user);

  return res.status(201).json({ token, user: publicUser(user) });
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' });

  const ok = bcrypt.compareSync(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Identifiants incorrects' });

  const token = signToken(user);
  return res.json({ token, user: publicUser(user) });
});

/**
 * GET /api/auth/me
 * Returns current user + profile (if patient)
 */
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const data = { ...publicUser(user) };

  if (user.role === 'patient') {
    const profile = db.prepare('SELECT * FROM patient_profiles WHERE user_id = ?').get(user.id);
    data.profile  = profile || null;
  } else if (user.role === 'doctor') {
    const profile = db.prepare('SELECT * FROM doctor_profiles WHERE user_id = ?').get(user.id);
    data.profile = profile || null;
  }

  return res.json(data);
});

/**
 * PUT /api/auth/me
 * Update own profile (patient fields: dob, sex, bloodType, conditions, phone)
 */
router.put('/me', authenticate, (req, res) => {
  const { firstName, lastName, dob, sex, bloodType, conditions, phone } = req.body;

  // Update name fields in users
  if (firstName || lastName) {
    const fn = firstName || req.user.firstName;
    const ln = lastName  || req.user.lastName;
    db.prepare('UPDATE users SET first_name = ?, last_name = ? WHERE id = ?').run(fn, ln, req.user.id);
  }

  // Update patient profile
  if (req.user.role === 'patient') {
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
    `).run(req.user.id, dob, sex, bloodType, conditions, phone);
  } else if (req.user.role === 'doctor') {
    db.prepare(`
      INSERT INTO doctor_profiles (user_id, practice_type, workplace_name, workplace_city, specialty, phone, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        practice_type  = excluded.practice_type,
        workplace_name = excluded.workplace_name,
        workplace_city = excluded.workplace_city,
        specialty      = excluded.specialty,
        phone          = excluded.phone,
        updated_at     = excluded.updated_at
    `).run(req.user.id, req.body.practiceType || 'hospital', req.body.workplaceName || null, req.body.workplaceCity || null, req.body.specialty || null, phone || null);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  return res.json(publicUser(updated));
});

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Champs requis manquants' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Nouveau mot de passe trop court (min 6 caractères)' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.user.id);

  return res.json({ message: 'Mot de passe mis à jour' });
});

module.exports = router;
