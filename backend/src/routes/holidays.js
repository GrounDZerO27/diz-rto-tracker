const express = require('express');
const router  = express.Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');
const { toDateString } = require('../rtoUtils');

/**
 * GET /api/holidays?year=2026
 */
router.get('/', auth, async (req, res) => {
  try {
    const year = parseInt(req.query.year);
    if (!year || year < 2000 || year > 2100) {
      return res.status(400).json({ error: 'A valid year (2000-2100) is required.' });
    }

    const [rows] = await pool.query(
      "SELECT date, name FROM holidays WHERE YEAR(date) = ? ORDER BY date",
      [year]
    );

    const holidays = rows.map(h => ({
      date: h.date instanceof Date ? toDateString(h.date) : String(h.date),
      name: h.name,
    }));

    res.json(holidays);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * POST /api/holidays  { date, name }
 */
router.post('/', auth, async (req, res) => {
  try {
    const { date, name } = req.body;
    if (!date || !name) return res.status(400).json({ error: 'date and name are required.' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    await pool.query(
      'INSERT INTO holidays (date, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [date, name]
    );

    res.json({ success: true, date, name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

/**
 * DELETE /api/holidays/:date
 */
router.delete('/:date', auth, async (req, res) => {
  try {
    const dateStr = req.params.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const [result] = await pool.query(
      'DELETE FROM holidays WHERE date = ?',
      [dateStr]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No holiday found for this date.' });
    }

    res.json({ success: true, date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;