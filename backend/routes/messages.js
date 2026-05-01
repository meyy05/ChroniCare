const express = require('express');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/* ─────────────────────────────────────────────
   Send message
───────────────────────────────────────────── */
router.post('/', authenticate, (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'receiverId and content required' });
    }

    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Check if receiver exists
    const receiver = db.prepare('SELECT id FROM users WHERE id = ?').get(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Check if sender and receiver have a relationship (doctor-patient)
    const hasRelationship = db.prepare(`
      SELECT 1 FROM doctor_patients 
      WHERE (doctor_id = ? AND patient_id = ?) OR (doctor_id = ? AND patient_id = ?)
    `).get(senderId, receiverId, receiverId, senderId);

    if (!hasRelationship) {
      return res.status(403).json({ error: 'You can only message your doctor or patients' });
    }

    // Create message
    const result = db.prepare(`
      INSERT INTO messages (sender_id, receiver_id, content)
      VALUES (?, ?, ?)
    `).run(senderId, receiverId, content);

    res.json({ id: result.lastInsertRowid, message: 'Message sent' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/* ─────────────────────────────────────────────
   Get chat with specific user (doctor or patient)
───────────────────────────────────────────── */
router.get('/conversation/:userId', authenticate, (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Check if they have a relationship
    const hasRelationship = db.prepare(`
      SELECT 1 FROM doctor_patients 
      WHERE (doctor_id = ? AND patient_id = ?) OR (doctor_id = ? AND patient_id = ?)
    `).get(currentUserId, userId, userId, currentUserId);

    if (!hasRelationship) {
      return res.status(403).json({ error: 'No relationship found' });
    }

    // Get messages between them
    const messages = db.prepare(`
      SELECT 
        m.id,
        m.sender_id,
        m.receiver_id,
        m.content,
        m.created_at,
        m.read_at,
        u.first_name,
        u.last_name,
        u.role
      FROM messages m
      JOIN users u ON u.id = m.sender_id
      WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
      ORDER BY m.created_at ASC
    `).all(currentUserId, userId, userId, currentUserId);

    // Mark messages as read
    const now = new Date().toISOString();
    db.prepare('UPDATE messages SET read_at = ? WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL').run(now, currentUserId, userId);

    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/* ─────────────────────────────────────────────
   Get unread message count
───────────────────────────────────────────── */
router.get('/unread', authenticate, (req, res) => {
  try {
    const userId = req.user.id;

    const count = db.prepare(`
      SELECT COUNT(*) as unread FROM messages
      WHERE receiver_id = ? AND read_at IS NULL
    `).get(userId);

    res.json(count);
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
