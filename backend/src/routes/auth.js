
const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');
const pool    = require('../db.mysql');

const JWT_SECRET  = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

/**
 * POST /api/auth/login
 * Body: { employeeNo, password }
 */
router.post('/login', (req, res) => {
  const { employeeNo, password } = req.body || {};


  if (!employeeNo || !password) {
    return res.status(400).json({ error: 'Employee number and password are required.' });
  }
  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query(
      'SELECT id, full_name, employee_no, password_hash FROM users WHERE employee_no = ? LIMIT 1',
      [employeeNo]
    );
    conn.release();
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid employee number or password.' });
    }
    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid employee number or password.' });
    }
    const token = jwt.sign(
      { id: user.id, employeeNo: user.employee_no, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    res.json({ token, fullName: user.full_name, employeeNo: user.employee_no });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});


/**
 * POST /api/auth/register
 * Body: { fullName, employeeNo, email, password }
 */
router.post('/register', async (req, res) => {
  const { fullName, employeeNo, email, password } = req.body || {};
  if (!fullName || !employeeNo || !email || !password) {
    return res.status(400).json({ error: 'All fields are required.' });
  }
  try {
    const conn = await pool.getConnection();
    // Check for duplicate employeeNo or email
    const [existing] = await conn.query(
      'SELECT id FROM users WHERE employee_no = ? OR email = ? LIMIT 1',
      [employeeNo, email]
    );
    if (existing.length > 0) {
      conn.release();
      return res.status(409).json({ error: 'Employee number or email already registered.' });
    }
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    // Insert user
    const [result] = await conn.query(
      'INSERT INTO users (full_name, employee_no, email, password_hash) VALUES (?, ?, ?, ?)',
      [fullName, employeeNo, email, passwordHash]
    );
    const userId = result.insertId;
    // Create JWT
    const token = jwt.sign(
      { id: userId, employeeNo, fullName },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    conn.release();
    res.json({ token, fullName, employeeNo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed.' });
  }
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