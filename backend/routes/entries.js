const express = require('express');
const db      = require('../db');
const { authenticate, selfOrDoctor } = require('../middleware/auth');

const router  = express.Router({ mergeParams: true }); // receives patientId from parent

const VALID_TYPES = ['glycemie', 'tension', 'poids', 'frequence'];

/**
 * GET /api/patients/:patientId/entries
 * Query params: type, from (YYYY-MM-DD), to, limit (default 50), offset
 */
router.get('/', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const { type, from, to, limit = 50, offset = 0 } = req.query;

  let query  = 'SELECT * FROM health_entries WHERE patient_id = ?';
  const args = [patientId];

  if (type && VALID_TYPES.includes(type)) {
    query += ' AND type = ?';
    args.push(type);
  }
  if (from) { query += ' AND date >= ?'; args.push(from); }
  if (to)   { query += ' AND date <= ?'; args.push(to); }

  query += ' ORDER BY date DESC, time DESC LIMIT ? OFFSET ?';
  args.push(Number(limit), Number(offset));

  const entries = db.prepare(query).all(...args);
  const total   = db.prepare(
    'SELECT COUNT(*) AS n FROM health_entries WHERE patient_id = ?'
  ).get(patientId).n;

  return res.json({ entries, total });
});

/**
 * GET /api/patients/:patientId/entries/:entryId
 */
router.get('/:entryId', authenticate, selfOrDoctor, (req, res) => {
  const entry = db.prepare('SELECT * FROM health_entries WHERE id = ? AND patient_id = ?')
    .get(Number(req.params.entryId), Number(req.params.patientId));

  if (!entry) return res.status(404).json({ error: 'Mesure introuvable' });
  return res.json(entry);
});

/**
 * POST /api/patients/:patientId/entries
 * Body: { type, val, date, time?, context?, note? }
 */
router.post('/', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const { type, val, date, time = null, context = null, note = null } = req.body;

  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `Type invalide. Valeurs acceptées : ${VALID_TYPES.join(', ')}` });
  }
  if (val === undefined || val === null || isNaN(Number(val)) || Number(val) <= 0) {
    return res.status(400).json({ error: 'Valeur numérique positive requise' });
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'Date requise au format YYYY-MM-DD' });
  }

  const result = db.prepare(`
    INSERT INTO health_entries (patient_id, type, val, date, time, context, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(patientId, type, Number(val), date, time, context, note);

  const created = db.prepare('SELECT * FROM health_entries WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json(created);
});

/**
 * PUT /api/patients/:patientId/entries/:entryId
 * Partial update: val, date, time, context, note
 */
router.put('/:entryId', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const entryId   = Number(req.params.entryId);

  const existing = db.prepare('SELECT * FROM health_entries WHERE id = ? AND patient_id = ?').get(entryId, patientId);
  if (!existing) return res.status(404).json({ error: 'Mesure introuvable' });

  const { val, date, time, context, note } = req.body;

  db.prepare(`
    UPDATE health_entries
    SET val = ?, date = ?, time = ?, context = ?, note = ?
    WHERE id = ? AND patient_id = ?
  `).run(
    val     !== undefined ? Number(val) : existing.val,
    date    !== undefined ? date    : existing.date,
    time    !== undefined ? time    : existing.time,
    context !== undefined ? context : existing.context,
    note    !== undefined ? note    : existing.note,
    entryId, patientId
  );

  return res.json(db.prepare('SELECT * FROM health_entries WHERE id = ?').get(entryId));
});

/**
 * DELETE /api/patients/:patientId/entries/:entryId
 */
router.delete('/:entryId', authenticate, selfOrDoctor, (req, res) => {
  const result = db.prepare('DELETE FROM health_entries WHERE id = ? AND patient_id = ?')
    .run(Number(req.params.entryId), Number(req.params.patientId));

  if (result.changes === 0) return res.status(404).json({ error: 'Mesure introuvable' });
  return res.json({ message: 'Mesure supprimée' });
});

/**
 * GET /api/patients/:patientId/entries/stats
 * Returns min/max/avg per type for the given period
 */
router.get('/stats/summary', authenticate, selfOrDoctor, (req, res) => {
  const patientId = Number(req.params.patientId);
  const { from, to } = req.query;

  let where = 'patient_id = ?';
  const args = [patientId];
  if (from) { where += ' AND date >= ?'; args.push(from); }
  if (to)   { where += ' AND date <= ?'; args.push(to); }

  const rows = db.prepare(`
    SELECT type,
           COUNT(*)  AS count,
           MIN(val)  AS min,
           MAX(val)  AS max,
           AVG(val)  AS avg
    FROM health_entries
    WHERE ${where}
    GROUP BY type
  `).all(...args);

  const result = {};
  for (const r of rows) {
    result[r.type] = {
      count: r.count,
      min:   Math.round(r.min   * 100) / 100,
      max:   Math.round(r.max   * 100) / 100,
      avg:   Math.round(r.avg   * 100) / 100,
    };
  }

  return res.json(result);
});

module.exports = router;
