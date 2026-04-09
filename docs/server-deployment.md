# Timeline 服务部署

_Last updated: 2026-04-09_

## 服务器

| 项目 | 值 |
|------|-----|
| IP | 47.84.87.131 |
| 系统 | Alibaba Cloud Linux 3 (RHEL-like) |
| 域名 | timeline.aidevhub.ai |
| GitHub | https://github.com/cclee-hub/Timeline |

---

## 自动部署

部署已通过 GitHub Actions 自动化。push 到 `main` 分支会自动部署。

### GitHub Secrets 配置

在 https://github.com/cclee-hub/Timeline/settings/secrets/actions 添加：

| Secret Name | Value |
|-------------|-------|
| `SERVER_HOST` | `47.84.87.131` |
| `SERVER_SSH_KEY` | root 用户 SSH 私钥 |

---

## 目录结构

```
/var/www/timeline/
├── server.js          # Express 主入口
├── db.js              # sql.js 数据库
├── package.json
├── timeline.db         # SQLite 数据文件
├── routes/
│   ├── auth.js        # 注册 / 登录
│   ├── timeline.js    # 时间轴 CRUD
│   └── script.js      # /tl.js 嵌入脚本
└── public/
    └── index.html     # Admin SPA
```

---

## 首次部署步骤

### 1. 安装 Node.js

```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
```

### 2. 初始化服务器仓库

```bash
ssh root@47.84.87.131
mkdir -p /var/www/timeline
cd /var/www/timeline
git init
git remote add origin git@github.com:cclee-hub/Timeline.git
git pull origin main
npm install
npm install -g pm2
pm2 start server.js --name timeline
pm2 save
```

### 3. 配置 Nginx + SSL

```bash
cat > /etc/nginx/conf.d/timeline.conf << 'EOF'
server {
    listen 80;
    server_name timeline.aidevhub.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name timeline.aidevhub.ai;

    ssl_certificate /etc/letsencrypt/live/timeline.aidevhub.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/timeline.aidevhub.ai/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

nginx -t && nginx -s reload
```

### 4. 获取 SSL 证书

```bash
certbot --nginx -d timeline.aidevhub.ai --non-interactive --agree-tos --email admin@aidevhub.ai
```

### 5. 配置 DNS

Cloudflare DNS 添加记录：
- `timeline.aidevhub.ai` → `47.84.87.131` (代理关闭或开启皆可)

### 4. 配置 DNS

Cloudflare DNS 添加记录：
- `timeline.aidevhub.ai` → `47.84.87.131` (代理关闭)

---

## 常用命令

```bash
# 手动重启服务
pm2 restart timeline

# 查看日志
pm2 logs timeline

# 查看状态
pm2 status

# 手动更新（不推荐，使用 CI/CD）
cd /var/www/timeline && git pull origin main && npm install && pm2 restart timeline
```

---

## API 端点

| 端点 | 说明 |
|------|------|
| `https://timeline.aidevhub.ai/` | Admin SPA |
| `https://timeline.aidevhub.ai/api/register` | 注册 |
| `https://timeline.aidevhub.ai/api/login` | 登录 |
| `https://timeline.aidevhub.ai/api/timeline` | 获取/创建时间轴 |
| `https://timeline.aidevhub.ai/tl.js?id=<userId>` | 嵌入脚本 |

---

## 嵌入使用

```html
<script src="https://timeline.aidevhub.ai/tl.js?id=1"></script>
```