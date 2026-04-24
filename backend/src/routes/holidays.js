const express = require('express');
const router  = express.Router();
const { readDb, writeDb } = require('../db');
const auth                = require('../middleware/auth');

/**
 * GET /api/holidays?year=2026
 */
router.get('/', auth, (req, res) => {
  try {
    const year = parseInt(req.query.year);
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'A valid year (2000-2100) is required.' });
    }

    const prefix = String(year) + '-';
    const db = readDb();
    const rows = db.holidays.filter(h => h.date.startsWith(prefix));

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/holidays  { date, name }
 */
router.post('/', auth, (req, res) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'date and name are required.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const db  = readDb();
    const idx = db.holidays.findIndex(h => h.date === date);
    if (idx >= 0) {
      db.holidays[idx].name = name;
    } else {
      db.holidays.push({ date, name });
      db.holidays.sort((a, b) => a.date.localeCompare(b.date));
    }
    writeDb(db);

    res.json({ success: true, date, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/holidays/:date
 */
router.delete('/:date', auth, (req, res) => {
  try {
    const dateStr = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const db  = readDb();
    const idx = db.holidays.findIndex(h => h.date === dateStr);
    if (idx < 0) {
      return res.status(404).json({ error: 'No holiday found for this date.' });
    }

    db.holidays.splice(idx, 1);
    writeDb(db);

    res.json({ success: true, date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;