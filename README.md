# NocoBase v2.1.0-beta 本地部署指南

> 本文档记录了从零部署 NocoBase v2.1.0-beta.11 + MCP Server 的完整流程，包含所有踩坑点和修复方案。
> **新 Agent 请严格按此文档执行，避免重复失败的尝试。**

---

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│  NocoBase v2.1.0-beta.11 (Docker)                       │
│  http://192.168.1.28:13000                              │
│  ├── PostgreSQL: 192.168.1.31:5432 / nocobase_v210beta  │
│  ├── 69 个内置插件 (含 api-doc, api-keys)               │
│  └── 155 个 Swagger API 路径                             │
├─────────────────────────────────────────────────────────┤
│  MCP Server (独立 Node.js 进程, stdio 传输)              │
│  ├── 镜像: node:24-slim                                │
│  ├── 挂载: /code/noco/mcp-server/repo:/app               │
│  ├── SDK: @modelcontextprotocol/sdk v1.29.0              │
│  └── 工具: 155 个 MCP Tools (从 Swagger 自动生成)        │
└─────────────────────────────────────────────────────────┘
```

---

## 1. 前置条件

| 依赖 | 地址 | 备注 |
|------|------|------|
| PostgreSQL | `192.168.1.31:5432` | 用户: `postgres` / 密码: `Wasu@3.14` |
| Docker | 本机 | 需要 `crane` 辅助工具拉取被限流的镜像 |
| 局域网 IP | `192.168.1.28` | **不要用 localhost/127.0.0.1** |
| psql 客户端 | 无 | 本机无 psql，统一用 `docker run postgres:16-alpine` 执行 SQL |

---

## 2. 一次性部署步骤

### 2.1 创建数据库

```bash
docker run --rm -e PGPASSWORD='Wasu@3.14' postgres:16-alpine \
  psql -h 192.168.1.31 -U postgres -c "CREATE DATABASE nocobase_v210beta;"
```

### 2.2 拉取 NocoBase 镜像

> **坑点 #1**: Docker Hub 国内镜像加速器 (docker.1ms.run, docker.xuanyuan.me 等) 对大镜像频繁触发 429 Too Many Requests。
> 阿里云 registry (registry.cn-shanghai.aliyuncs.com) **没有 v2.1.0-beta 系列 tag**，只有 v2.0.x。
> **解决方案**: 使用 `crane` 工具直接从 Docker Hub Registry API 拉取，绕过代理。

```bash
# 安装 crane（如未安装）
curl -sL https://github.com/google/go-containerregistry/releases/download/v0.20.3/go-containerregistry_Linux_x86_64.tar.gz \
  | tar -xzf - -C /tmp crane && chmod +x /tmp/crane

# 拉取镜像（约 603MB）
/tmp/crane pull nocobase/nocobase:2.1.0-beta.11-full /tmp/nocobase-v210beta11.tar.gz

# 导入到 Docker
docker load -i /tmp/nocobase-v210beta11.tar.gz

# 清理临时文件
rm -f /tmp/nocobase-v210beta11.tar.gz
```

**镜像 tag 说明**:
- Docker Hub 上 v2.1.0 系列 tag: `2.1.0-beta.11-full`, `2.1.0-beta.10-full`, `2.1.0-alpha.14-full`
- GitHub Releases 显示的 `v2.1.0-beta.13` **可能还没发布 Docker 镜像**，务必先用 `crane manifest` 确认 tag 存在
- 不要尝试 `v2.1.0-beta.13-full`（不存在），用 `2.1.0-beta.11-full`

### 2.3 准备 docker-compose.yml

```yaml
services:
  app:
    image: nocobase/nocobase:2.1.0-beta.11-full
    restart: always
    environment:
      - APP_KEY=<替换为随机字符串>
      - DB_DIALECT=postgres
      - DB_HOST=192.168.1.31
      - DB_PORT=5432
      - DB_DATABASE=nocobase_v210beta
      - DB_USER=postgres
      - DB_PASSWORD=Wasu@3.14
      - TZ=Asia/Shanghai
    volumes:
      - ./storage:/app/nocobase/storage
    ports:
      - '13000:80'
```

> **注意**: 每个 NocoBase 实例必须有唯一的 `APP_KEY`，更换数据库时也建议更换 APP_KEY。

### 2.4 启动 NocoBase

```bash
mkdir -p storage
docker compose up -d

# 等待初始化完成（约 20-30 秒）
# --quickstart 模式会自动创建管理员账户
sleep 30

