# Timeline Admin 改版实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 改版 Timeline Admin 后台，支持多时间轴管理，优化 Embed Code 生成。

**Architecture:** 单页应用（hash 路由），后端新增多时间轴 CRUD API，数据库迁移增加 name/site_domain 字段。

**Tech Stack:** Express.js, sql.js, plain JS SPA, PM2

---

## Task 1: db.js — 数据库迁移

**Files:**
- Modify: `db.js:18-33`

**Step 1: 添加迁移逻辑**

将 `db.js` 中初始化逻辑替换为检测 + 迁移：

```javascript
// 旧表有 user_id UNIQUE 约束 → 迁移到新表结构
const schema = db.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='timelines'");
const oldSchema = schema[0]?.values[0]?.[0] || '';
const hasNameColumn = oldSchema.includes('name');

if (!hasNameColumn) {
  // 整表重建迁移
  db.run(`
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
  `);
  db.run(`
    INSERT INTO timelines_new (id, user_id, title, items, name, site_domain, updated_at)
    SELECT id, user_id, title, items, title, '', updated_at FROM timelines;
  `);
  db.run('DROP TABLE timelines');
  db.run('ALTER TABLE timelines_new RENAME TO timelines');
  saveDb();
}
```

**Step 2: 提交**

```bash
git add db.js && git commit -m "feat(db): add migration for name/site_domain columns"
```

---

## Task 2: routes/timeline.js — 新增多时间轴 API

**Files:**
- Modify: `routes/timeline.js`

**Step 1: 重写 timeline.js**

替换整个文件内容，实现：
- GET /api/timelines — 获取当前用户所有时间轴
- GET /api/timeline/:id — 获取单条时间轴
- POST /api/timeline — 创建新时间轴
- PUT /api/timeline/:id — 更新指定时间轴
- DELETE /api/timeline/:id — 删除时间轴

关键点：所有操作都加 `user_id` 过滤，确保用户只能操作自己的时间轴。

**Step 2: 提交**

```bash
git add routes/timeline.js && git commit -m "feat(api): add multi-timeline CRUD endpoints"
```

---

## Task 3: routes/script.js — 支持 tl 参数

**Files:**
- Modify: `routes/script.js:7-26`

**Step 1: 修改 GET 逻辑**

- 同时传 `id` 和 `tl` → 按 `tl` 查 `timelines.id`（优先）
- 只传 `id` → 按 `user_id` 查，取第一条（兼容旧方式）

**Step 2: 提交**

```bash
git add routes/script.js && git commit -m "feat(embed): support tl parameter for multi-timeline"
```

---

## Task 4: public/index.html — SPA 改版

**Files:**
- Modify: `public/index.html`

实现：
- Hash 路由（`#/list`、`#/edit/:id`）
- 列表页（显示所有时间轴 + 新建按钮 + 编辑/删除操作）
- 编辑页（name 输入框 + Title + Entries + 保存）
- Embed Code 区域（域名 + 路径输入框，实时拼接两段代码，各有 Copy 按钮）

**Step 1: 提交**

```bash
git add public/index.html && git commit -m "feat(admin): SPA redesign with multi-timeline support"
```

---

## Task 5: 整体测试

**Step 1: 启动服务**

```bash
pm2 restart timeline
```

**Step 2: 验证流程**

1. 登录 → 应显示空列表（全新迁移后）
2. 新建时间轴 → 填写 name + title + entries → 保存
3. 列表页显示新时间轴
4. 编辑 → 修改 → Embed Code 区域显示，输入域名路径验证拼接
5. 浏览器直接打开 Embed Code 链接验证脚本返回正确数据

---

## Task 6: 最终提交

```bash
git add -A && git commit -m "feat: timeline admin redesign - multi-timeline, embed code with url check"
```
