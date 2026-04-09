// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, saveDb } = require('../db');

const router = express.Router();
const JWT_SECRET = 'timeline-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// POST /api/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const db = await getDb();
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);
    db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    saveDb();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.json({ message: 'User registered', userId: result[0].values[0][0] });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    stmt.bind([username]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const row = stmt.get();
    stmt.free();
    const user = { id: row[0], username: row[1], password_hash: row[2] };
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, userId: user.id, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
