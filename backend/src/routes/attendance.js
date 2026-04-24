const express = require('express');
const router  = express.Router();
const { readDb, writeDb }            = require('../db');
const auth                           = require('../middleware/auth');
const { toDateString, calculateRtoStats } = require('../rtoUtils');

/**
 * GET /api/attendance?year=2026&month=4
 */
router.get('/', auth, (req, res) => {
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

    const db = readDb();

    const monthAttendance = db.attendance.filter(r => r.date >= startDate && r.date <= endDate);
    const monthHolidays   = db.holidays.filter(h => h.date >= startDate && h.date <= endDate);

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
router.post('/checkin', auth, (req, res) => {
  try {
    const dateStr = req.body.date || toDateString(new Date());
    const status  = req.body.status || 'IN_OFFICE';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }
    if (!['IN_OFFICE', 'APPROVED_ABSENCE'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    const db  = readDb();
    const idx = db.attendance.findIndex(r => r.date === dateStr);
    if (idx >= 0) {
      db.attendance[idx].status = status;
    } else {
      db.attendance.push({ date: dateStr, status });
    }
    db.attendance.sort((a, b) => a.date.localeCompare(b.date));
    writeDb(db);

    res.json({ success: true, date: dateStr, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/attendance/:date
 */
router.delete('/:date', auth, (req, res) => {
  try {
    const dateStr = req.params.date;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const db  = readDb();
    const idx = db.attendance.findIndex(r => r.date === dateStr);
    if (idx < 0) {
      return res.status(404).json({ error: 'No attendance record found for this date.' });
    }

    db.attendance.splice(idx, 1);
    writeDb(db);

    res.json({ success: true, date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;