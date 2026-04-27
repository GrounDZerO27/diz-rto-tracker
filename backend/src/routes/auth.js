const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const pool     = require('../db');
const { sendPasswordResetEmail } = require('../email');

const JWT_SECRET  = process.env.JWT_SECRET  || 'dev-secret-change-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';
const APP_URL     = process.env.APP_URL || 'http://localhost:4200';

/**
 * POST /api/auth/register
 * Body: { fullName, employeeNo, email, password }
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, employeeNo, email, password } = req.body || {};
    if (!fullName || !employeeNo || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (fullName.trim().length > 100) {
      return res.status(400).json({ error: 'Full name must be 100 characters or fewer.' });
    }
    if (employeeNo.trim().length > 50) {
      return res.status(400).json({ error: 'Employee number must be 50 characters or fewer.' });
    }
    if (email.trim().length > 150) {
      return res.status(400).json({ error: 'Email must be 150 characters or fewer.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (password.length > 72) {
      return res.status(400).json({ error: 'Password must be 72 characters or fewer.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE employee_no = ? OR email = ?',
      [employeeNo.trim(), email.trim().toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Employee number or email already registered.' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      'INSERT INTO users (full_name, employee_no, email, password_hash) VALUES (?, ?, ?, ?)',
      [fullName.trim(), employeeNo.trim(), email.trim().toLowerCase(), hash]
    );

    const token = jwt.sign(
      { id: result.insertId, employeeNo: employeeNo.trim(), fullName: fullName.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    res.status(201).json({ token, fullName: fullName.trim(), employeeNo: employeeNo.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/login
 * Body: { employeeNo, password }
 */
router.post('/login', async (req, res) => {
  try {
    const { employeeNo, password } = req.body || {};
    if (!employeeNo || !password) {
      return res.status(400).json({ error: 'Employee number and password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT id, full_name, employee_no, password_hash FROM users WHERE employee_no = ?',
      [employeeNo.trim()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid employee number or password.' });
    }

    const user = rows[0];
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
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [rows] = await pool.query(
      'SELECT id, full_name FROM users WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    // Always respond the same to prevent email enumeration
    if (rows.length === 0) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const user  = rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing unused tokens for this user before creating a new one
    await pool.query(
      'UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0',
      [user.id]
    );

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expires]
    );

    const resetLink = `${APP_URL}/reset-password?token=${token}`;
    await sendPasswordResetEmail(email.trim().toLowerCase(), user.full_name, resetLink);

    res.json({ message: 'If that email is registered, a reset link has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Body: { token, password }
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const [rows] = await pool.query(
      'SELECT id, user_id FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [token]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    const { id: tokenId, user_id } = rows[0];
    const hash = await bcrypt.hash(password, 12);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user_id]);
    await pool.query('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [tokenId]);

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;