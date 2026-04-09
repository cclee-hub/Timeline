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
  user_id    INTEGER UNIQUE NOT NULL,
  title      TEXT NOT NULL DEFAULT '',
  items      TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

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

### GET /api/timeline

获取当前用户时间轴。需 `Authorization: Bearer <token>`

**Response:** `{ "id", "title", "items": [...], "updated_at" }` 或 `null`

---

### POST /api/timeline

创建或更新时间轴（upsert）。需 `Authorization: Bearer <token>`

**Request:** `{ "title": "...", "items": [{ "date": "2024-01", "title": "...", "description": "..." }] }`
**Response:** `{ "id" }`

---

### GET /tl.js?id=\<userId\>

返回自包含 JavaScript，插入 `<div id="timeline-root">` 到 body，渲染垂直时间轴。

Content-Type: `application/javascript`
用户不存在时返回: `/* timeline not found */`

---

## Admin SPA

访问 http://localhost:3000/

- 未登录：登录 / 注册切换表单
- 已登录：嵌入代码片段、时间轴条目编辑、保存

---

## 嵌入使用

```html
<script src="https://timeline.aidevhub.ai/tl.js?id=1"></script>
```

---

## 开发注意事项

- `JWT_SECRET` 硬编码在 `routes/auth.js` 和 `routes/timeline.js`，生产环境应移至环境变量
- `sql.js` 每次变更需调用 `saveDb()` 才能持久化
