// routes/timeline.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db');

const router = express.Router();
const JWT_SECRET = 'timeline-secret-key-change-in-production';

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// GET /api/timeline
router.get('/timeline', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM timelines WHERE user_id = ?', [req.user.userId]);
    if (!result.length || !result[0].values.length) return res.json(null);
    const row = result[0].values[0];
    res.json({
      id: row[0],
      title: row[2],
      items: JSON.parse(row[3]),
      updated_at: row[4]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeline
router.post('/timeline', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { title, items } = req.body;
    const itemsJson = JSON.stringify(items || []);
    const existing = db.exec('SELECT id FROM timelines WHERE user_id = ?', [req.user.userId]);
    if (existing.length && existing[0].values.length) {
      const id = existing[0].values[0][0];
      db.run("UPDATE timelines SET title = ?, items = ?, updated_at = datetime('now') WHERE user_id = ?", [title || '', itemsJson, req.user.userId]);
      saveDb();
      res.json({ id });
    } else {
      db.run('INSERT INTO timelines (user_id, title, items) VALUES (?, ?, ?)', [req.user.userId, title || '', itemsJson]);
      saveDb();
      const result = db.exec('SELECT last_insert_rowid() as id');
      res.json({ id: result[0].values[0][0] });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
