# Timeline Embed Service — 开发文档

## 启动服务

```bash
cd /home/aptop/workspace/Timeline
node server.js
```

访问 http://localhost:3000

---

## 项目结构

```
Timeline/
├── server.js           # Express 主入口，路由挂载
├── db.js               # sql.js 数据库（异步单例）
├── package.json
├── timeline.db         # SQLite 数据文件（自动创建）
├── routes/
│   ├── auth.js         # 注册 / 登录
│   ├── timeline.js     # 时间轴 CRUD
│   └── script.js       # /tl.js 嵌入脚本输出
└── public/
    └── index.html      # Admin SPA（管理后台）
```

---

## 数据库

**db.js** 导出两个函数：
- `getDb()` — 异步，返回 sql.js Database 实例（单例）
- `saveDb()` — 将内存数据库写回 `timeline.db` 文件

**表结构：**

```sql
users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT
)

timelines (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  items      TEXT NOT NULL DEFAULT '[]',
  name       TEXT NOT NULL DEFAULT '',
  site_domain TEXT NOT NULL DEFAULT '',
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

> 注意：`user_id` 无 UNIQUE 约束，允许同一用户创建多条时间轴。
> `name` 为内部管理名称，`site_domain` 预留给前端使用（当前不存库）。

---

## API 参考

Base: `http://localhost:3000/api`
Embed: `http://localhost:3000/tl.js`

### POST /api/register

注册。

**Request:** `{ "username": "...", "password": "..." }`
**Response:** `{ "message": "User registered", "userId": 0 }`
**Errors:** 400 缺少字段，409 用户名已存在

---

### POST /api/login

登录。

**Request:** `{ "username": "...", "password": "..." }`
**Response:** `{ "token": "...", "userId": 1, "username": "..." }`
**Errors:** 400 缺少字段，401 凭证无效

---

### GET /api/timelines

获取当前用户所有时间轴列表。需 `Authorization: Bearer <token>`

**Response:**
```json
[
  { "id": 1, "name": "内部名称", "title": "标题", "items": [...], "site_domain": "", "updated_at": "..." },
  ...
]
```

---

### GET /api/timeline/:id

获取单条时间轴。需 `Authorization: Bearer <token>`

**Response:** `{ "id", "name", "title", "items": [...], "site_domain", "updated_at" }`
**Errors:** 404 不存在或不属于当前用户

---

### POST /api/timeline

创建新时间轴。需 `Authorization: Bearer <token>`

**Request:** `{ "name": "...", "title": "...", "items": [{ "date": "2024-01", "title": "...", "description": "..." }] }`
**Response:** `{ "id" }`
**说明:** `name` 为空时使用 `title`，`title` 也为空时默认为 `'Untitled'`

---

### PUT /api/timeline/:id

更新时间轴。需 `Authorization: Bearer <token>`

**Request:** `{ "name": "...", "title": "...", "items": [...] }`
**Response:** `{ "id", "name", "title", "items": [...], "updated_at" }`
**Errors:** 404 不存在或不属于当前用户

---

### DELETE /api/timeline/:id

删除时间轴。需 `Authorization: Bearer <token>`

**Response:** `{ "success": true }`
**Errors:** 404 不存在或不属于当前用户

---

### GET /tl.js?id=\<userId\>&tl=\<timelineId\>

返回自包含 JavaScript，插入 `<div id="timeline-root">` 到 body，渲染垂直时间轴。

**参数:**
- `id` — 用户 ID（兼容旧方式）
- `tl` — 时间轴 ID（优先，支持多时间轴）

**说明:** 同时存在时 `tl` 优先；仅 `id` 时取该用户第一条（向后兼容）

**Content-Type:** `application/javascript`
**不存在时返回:** `/* timeline not found */`

---

## Admin SPA

访问 http://localhost:3000/

- 未登录：登录 / 注册切换表单
- 已登录：基于 Hash 路由的 SPA
  - `#/list` — 时间轴列表页（显示所有时间轴，支持新建/编辑/删除）
  - `#/edit/:id` — 编辑时间轴（内部名称、标题、条目）
  - `#/edit/new` — 新建时间轴
  - Embed Code 区域：输入域名 + 路径，实时生成两段嵌入代码

### Embed Code 生成器

- **纯嵌入代码**：直接加载脚本
- **URL 判断代码**：判断 `window.location.hostname` 和 `window.location.pathname` 后再加载

两种代码各有独立 Copy 按钮。

---

## 嵌入使用

**纯嵌入（无 URL 判断）：**
```html
<script src="https://timeline.aidevhub.ai/tl.js?id=1&tl=2"></script>
```

**带 URL 判断（推荐）：**
```html
<script>
if (window.location.hostname === 'www.example.com' && window.location.pathname.startsWith('/events')) {
  var s = document.createElement('script');
  s.src = 'https://timeline.aidevhub.ai/tl.js?id=1&tl=2';
  document.body.appendChild(s);
}
</script>
```

> `id` 为用户 ID，`tl` 为时间轴 ID。同时存在时 `tl` 优先。

---

## 开发注意事项

- `JWT_SECRET` 硬编码在 `routes/auth.js` 和 `routes/timeline.js`，生产环境应移至环境变量
- `sql.js` 每次变更需调用 `saveDb()` 才能持久化
