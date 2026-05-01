const express = require('express');
const db = require('../db');
const { authenticate, patientOnly, doctorOnly } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────
   Patient sends request to doctor
───────────────────────────────────────────── */
router.post('/', authenticate, patientOnly, (req, res) => {
  try {
    const { doctorId } = req.body;
    const patientId = req.user.id;

    if (!doctorId) {
      return res.status(400).json({ error: 'doctorId required' });
    }

    // Check if doctor exists
    const doctor = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(doctorId, 'doctor');
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check if already a patient of this doctor
    const existing = db.prepare('SELECT 1 FROM doctor_patients WHERE doctor_id = ? AND patient_id = ?').get(doctorId, patientId);
    if (existing) {
      return res.status(400).json({ error: 'Already a patient of this doctor' });
    }

    // Check if request already exists
    const existingRequest = db.prepare('SELECT * FROM doctor_requests WHERE patient_id = ? AND doctor_id = ?').get(patientId, doctorId);
    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return res.status(400).json({ error: 'Request already sent' });
      } else if (existingRequest.status === 'rejected') {
        // Allow resubmitting after rejection
        db.prepare('UPDATE doctor_requests SET status = ?, responded_at = NULL WHERE patient_id = ? AND doctor_id = ?').run('pending', patientId, doctorId);
        return res.json({ message: 'Request resubmitted' });
      }
    }

    // Create request
    const result = db.prepare(`
      INSERT INTO doctor_requests (patient_id, doctor_id, status)
      VALUES (?, ?, 'pending')
    `).run(patientId, doctorId);

    res.json({ id: result.lastInsertRowid, message: 'Request sent' });
  } catch (err) {
    console.error('Request error:', err);
    res.status(500).json({ error: 'Failed to send request' });
  }
});

/* ─────────────────────────────────────────────
   Patient gets their own requests
───────────────────────────────────────────── */
router.get('/patient', authenticate, patientOnly, (req, res) => {
  try {
    const patientId = req.user.id;

    const requests = db.prepare(`
      SELECT 
        r.id,
        r.doctor_id,
        r.status,
        r.requested_at,
        r.responded_at,
        u.first_name,
        u.last_name,
        u.email,
        d.specialty,
        d.workplace_name,
        d.workplace_city
      FROM doctor_requests r
      JOIN users u ON u.id = r.doctor_id
      LEFT JOIN doctor_profiles d ON d.user_id = r.doctor_id
      WHERE r.patient_id = ?
      ORDER BY r.requested_at DESC
    `).all(patientId);

    // Transform for display
    const transformed = requests.map(r => ({
      ...r,
      doctor_name: `${r.first_name} ${r.last_name}`,
    }));

    res.json(transformed);
  } catch (err) {
    console.error('Error fetching patient requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/* ─────────────────────────────────────────────
   Doctor lists pending requests
───────────────────────────────────────────── */
router.get('/doctor/pending', authenticate, doctorOnly, (req, res) => {
  try {
    const doctorId = req.user.id;

    const requests = db.prepare(`
      SELECT 
        r.id,
        r.patient_id,
        r.status,
        r.requested_at,
        u.first_name,
        u.last_name,
        u.email,
        p.dob,
        p.sex,
        p.blood_type,
        p.conditions,
        p.phone
      FROM doctor_requests r
      JOIN users u ON u.id = r.patient_id
      LEFT JOIN patient_profiles p ON p.user_id = r.patient_id
      WHERE r.doctor_id = ? AND r.status = 'pending'
      ORDER BY r.requested_at DESC
    `).all(doctorId);

    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

/* ─────────────────────────────────────────────
   Doctor accepts or rejects request
───────────────────────────────────────────── */
router.put('/:requestId/:action', authenticate, doctorOnly, (req, res) => {
  try {
    const { requestId, action } = req.params;
    const doctorId = req.user.id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be accept or reject' });
    }

    // Get request
    const request = db.prepare('SELECT * FROM doctor_requests WHERE id = ? AND doctor_id = ?').get(requestId, doctorId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    const now = new Date().toISOString();

    if (action === 'accept') {
      // Add to doctor_patients if not already there
      const existing = db.prepare('SELECT 1 FROM doctor_patients WHERE doctor_id = ? AND patient_id = ?').get(doctorId, request.patient_id);
      if (!existing) {
        db.prepare('INSERT INTO doctor_patients (doctor_id, patient_id) VALUES (?, ?)').run(doctorId, request.patient_id);
      }
    }

    // Update request status
    db.prepare('UPDATE doctor_requests SET status = ?, responded_at = ? WHERE id = ?').run(action === 'accept' ? 'accepted' : 'rejected', now, requestId);

    res.json({ message: `Request ${action}ed` });
  } catch (err) {
    console.error('Error processing request:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

module.exports = router;
