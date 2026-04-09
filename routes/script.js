// routes/script.js
const express = require('express');
const { getDb } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const userId = parseInt(req.query.id, 10);
  if (!userId) {
    return res.type('application/javascript').send('/* invalid id */');
  }

  try {
    const db = await getDb();
    const result = db.exec('SELECT * FROM timelines WHERE user_id = ?', [userId]);
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

  return '(function() {\n  var data = ' + itemsJson + ';\n  var title = "' + escapedTitle + '";\n\n  function renderTimeline() {\n    if (document.getElementById(\'timeline-root\')) return;\n    var container = document.createElement(\'div\');\n    container.id = \'timeline-root\';\n    container.innerHTML = \'<div class="tl-wrap">\' +\n      (title ? \'<h2 class="tl-title"></h2>\' : \'\') +\n      \'<div class="tl-list"></div></div>\';\n    if (title) container.querySelector(\'.tl-title\').textContent = title;\n    document.body.appendChild(container);\n\n    var s = document.createElement(\'style\');\n    s.id = \'timeline-style\';\n    s.textContent = [\n      \'#timeline-root{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:20px 0}\',\n      \'.tl-wrap{max-width:700px;margin:0 auto}\',\n      \'.tl-title{text-align:center;color:#222;margin:0 0 30px;font-size:1.5rem}\',\n      \'.tl-list{position:relative;padding:0 0 20px}\',\n      \'.tl-list::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:2px;background:#e0e0e0;transform:translateX(-50%)}\',\n      \'.tl-item{display:flex;margin:0 0 30px;position:relative}\',\n      \'.tl-item-left,.tl-item-right{width:50%;box-sizing:border-box;padding:0 20px}\',\n      \'.tl-dot{position:absolute;left:50%;top:8px;width:12px;height:12px;background:#4a90d9;border-radius:50%;transform:translateX(-50%);z-index:1}\',\n      \'.tl-card{background:#f9f9f9;border-radius:8px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.08)}\',\n      \'.tl-date{font-size:.75rem;color:#888;margin:0 0 6px;font-weight:600}\',\n      \'.tl-item-title{font-size:1rem;font-weight:600;color:#222;margin:0 0 6px}\',\n      \'.tl-item-desc{font-size:.875rem;color:#555;margin:0;line-height:1.5}\',\n      \'@media(max-width:600px){.tl-list::before{left:20px}.tl-dot{left:20px}.tl-item{flex-direction:column!important}.tl-item-left,.tl-item-right{width:100%;padding-left:50px;padding-right:0}}\'\n    ].join(\'\');\n    document.head.appendChild(s);\n\n    var list = container.querySelector(\'.tl-list\');\n    data.forEach(function(item) {\n      var isOdd = list.children.length % 2 === 0;\n      var side = isOdd ? \'left\' : \'right\';\n      var div = document.createElement(\'div\');\n      div.className = \'tl-item\';\n      div.innerHTML = \'<div class="tl-item-\' + side + \'"><div class="tl-dot"></div><div class="tl-card"><p class="tl-date"></p><p class="tl-item-title"></p><p class="tl-item-desc"></p></div></div>\';\n      div.querySelector(\'.tl-date\').textContent = item.date;\n      div.querySelector(\'.tl-item-title\').textContent = item.title;\n      div.querySelector(\'.tl-item-desc\').textContent = item.description;\n      list.appendChild(div);\n    });\n  }\n\n  if (document.readyState === \'loading\') {\n    document.addEventListener(\'DOMContentLoaded\', renderTimeline);\n  } else {\n    renderTimeline();\n  }\n})();';
}

module.exports = router;
