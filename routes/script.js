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
    var target = document.querySelector('.product-container .col-xs-12.col-sm-7.product-details');
    if (target && target.parentNode) {
      target.parentNode.insertBefore(container, target);
    } else {
      document.body.appendChild(container);
    }

    var s = document.createElement('style');
    s.id = 'timeline-style';
    s.textContent = [
      '#timeline-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:16px 0;width:100%;display:block}',
      '.tl-wrap{max-width:480px;margin:0}',
      '.tl-title{text-align:left;color:#222;margin:0 0 16px;font-size:1.1rem;font-weight:700}',
      '.tl-list{position:relative;padding:0 0 10px}',
      '.tl-list::before{content:"";position:absolute;left:16px;top:0;bottom:0;width:2px;background:#ccc;transform:none}',
      '.tl-item{display:flex;align-items:flex-start;margin:0 0 16px;position:relative;padding-left:44px}',
      '.tl-item-left,.tl-item-right{width:100%;box-sizing:border-box;padding:0}',
      '.tl-dot{position:absolute;left:10px;top:6px;width:12px;height:12px;background:#c8a84b;border-radius:50%;z-index:1}',
      '.tl-card{background:transparent;border-radius:0;padding:0;box-shadow:none}',
      '.tl-date{font-size:.72rem;color:#888;margin:0 0 2px;font-weight:600}',
      '.tl-item-title{font-size:.9rem;font-weight:700;color:#222;margin:0 0 2px}',
      '.tl-item-desc{font-size:.8rem;color:#555;margin:0;line-height:1.4}',
      '@media(max-width:600px){.tl-list::before{left:16px}.tl-dot{left:10px}.tl-item{padding-left:44px}}'
    ].join('');
    document.head.appendChild(s);

    var list = container.querySelector('.tl-list');
    data.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'tl-item';
      div.innerHTML = '<div class="tl-dot"></div><div class="tl-card"><p class="tl-date"></p><p class="tl-item-title"></p><p class="tl-item-desc"></p></div>';
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