# 验证服务已就绪
curl -s -o /dev/null -w "%{http_code}" http://192.168.1.28:13000/
# 期望返回: 200
```

### 2.5 验证登录

```bash
curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"admin123"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Token:', d['data']['token'][:20]+'...')"
```

默认管理员: `admin@nocobase.com` / `admin123`

---

## 3. 启用插件

> **坑点 #2**: v2.1 的插件管理 API 与 v2.0 不同！
> - `POST /api/pm:add` 返回 `{"data":"ok"}` 但实际不添加插件到数据库
> - `POST /api/pm:enable/<name>` 返回 404
> - **正确方式**: 用容器内 CLI 命令

```bash
# 添加插件（@nocobase/full 镜像已包含所有社区插件包，无需下载）
docker exec noco-app-1 yarn nocobase pm add @nocobase/plugin-api-doc
docker exec noco-app-1 yarn nocobase pm add @nocobase/plugin-api-keys

# 启用插件
docker exec noco-app-1 yarn nocobase pm enable @nocobase/plugin-api-doc
docker exec noco-app-1 yarn nocobase pm enable @nocobase/plugin-api-keys

# 重启让所有改动生效
docker compose restart
sleep 25
```

**验证插件状态**:

```bash
TOKEN=$(curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

curl -s "http://192.168.1.28:13000/api/applicationPlugins:list?pageSize=100" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -c "
import sys,json
plugins=json.load(sys.stdin)['data']
print(f'Total: {len(plugins)} plugins')
for p in plugins:
    if 'api' in p['packageName'].lower():
        print(f'  {p[\"packageName\"]}: enabled={p[\"enabled\"]}')
"
```

---

## 4. 创建 API Key

> **坑点 #3**: `POST /api/apiKeys:create` 在 v2.1 中报错 "WHERE parameter name has invalid undefined value"。
> **解决方案**: 直接通过 SQL 插入。

```bash
docker run --rm -e PGPASSWORD='Wasu@3.14' postgres:16-alpine \
  psql -h 192.168.1.31 -U postgres -d nocobase_v210beta \
  -c "INSERT INTO \"apiKeys\" (\"name\", \"token\", \"roleName\", \"createdById\", \"createdAt\")
      VALUES ('mcp-access', '<生成一个64位hex字符串>', 'root', 1, NOW())
      RETURNING id, name, token;"
```

> **坑点 #4**: API Key Bearer 认证在 v2.1-beta 中**不工作**（返回 INVALID_TOKEN）。
> MCP Server 需要使用 session token（通过 auth:signIn 获取），API Key 仅做备用。

---

## 5. 部署 MCP Server

### 5.1 构建 MCP Server

MCP Server 源码在 `/code/noco/mcp-server/repo/`，依赖已安装。

如需从头构建:

```bash
git clone https://github.com/nocobase/mcp-server-nocobase.git /code/noco/mcp-server/repo
cd /code/noco/mcp-server/repo
npm install
npm run build
```

> **注意**: `mcp-server-nocobase` **没有发布到 npm**，必须从 GitHub clone。

### 5.2 关键代码说明

`build/index.js` 中包含了三个关键修复，**不要删除**:

#### 修复 1: SDK baseURL 必须包含 `/api` 后缀

```javascript
const client = new APIClient({
  baseURL: url + "/api",  // 必须加 /api，否则返回 HTML 404
});
```

#### 修复 2: Swagger 响应可能是字符串

```javascript
const raw = res.data;
const apis = typeof raw === "string" ? JSON.parse(raw) : raw;
```

#### 修复 3: 工具 inputSchema 循环引用

> **坑点 #5** (最关键的 bug): `openapi2mcptools` 生成的部分工具 `inputSchema` 存在循环引用
> （`properties.xxx.additionalProperties` 指回父对象），导致 `JSON.stringify` 抛出
> "Converting circular structure to JSON" 异常，MCP SDK 内部序列化失败，`tools/list` 静默无响应。
>
> 同时，v2.1 Swagger 中约 91/155 个 API 缺少 `description`，MCP SDK 也会拒绝。

```javascript
function sanitizeTool(t) {
  let schema;
  try {
    // 深拷贝断开循环引用
    schema = JSON.parse(JSON.stringify(t.inputSchema));
  } catch {
    schema = {};
  }
  if (!schema.type) schema.type = "object";
  if (!schema.properties) schema.properties = {};
  return {
    name: t.name,
    description: t.description || ("NocoBase API: " + t.name),
    inputSchema: schema,
  };
}

const tools = converter.getToolsList().map(sanitizeTool);
```

### 5.3 测试 MCP Server

```bash
# 获取 session token
TOKEN=$(curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 发送 MCP 协议请求测试
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
| timeout 30 docker run --rm --network host -i \
  -v /code/noco/mcp-server/repo:/app -w /app \
  node:24-slim node build/index.js \
  "http://192.168.1.28:13000" "$TOKEN" 2>/dev/null \
| python3 -c "
import sys,json
for line in sys.stdin:
    line=line.strip()
    if not line: continue
    data=json.loads(line)
    if 'tools' in data.get('result',{}):
        tools=data['result']['tools']
        print(f'OK: {len(tools)} tools loaded')
"
# 期望输出: OK: 155 tools loaded
```

---

## 6. MCP 客户端配置

### Claude Desktop / Cursor (`mcp-config.json`)

```json
{
  "mcpServers": {
    "nocobase": {
      "command": "docker",
      "args": [
        "run", "--rm", "--network", "host", "-i",
        "-v", "/code/noco/mcp-server/repo:/app",
        "-w", "/app",
        "node:24-slim",
        "node", "build/index.js",
        "http://192.168.1.28:13000",
        "<TOKEN>"
      ]
    }
  }
}
```

> **注意**: 使用 session token 时需定期刷新（JWT 默认 24h 过效）。
> `mcp-config.json` 中的 TOKEN 需要每次更新为有效的 session token。

### 命令行启动 (`start-mcp.sh`)

```bash
#!/bin/bash
TOKEN=$(curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"admin123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

exec docker run --rm --network host -i \
  -v /code/noco/mcp-server/repo:/app -w /app \
  node:24-slim node build/index.js \
  "http://192.168.1.28:13000" "$TOKEN"
```

---

## 7. 常用运维命令

```bash
# 查看 NocoBase 日志
docker logs noco-app-1 --tail 50

# 重启 NocoBase
docker compose restart

# 完全重建（清除数据）
docker compose down
rm -rf storage
mkdir storage
docker compose up -d

# 查看数据库
docker run --rm -e PGPASSWORD='Wasu@3.14' postgres:16-alpine \
  psql -h 192.168.1.31 -U postgres -d nocobase_v210beta \
  -c 'SELECT COUNT(*) FROM "applicationPlugins";'
```

---

## 8. 已知坑点汇总

| # | 坑点 | 现象 | 解决方案 |
|---|------|------|----------|
| 1 | Docker Hub 429 限流 | 国内镜像加速器频繁 429 | 使用 `crane` 直接从 Docker Hub Registry API 拉取 |
| 2 | 阿里云无 v2.1 镜像 | registry.cn-shanghai.aliyuncs.com 只有 v2.0.x | 只能用 Docker Hub + crane |
| 3 | v2.1 插件 API 变更 | pm:enable 返回 404 / pm:add 虽返回 ok 但无效 | 用 `docker exec yarn nocobase pm add/enable` |
| 4 | API Key 创建 API 报错 | apiKeys:create 返回 WHERE parameter undefined | 直接 SQL INSERT |
| 5 | API Key 认证不工作 | Bearer token 返回 INVALID_TOKEN | 使用 session token（auth:signIn） |
| 6 | SDK baseURL 缺少 /api | swagger:get 返回 HTML 404 | `baseURL: url + "/api"` |
| 7 | Swagger 响应为字符串 | typeof res.data === "string" | `JSON.parse(raw)` |
| 8 | inputSchema 循环引用 | tools/list 静默无响应（MCP SDK 序列化崩溃） | `JSON.parse(JSON.stringify())` 深拷贝 |
| 9 | 工具缺少 description | 91/155 个工具无描述，MCP 校验失败 | 补充默认 description |
| 10 | crane tag 不存在 | v2.1.0-beta.13-full manifest unknown | 先用 `crane manifest` 确认 tag 可用，用 2.1.0-beta.11-full |
| 11 | npm 包不存在 | npm install mcp-server-nocobase 失败 | 从 GitHub clone 源码 |
| 12 | 文件写入不持久化 | write_to_file 写挂载卷文件被还原 | 用 `docker run` + heredoc 写入容器内文件 |

---

## 9. 文件结构

```
/code/noco/
├── docker-compose.yml          # NocoBase 主服务
├── mcp-config.json             # MCP 客户端配置 (Claude/Cursor)
├── start-mcp.sh                # MCP Server 启动脚本
├── storage/                    # NocoBase 持久化数据 (当前 v2.1)
├── storage_v2035_backup/       # v2.0.35 旧数据备份
├── mcp-server/
│   └── repo/                   # mcp-server-nocobase 源码
│       └── build/
│           └── index.js        # MCP Server 入口（含 sanitizeTool 修复）
└── nocobase-skills/            # NocoBase Skills (CLI 工具)
    └── .claude/skills/         # 8 个 Skills (data-modeling, workflow 等)
```
