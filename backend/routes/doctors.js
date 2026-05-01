const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────
   Get all doctors (with search)
───────────────────────────────────────────── */
router.get('/', authenticate, (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        d.specialty,
        d.practice_type,
        d.workplace_name,
        d.workplace_city,
        d.phone
      FROM users u
      JOIN doctor_profiles d ON d.user_id = u.id
      WHERE u.role = 'doctor'
    `;
    
    const params = [];

    if (search) {
      query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR d.specialty LIKE ? OR d.workplace_name LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY u.first_name, u.last_name';

    const doctors = db.prepare(query).all(...params);
    res.json(doctors);
  } catch (err) {
    console.error('Error fetching doctors:', err);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

/* ─────────────────────────────────────────────
   Get doctor by ID (patient perspective)
───────────────────────────────────────────── */
router.get('/:doctorId', authenticate, (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = db.prepare(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        d.specialty,
        d.practice_type,
        d.workplace_name,
        d.workplace_city,
        d.phone
      FROM users u
      JOIN doctor_profiles d ON d.user_id = u.id
      WHERE u.id = ? AND u.role = 'doctor'
    `).get(doctorId);

    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    res.json(doctor);
  } catch (err) {
    console.error('Error fetching doctor:', err);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

module.exports = router;
