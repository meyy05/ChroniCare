const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');

const DB_PATH  = process.env.DB_PATH || path.join(__dirname, 'chronicare.db');
const db       = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ─────────────────────────────────────────────
   Schema
───────────────────────────────────────────── */
db.exec(`
  -- Users table (patients + doctors)
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT    UNIQUE NOT NULL,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL DEFAULT 'patient',  -- 'patient' | 'doctor'
    first_name  TEXT    NOT NULL,
    last_name   TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Patient profiles
  CREATE TABLE IF NOT EXISTS patient_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    dob         TEXT,
    sex         TEXT,
    blood_type  TEXT,
    conditions  TEXT,
    phone       TEXT,
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Doctor profiles
  CREATE TABLE IF NOT EXISTS doctor_profiles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id         INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    practice_type   TEXT    NOT NULL DEFAULT 'hospital', -- hospital | private | cabinet
    workplace_name  TEXT,
    workplace_city  TEXT,
    specialty       TEXT,
    phone           TEXT,
    updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Doctor–patient relationship
  CREATE TABLE IF NOT EXISTS doctor_patients (
    doctor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    added_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (doctor_id, patient_id)
  );

  -- Patient requests to be a doctor's patient
  CREATE TABLE IF NOT EXISTS doctor_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doctor_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'pending',  -- pending | accepted | rejected
    requested_at TEXT   NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT,
    UNIQUE(patient_id, doctor_id)
  );

  -- Chat messages between doctor and patient
  CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    read_at     TEXT
  );

  -- Health entries
  CREATE TABLE IF NOT EXISTS health_entries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL,   -- glycemie | tension | poids | frequence
    val         REAL    NOT NULL,
    date        TEXT    NOT NULL,
    time        TEXT,
    context     TEXT,
    note        TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  -- Per-patient thresholds
  CREATE TABLE IF NOT EXISTS thresholds (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT    NOT NULL,
    min_val     REAL    NOT NULL,
    max_val     REAL    NOT NULL,
    UNIQUE(patient_id, type)
  );
`);

/* ─────────────────────────────────────────────
   Seed default data (only if DB is empty)
───────────────────────────────────────────── */
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;

if (userCount === 0) {
  const salt = bcrypt.genSaltSync(10);

  // Seed doctor
  const doctorId = db.prepare(`
    INSERT INTO users (email, password, role, first_name, last_name)
    VALUES (?, ?, 'doctor', ?, ?)
  `).run('doctor@chronicare.tn', bcrypt.hashSync('doctor123', salt), 'Dr.', 'Hamed').lastInsertRowid;
  db.prepare(`
    INSERT INTO doctor_profiles (user_id, practice_type, workplace_name, workplace_city, specialty, phone)
    VALUES (?, 'hospital', ?, ?, ?, ?)
  `).run(doctorId, 'CHU Demo', 'Tunis', 'Médecine générale', '');

  // Seed patients
  const patients = [
    { email: 'ahmed@mail.com',  pw: 'patient123', fn: 'Ahmed',  ln: 'Bensalem',
      dob: '1978-03-14', sex: 'M', blood: 'A+', cond: 'Diabète type 2, Hypertension' },
    { email: 'fatma@mail.com',  pw: 'patient123', fn: 'Fatma',  ln: 'Mansouri',
      dob: '1965-07-22', sex: 'F', blood: 'O+', cond: 'Hypertension, Obésité' },
    { email: 'karim@mail.com',  pw: 'patient123', fn: 'Karim',  ln: 'Trabelsi',
      dob: '1990-11-05', sex: 'M', blood: 'B+', cond: 'Diabète type 1' },
  ];

  const insertUser    = db.prepare(`INSERT INTO users (email, password, role, first_name, last_name) VALUES (?, ?, 'patient', ?, ?)`);
  const insertProfile = db.prepare(`INSERT INTO patient_profiles (user_id, dob, sex, blood_type, conditions) VALUES (?, ?, ?, ?, ?)`);
  const insertDoctorProfile = db.prepare(`INSERT INTO doctor_profiles (user_id, practice_type, workplace_name, workplace_city, specialty, phone) VALUES (?, ?, ?, ?, ?, ?)`);
  const linkDoc       = db.prepare(`INSERT INTO doctor_patients (doctor_id, patient_id) VALUES (?, ?)`);
  const insertThr     = db.prepare(`INSERT INTO thresholds (patient_id, type, min_val, max_val) VALUES (?, ?, ?, ?)`);
  const insertEntry   = db.prepare(`INSERT INTO health_entries (patient_id, type, val, date, time, context, note) VALUES (?, ?, ?, ?, ?, ?, ?)`);

  const defaultThresholds = [
    { type: 'glycemie',  min: 0.70, max: 1.26 },
    { type: 'tension',   min: 90,   max: 139  },
    { type: 'poids',     min: 50,   max: 120  },
    { type: 'frequence', min: 60,   max: 100  },
  ];

  const seedEntries = [
    { type: 'glycemie',  val: 1.10, date: '2026-04-30', time: '07:30', context: 'À jeun',         note: '' },
    { type: 'tension',   val: 128,  date: '2026-04-30', time: '08:00', context: 'Au repos',        note: '' },
    { type: 'glycemie',  val: 1.85, date: '2026-04-29', time: '12:45', context: 'Après repas',     note: 'Repas copieux' },
    { type: 'poids',     val: 73.5, date: '2026-04-29', time: '07:00', context: 'Matin',           note: '' },
    { type: 'tension',   val: 142,  date: '2026-04-28', time: '09:15', context: 'Après exercice',  note: 'Légèrement stressé' },
    { type: 'glycemie',  val: 0.95, date: '2026-04-28', time: '07:00', context: 'À jeun',          note: '' },
    { type: 'frequence', val: 72,   date: '2026-04-27', time: '06:30', context: 'Au repos',        note: '' },
    { type: 'glycemie',  val: 2.10, date: '2026-04-26', time: '14:00', context: 'Après repas',     note: 'Déjeuner au restaurant' },
    { type: 'tension',   val: 118,  date: '2026-04-25', time: '08:30', context: 'Matin',           note: '' },
    { type: 'glycemie',  val: 1.05, date: '2026-04-24', time: '07:15', context: 'À jeun',          note: '' },
    { type: 'frequence', val: 88,   date: '2026-04-23', time: '17:00', context: 'Après exercice',  note: '30 min marche' },
    { type: 'poids',     val: 73.8, date: '2026-04-22', time: '07:00', context: 'Matin',           note: '' },
  ];

  const seedAll = db.transaction(() => {
    for (const p of patients) {
      const pid = insertUser.run(p.email, bcrypt.hashSync(p.pw, salt), p.fn, p.ln).lastInsertRowid;
      insertProfile.run(pid, p.dob, p.sex, p.blood, p.cond);
      linkDoc.run(doctorId, pid);
      for (const t of defaultThresholds) insertThr.run(pid, t.type, t.min, t.max);
      // Only first patient gets mock entries
      if (pid === 2) {
        for (const e of seedEntries) insertEntry.run(pid, e.type, e.val, e.date, e.time, e.context, e.note);
      }
    }
  });

  seedAll();
  console.log('✅  Database seeded with demo data');
}

module.exports = db;
