# Timeline Admin 改版设计方案

_整理日期：2026-04-09_

---

## 一、数据库改动

**`timelines` 表变更：**

- 新增 `name` 字段（时间轴内部管理名称）
- 新增 `site_domain` 字段（目标网站域名）
- 去除 `user_id UNIQUE` 约束，允许同一用户创建多条时间轴

```sql
-- 整表重建（sql.js 不支持 DROP CONSTRAINT）
CREATE TABLE timelines_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  items TEXT NOT NULL DEFAULT '[]',
  name TEXT NOT NULL DEFAULT '',
  site_domain TEXT NOT NULL DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
-- 迁移数据，name = title（已有数据 name=title），site_domain 留空
INSERT INTO timelines_new (id, user_id, title, items, name, site_domain, updated_at)
  SELECT id, user_id, title, items, title, '', updated_at FROM timelines;
DROP TABLE timelines;
ALTER TABLE timelines_new RENAME TO timelines;
```

---

## 二、API 改动

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/timelines` | 获取当前用户所有时间轴列表 |
| GET | `/api/timeline/:id` | 获取单条时间轴详情 |
| POST | `/api/timeline` | 创建新时间轴（支持 name 字段） |
| PUT | `/api/timeline/:id` | 更新指定时间轴（含 name） |
| DELETE | `/api/timeline/:id` | 删除指定时间轴 |

**GET /api/timelines** — 返回当前用户所有时间轴：
```json
[
  { "id": 1, "name": "Conference Timeline", "title": "Key Dates", "items": [...], "updated_at": "..." },
  { "id": 2, "name": "Product Launch", "title": "Milestones", "items": [...], "updated_at": "..." }
]
```

**Embed 脚本读取逻辑**（`routes/script.js`）：
- 同时传 `id` 和 `tl` → 按 `tl` 查 `timelines.id`（优先）
- 只传 `id` → 按 `user_id` 查（兼容旧方式，取该用户第一条）

---

## 三、前端页面结构

```
登录 → 时间轴列表页（#/list）
           ├── 新建按钮 → 新建时间轴表单（#/edit/new）
           ├── 编辑按钮 → 编辑时间轴表单（#/edit/:id）
           └── 删除按钮 → 确认弹窗
```

**列表页：** 显示该用户所有时间轴，每条显示 `name` + 操作按钮（编辑、删除），支持新建。

**编辑页：**
- `name` 输入框（内部管理用，不对外展示）
- 现有 Title / Entries 编辑区域
- 保存按钮

**路由：** 使用 hash 路由（`#/list`、`#/edit/:id`）切换视图，无需后端路由。

---

## 四、Embed Code 区域改版

新增两个前端输入框（不存库，纯拼接用）：

| 字段 | 示例 |
|------|------|
| 网站域名 | `https://www.example.com` |
| 目标路径 | `/events` |

两个输入框内容变化时，实时拼接生成两段代码：

**第一段（纯嵌入，无 URL 判断）：**
```html
<script src="https://your-domain.com/tl.js?id=${userId}&tl=${timelineId}"></script>
```

**第二段（带 URL 判断）：**
```html
<script>
if (window.location.hostname === 'www.example.com' && window.location.pathname.startsWith('/events')) {
  var s = document.createElement('script');
  s.src = 'https://your-domain.com/tl.js?id=${userId}&tl=${timelineId}';
  document.body.appendChild(s);
}
</script>
```

两段代码各有独立 Copy 按钮，实时拼接。

---

## 五、文件改动清单

| 文件 | 改动 |
|------|------|
| `db.js` | 整表迁移脚本 |
| `routes/timeline.js` | 新增 list/delete/update-detail 接口 |
| `routes/script.js` | 支持 `?tl=` 参数，兼容旧 `?id=` |
| `public/index.html` | 改版：SPA hash 路由 + 列表页 + 编辑页 + Embed Code 区 |

---

## 六、迁移步骤

1. **备份数据库** `timeline.db`
2. **更新 db.js**：添加迁移逻辑（检测旧表结构，执行重建）
3. **部署新代码**
4. **重启服务**：`pm2 restart timeline`
