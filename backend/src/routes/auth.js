
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
router.post('/login', async (req, res) => {
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


const crypto = require('crypto');
const nodemailer = require('nodemailer');

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Email is required.' });
  try {
    const conn = await pool.getConnection();
    const [users] = await conn.query('SELECT id, full_name FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length === 0) {
      conn.release();
      return res.status(404).json({ error: 'No account found for this email.' });
    }
    const user = users[0];
    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
    await conn.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.id, token, expiresAt]
    );
    conn.release();

    // Send email
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'RTO Tracker Password Reset',
      html: `<p>Hello ${user.full_name},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'Token and new password are required.' });
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT user_id, expires_at, used FROM password_reset_tokens WHERE token = ? LIMIT 1',
      [token]
    );
    if (rows.length === 0) {
      conn.release();
      return res.status(400).json({ error: 'Invalid or expired token.' });
    }
    const reset = rows[0];
    if (reset.used || new Date(reset.expires_at) < new Date()) {
      conn.release();
      return res.status(400).json({ error: 'Token expired or already used.' });
    }
    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    await conn.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, reset.user_id]);
    await conn.query('UPDATE password_reset_tokens SET used = 1 WHERE token = ?', [token]);
    conn.release();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

module.exports = router;