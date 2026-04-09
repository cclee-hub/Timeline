# Timeline 时间线嵌入使用帮助

## 快速开始

最简步骤让你的活动时间线上线。

## 使用指南

### 任务一：注册并登录

1. 打开 Timeline 管理后台
2. 填写用户名和密码
3. 点击 **Register** 注册账号
4. 注册成功后，用相同账号密码登录

> **提示**：首次使用需要先注册账号。账号用于管理你的时间线数据。

### 任务二：创建时间线

1. 登录后进入时间线列表页
2. 点击 **+ New Timeline** 新建时间线
3. 填写 **Internal Name**（内部管理名称，不对外展示，如"会议2024"）
4. 填写 **Title**（对外展示的标题，如"重要日期"）
5. 点击 **+ Add Entry** 添加日期条目
6. 为每个条目填写：
   - **Date**：日期（如 2024-01-15）
   - **Title**：标题（如"早鸟注册截止"）
   - **Description**：描述（留空则不显示）
7. 点击 **Save** 保存

> **注意**：日期格式建议使用 YYYY-MM-DD（如 2024-01-15），或 YYYY-MM（如 2024-01）表示月份。

### 任务三：获取嵌入代码

1. 保存时间线后，页面下方显示 **Embed Code** 区域
2. 在 **Website Domain** 输入你的网站域名（如 `https://www.example.com`）
3. 在 **Target Path** 输入时间线要显示的页面路径（如 `/events`）
4. 复制对应的嵌入代码：
   - **Pure Embed** — 直接加载脚本（无 URL 判断）
   - **With URL Check** — 仅在指定页面加载（推荐）

### 任务四：在网站嵌入时间线

1. 登录 SITE123.com 网站编辑器
2. 进入要添加时间线的页面
3. 点击 **Add Element** → **Custom Code** 或 **HTML Code**
4. 粘贴嵌入代码

**方式一：纯嵌入（所有页面都加载）**
```html
<script src="https://your-domain.com/tl.js?id=用户ID&tl=时间线ID"></script>
```

**方式二：带 URL 判断（仅指定页面加载，推荐）**
```html
<script>
if (window.location.hostname === 'www.example.com' && window.location.pathname.startsWith('/events')) {
  var s = document.createElement('script');
  s.src = 'https://your-domain.com/tl.js?id=用户ID&tl=时间线ID';
  document.body.appendChild(s);
}
</script>
```

> **提示**：不支持使用 iframe 嵌入。`/tl.js` 返回 JavaScript 代码而非 HTML 页面，必须使用 `<script>` 标签嵌入。
