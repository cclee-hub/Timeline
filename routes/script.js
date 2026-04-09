// routes/script.js
const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const tlId = parseInt(req.query.tl, 10);
  const userId = parseInt(req.query.id, 10);

  if (!tlId && !userId) {
    return res.type('application/javascript').send('/* invalid id or tl required */');
  }

  try {
    const db = await getDb();
    let result;

    if (tlId) {
      // tl parameter takes priority - query by timeline id
      result = db.exec('SELECT * FROM timelines WHERE id = ?', [tlId]);
    } else {
      // Only id provided - query by user_id (backwards compatibility, get first)
      result = db.exec('SELECT * FROM timelines WHERE user_id = ? LIMIT 1', [userId]);
    }

    let data = null;
    if (result.length && result[0].values.length) {
      const row = result[0].values[0];
      data = { title: row[2], items: JSON.parse(row[3]) };
    }
    const script = buildTimelineScript(data);
    res.type('application/javascript').send(script);
  } catch (err) {
    res.type('application/javascript').send('/* error: ' + err.message + ' */');
  }
});

function buildTimelineScript(data) {
  if (!data) return '/* timeline not found */';

  const itemsJson = JSON.stringify(data.items.map(item => ({
    date: item.date || '',
    title: item.title || '',
    description: item.description || ''
  })));
  const escapedTitle = (data.title || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `(function() {
  var data = ${itemsJson};
  var title = "${escapedTitle}";

  function renderTimeline() {
    if (document.getElementById('timeline-root')) return;
    var container = document.createElement('div');
    container.id = 'timeline-root';
    container.innerHTML = '<div class="tl-wrap">' +
      (title ? '<h2 class="tl-title"></h2>' : '') +
      '<div class="tl-list"></div></div>';
    if (title) container.querySelector('.tl-title').textContent = title;
    var target = document.querySelector('.product-container');
    if (target && target.parentNode) {
      target.parentNode.insertBefore(container, target);
    } else {
      document.body.appendChild(container);
    }

    var s = document.createElement('style');
    s.id = 'timeline-style';
    s.textContent = [
      '#timeline-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px 0}',
      '.tl-wrap{max-width:700px;margin:0 auto}',
      '.tl-title{text-align:center;color:#222;margin:0 0 30px;font-size:1.5rem}',
      '.tl-list{position:relative;padding:0 0 20px}',
      '.tl-list::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:#e0e0e0;transform:translateX(-50%)}',
      '.tl-item{display:flex;margin:0 0 30px;position:relative}',
      '.tl-item-left,.tl-item-right{width:50%;box-sizing:border-box;padding:0 20px}',
      '.tl-dot{position:absolute;left:50%;top:8px;width:12px;height:12px;background:#4a90d9;border-radius:50%;transform:translateX(-50%);z-index:1}',
      '.tl-card{background:#f9f9f9;border-radius:8px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.08)}',
      '.tl-date{font-size:.75rem;color:#888;margin:0 0 6px;font-weight:600}',
      '.tl-item-title{font-size:1rem;font-weight:600;color:#222;margin:0 0 6px}',
      '.tl-item-desc{font-size:.875rem;color:#555;margin:0;line-height:1.5}',
      '@media(max-width:600px){.tl-list::before{left:20px}.tl-dot{left:20px}.tl-item{flex-direction:column!important}.tl-item-left,.tl-item-right{width:100%;padding-left:50px;padding-right:0}}'
    ].join('');
    document.head.appendChild(s);

    var list = container.querySelector('.tl-list');
    data.forEach(function(item) {
      var isOdd = list.children.length % 2 === 0;
      var side = isOdd ? 'left' : 'right';
      var div = document.createElement('div');
      div.className = 'tl-item';
      div.innerHTML = '<div class="tl-item-' + side + '"><div class="tl-dot"></div><div class="tl-card"><p class="tl-date"></p><p class="tl-item-title"></p><p class="tl-item-desc"></p></div></div>';
      div.querySelector('.tl-date').textContent = item.date;
      div.querySelector('.tl-item-title').textContent = item.title;
      div.querySelector('.tl-item-desc').textContent = item.description;
      list.appendChild(div);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderTimeline);
  } else {
    renderTimeline();
  }
})();`;
}

module.exports = router;
