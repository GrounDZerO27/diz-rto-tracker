const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');
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
    const endDate = `${year}-${pad(month)}-${pad(daysInMonth)}`;

    const [attendanceRows] = await pool.query(
      'SELECT date, status FROM attendance WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date',
      [req.user.id, startDate, endDate]
    );

    const [holidayRows] = await pool.query(
      'SELECT date, name FROM holidays WHERE date BETWEEN ? AND ? ORDER BY date',
      [startDate, endDate]
    );

    const monthAttendance = attendanceRows.map(r => ({
      date:   r.date instanceof Date ? toDateString(r.date) : String(r.date),
      status: r.status,
    }));
    const monthHolidays = holidayRows.map(h => ({
      date: h.date instanceof Date ? toDateString(h.date) : String(h.date),
      name: h.name,
    }));

    const inOfficeDates        = monthAttendance.filter(r => r.status === 'IN_OFFICE').map(r => r.date);
    const approvedAbsenceDates = monthAttendance.filter(r => r.status === 'APPROVED_ABSENCE').map(r => r.date);
    const holidayDates         = monthHolidays.map(h => h.date);

    const stats = calculateRtoStats(year, month, inOfficeDates, holidayDates, approvedAbsenceDates);

    res.json({ year, month, attendance: monthAttendance, holidays: monthHolidays, stats });
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

    await pool.query(
      `INSERT INTO attendance (user_id, date, status) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [req.user.id, dateStr, status]
    );

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

    const [result] = await pool.query(
      'DELETE FROM attendance WHERE user_id = ? AND date = ?',
      [req.user.id, dateStr]
    );

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

module.exports = router;