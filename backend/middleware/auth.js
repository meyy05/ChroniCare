const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';

/**
 * Verify JWT and attach user to req.user
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant ou invalide' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token expiré ou invalide' });
  }
}

/**
 * Allow only doctors
 */
function doctorOnly(req, res, next) {
  if (req.user?.role !== 'doctor') {
    return res.status(403).json({ error: 'Accès réservé aux médecins' });
  }
  next();
}

/**
 * Allow only patients
 */
function patientOnly(req, res, next) {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ error: 'Accès réservé aux patients' });
  }
  next();
}

/**
 * Allow doctor OR the patient themselves
 */
function selfOrDoctor(req, res, next) {
  const targetId = parseInt(req.params.patientId, 10);
  if (req.user.role === 'doctor' || req.user.id === targetId) return next();
  return res.status(403).json({ error: 'Accès non autorisé' });
}

module.exports = { authenticate, doctorOnly, patientOnly, selfOrDoctor, JWT_SECRET };
