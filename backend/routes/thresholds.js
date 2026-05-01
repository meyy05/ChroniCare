const express = require('express');
const db      = require('../db');
const { authenticate, selfOrDoctor } = require('../middleware/auth');

const router      = express.Router({ mergeParams: true });
const VALID_TYPES = ['glycemie', 'tension', 'poids', 'frequence'];

/**
 * GET /api/patients/:patientId/thresholds
 */
router.get('/', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const rows      = db.prepare('SELECT * FROM thresholds WHERE patient_id = ?').all(patientId);

  const result = {};
  for (const r of rows) {
    result[r.type] = { min: r.min_val, max: r.max_val };
  }
  return res.json(result);
});

/**
 * PUT /api/patients/:patientId/thresholds
 * Body: { glycemie?: { min, max }, tension?: { min, max }, … }
 * Upserts thresholds for the given types.
 */
router.put('/', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const updates   = req.body;

  const upsert = db.prepare(`
    INSERT INTO thresholds (patient_id, type, min_val, max_val)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(patient_id, type) DO UPDATE SET
      min_val = excluded.min_val,
      max_val = excluded.max_val
  `);

  const errors = [];
  const saved  = [];

  const applyAll = db.transaction(() => {
    for (const type of VALID_TYPES) {
      if (!updates[type]) continue;
      const { min, max } = updates[type];
      if (isNaN(Number(min)) || isNaN(Number(max))) {
        errors.push(`Valeurs min/max invalides pour ${type}`);
        continue;
      }
      if (Number(min) >= Number(max)) {
        errors.push(`min doit être inférieur à max pour ${type}`);
        continue;
      }
      upsert.run(patientId, type, Number(min), Number(max));
      saved.push(type);
    }
  });

  applyAll();

  if (errors.length > 0 && saved.length === 0) {
    return res.status(400).json({ errors });
  }

  const rows   = db.prepare('SELECT * FROM thresholds WHERE patient_id = ?').all(patientId);
  const result = {};
  for (const r of rows) result[r.type] = { min: r.min_val, max: r.max_val };

  return res.json({ thresholds: result, updated: saved, errors });
});

/**
 * DELETE /api/patients/:patientId/thresholds/:type
 * Reset one threshold to default
 */
router.delete('/:type', authenticate, selfOrDoctor, (req, res) => {
  const { type }  = req.params;
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Type invalide' });
  }

  const defaults = {
    glycemie:  { min: 0.70, max: 1.26 },
    tension:   { min: 90,   max: 139  },
    poids:     { min: 50,   max: 120  },
    frequence: { min: 60,   max: 100  },
  };

  const { min, max } = defaults[type];
  db.prepare(`
    INSERT INTO thresholds (patient_id, type, min_val, max_val)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(patient_id, type) DO UPDATE SET min_val = ?, max_val = ?
  `).run(Number(req.params.patientId), type, min, max, min, max);

  return res.json({ type, min, max, message: 'Seuil réinitialisé aux valeurs par défaut' });
});

module.exports = router;
