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

// GET /api/timelines — 列出当前用户所有时间轴
router.get('/timelines', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT id, user_id, title, items, name, site_domain, updated_at FROM timelines WHERE user_id = ?');
    stmt.bind([req.user.userId]);
    const timelines = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      timelines.push({
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        items: JSON.parse(row.items),
        name: row.name,
        site_domain: row.site_domain,
        updated_at: row.updated_at
      });
    }
    stmt.free();
    res.json(timelines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeline/:id — 获取单条时间轴
router.get('/timeline/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT id, user_id, title, items, name, site_domain, updated_at FROM timelines WHERE id = ? AND user_id = ?');
    stmt.bind([parseInt(req.params.id), req.user.userId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      res.json({
        id: row.id,
        user_id: row.user_id,
        title: row.title,
        items: JSON.parse(row.items),
        name: row.name,
        site_domain: row.site_domain,
        updated_at: row.updated_at
      });
    } else {
      stmt.free();
      res.status(404).json({ error: 'Timeline not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeline — 创建新时间轴
router.post('/timeline', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { title, items, name, site_domain } = req.body;
    const itemsJson = JSON.stringify(items || []);
    const stmt = db.prepare("INSERT INTO timelines (user_id, title, items, name, site_domain, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))");
    stmt.bind([req.user.userId, title || '', itemsJson, name || '', site_domain || '']);
    stmt.step();
    stmt.free();
    saveDb();
    const result = db.exec('SELECT last_insert_rowid() as id');
    res.json({ id: result[0].values[0][0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/timeline/:id — 更新指定时间轴
router.put('/timeline/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const { title, items, name, site_domain } = req.body;
    const itemsJson = JSON.stringify(items || []);
    const timelineId = parseInt(req.params.id);

    // Check if timeline exists and belongs to user
    const checkStmt = db.prepare('SELECT id FROM timelines WHERE id = ? AND user_id = ?');
    checkStmt.bind([timelineId, req.user.userId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Timeline not found' });
    }
    checkStmt.free();

    const stmt = db.prepare("UPDATE timelines SET title = ?, items = ?, name = ?, site_domain = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?");
    stmt.bind([title || '', itemsJson, name || '', site_domain || '', timelineId, req.user.userId]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ id: timelineId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/timeline/:id — 删除指定时间轴
router.delete('/timeline/:id', authenticate, async (req, res) => {
  try {
    const db = await getDb();
    const timelineId = parseInt(req.params.id);

    // Check if timeline exists and belongs to user
    const checkStmt = db.prepare('SELECT id FROM timelines WHERE id = ? AND user_id = ?');
    checkStmt.bind([timelineId, req.user.userId]);
    if (!checkStmt.step()) {
      checkStmt.free();
      return res.status(404).json({ error: 'Timeline not found' });
    }
    checkStmt.free();

    const stmt = db.prepare('DELETE FROM timelines WHERE id = ? AND user_id = ?');
    stmt.bind([timelineId, req.user.userId]);
    stmt.step();
    stmt.free();
    saveDb();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;