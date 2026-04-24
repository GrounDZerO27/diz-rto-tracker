const express = require('express');
const router  = express.Router();
const pool = require('../db.mysql');
const auth                           = require('../middleware/auth');
const { toDateString, calculateRtoStats } = require('../rtoUtils');

/**
 * GET /api/attendance?year=2026&month=4
 */
router.get('/', auth, async (req, res) => {
  try {
    const year  = parseInt(req.query.year);
    const month = parseInt(req.query.month);
    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Valid year and month (1-12) are required.' });
    }
    const pad = n => String(n).padStart(2, '0');
    const startDate = `${year}-${pad(month)}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const conn = await pool.getConnection();
    const [attendance] = await conn.query(
      'SELECT date, status FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ?',
      [req.user.id, startDate, endDate]
    );
    const [holidays] = await conn.query(
      'SELECT date, name FROM holidays WHERE date BETWEEN ? AND ?',
      [startDate, endDate]
    );
    conn.release();

    const inOfficeDates = attendance.filter(r => r.status === 'IN_OFFICE').map(r => r.date);
    const approvedAbsenceDates = attendance.filter(r => r.status === 'APPROVED_ABSENCE').map(r => r.date);
    const holidayDates = holidays.map(h => h.date);

    const stats = calculateRtoStats(year, month, inOfficeDates, holidayDates, approvedAbsenceDates);

    res.json({ year, month, attendance, holidays, stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/attendance/checkin
 * Body: { date?: 'YYYY-MM-DD', status?: 'IN_OFFICE' | 'APPROVED_ABSENCE' }
 */
router.post('/checkin', auth, async (req, res) => {
  try {
    const dateStr = req.body.date || toDateString(new Date());
    const status  = req.body.status || 'IN_OFFICE';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    if (!['IN_OFFICE', 'APPROVED_ABSENCE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const conn = await pool.getConnection();
    // Upsert attendance
    await conn.query(
      'INSERT INTO attendance (user_id, date, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)',
      [req.user.id, dateStr, status]
    );
    conn.release();
    res.json({ success: true, date: dateStr, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/attendance/:date
 */
router.delete('/:date', auth, async (req, res) => {
  try {
    const dateStr = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    const conn = await pool.getConnection();
    const [result] = await conn.query(
      'DELETE FROM attendance WHERE user_id = ? AND date = ?',
      [req.user.id, dateStr]
    );
    conn.release();
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No attendance record found for this date.' });
    }
    res.json({ success: true, date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;