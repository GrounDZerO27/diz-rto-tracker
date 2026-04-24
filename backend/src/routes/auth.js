const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ─── Mock user ────────────────────────────────────────────────────────────────
const MOCK_USER = {
  id:         1,
  employeeNo: '383949',
  fullName:   'Admin User',
  password:   'admin1234',
};
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Body: { employeeNo, password }
 */
router.post('/login', (req, res) => {
  const { employeeNo, password } = req.body || {};

  if (!employeeNo || !password) {
    return res.status(400).json({ error: 'Employee number and password are required.' });
  }

  if (employeeNo.trim() !== MOCK_USER.employeeNo || password !== MOCK_USER.password) {
    return res.status(401).json({ error: 'Invalid employee number or password.' });
  }

  const token = jwt.sign(
    { id: MOCK_USER.id, employeeNo: MOCK_USER.employeeNo, fullName: MOCK_USER.fullName },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  res.json({ token, fullName: MOCK_USER.fullName, employeeNo: MOCK_USER.employeeNo });
});

/**
 * POST /api/auth/register  — disabled in mock mode
 */
router.post('/register', (_req, res) => {
  res.status(403).json({ error: 'Registration is disabled in mock mode.' });
});

/**
 * POST /api/auth/forgot-password  — disabled in mock mode
 */
router.post('/forgot-password', (_req, res) => {
  res.status(403).json({ error: 'Password reset is disabled in mock mode.' });
});

/**
 * POST /api/auth/reset-password  — disabled in mock mode
 */
router.post('/reset-password', (_req, res) => {
  res.status(403).json({ error: 'Password reset is disabled in mock mode.' });
});

module.exports = router;