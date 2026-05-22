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
      "SELECT user_id, date, name FROM holidays WHERE YEAR(date) = ? AND (user_id = ? OR user_id = 0) ORDER BY date, user_id ASC",
      [year, req.user.id]
    );

    const holidays = rows.map(h => ({
      date: h.date instanceof Date ? toDateString(h.date) : String(h.date),
      name: h.name,
      isShared: h.user_id === 0,
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
    if (typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Holiday name must not be empty.' });
    }
    if (name.trim().length > 150) {
      return res.status(400).json({ error: 'Holiday name must be 150 characters or fewer.' });
    }

    await pool.query(
      'INSERT INTO holidays (user_id, date, name) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [req.user.id, date, name.trim()]
    );

    res.json({ success: true, date, name: name.trim() });
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
      'DELETE FROM holidays WHERE date = ? AND user_id = ?',
      [dateStr, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'No personal holiday found for this date.' });
    }

    res.json({ success: true, date: dateStr });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;