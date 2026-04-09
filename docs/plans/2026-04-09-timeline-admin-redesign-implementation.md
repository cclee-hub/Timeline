# Timeline Admin 改版实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实施 Timeline Admin 改版：多时间轴支持、完整 CRUD API、新版 SPA 前端

**Architecture:**
- 数据库迁移：整表重建（sql.js 不支持 DROP CONSTRAINT），迁移数据后替换
- API：restful CRUD 路由，JWT 认证
- 前端：纯前端 SPA，hash 路由，Embed Code 动态生成

**Tech Stack:** Express.js, sql.js, Vanilla JS SPA, PM2

---

## Task 1: 数据库迁移（db.js）

**文件:** Modify: `db.js`

**步骤:**
1. 备份现有数据库: `cp timeline.db timeline.db.bak`
2. 在 `getDb()` 中检测旧表结构（`user_id UNIQUE` 约束）
3. 如检测到旧结构，执行整表重建迁移：
   - 创建 `timelines_new` 表（含 `name`, `site_domain` 列，无 UNIQUE 约束）
   - 迁移数据（`name = title`）
   - 删除旧表，重命名新表
4. 如已是新结构，直接返回

---

## Task 2: API 路由改写（routes/timeline.js）

**文件:** Modify: `routes/timeline.js`

**步骤:**
1. 替换现有 `routes/timeline.js` 为完整 CRUD 路由：
   - `GET /api/timelines` — 列出当前用户所有时间轴
   - `GET /api/timeline/:id` — 获取单条时间轴
   - `POST /api/timeline` — 创建新时间轴（支持 name 字段）
   - `PUT /api/timeline/:id` — 更新指定时间轴
   - `DELETE /api/timeline/:id` — 删除指定时间轴
2. 所有接口需 JWT 认证
3. 使用 `db.prepare()` + `stmt.bind()` 绑定参数
4. 每次变更调用 `saveDb()` 持久化

---

## Task 3: Embed 脚本增强（routes/script.js）

**文件:** Modify: `routes/script.js`

**步骤:**
1. 修改 `router.get('/', ...)` 逻辑：
   - 同时支持 `?id=userId` 和 `?tl=timelineId` 参数
   - `tl` 参数优先（按 `timelines.id` 查询）
   - 只有 `id` 时按 `user_id` 查询（兼容旧方式，取该用户第一条）
2. 无效参数时返回 `/* invalid id or tl required */`

---

## Task 4: Admin SPA 改版（public/index.html）

**文件:** Modify: `public/index.html`

**步骤:**
1. 实现 SPA 框架（hash 路由）：
   - `#/list` — 时间轴列表页
   - `#/edit/new` — 新建时间轴
   - `#/edit/:id` — 编辑时间轴
2. 列表页：调用 `GET /api/timelines`，显示所有时间轴的 `name` + 操作按钮（编辑、删除）
3. 编辑页：显示 `name` 输入框 + `title` 输入框 + items 编辑区域 + 保存按钮
4. Embed Code 区：域名 + 路径输入框，实时生成两段嵌入代码，各有 Copy 按钮
5. 未登录显示登录/注册表单

---

## Task 5: 集成测试

**步骤:**
1. 启动服务: `node server.js`
2. 测试注册/登录
3. 测试完整 CRUD 流程
4. 测试 SPA 页面功能
5. 测试 Embed Code 生成
6. 测试 tl.js 脚本加载

---

## Task 6: 提交

**步骤:**
1. 提交所有改动
2. 更新 DEVELOPMENT.md（反映新表结构、API 端点、前端路由）
