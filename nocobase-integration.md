# NocoBase 智能应用开发集成规范

> **本文档面向所有基于 NocoBase 平台进行应用开发的 Code Agent 和开发者。**
> 只需通过 **MCP 服务 + Skills + Plugins** 三要素即可完成全部业务开发。

---

## 1. 平台定位

| 角色 | 说明 |
|------|------|
| **NocoBase** | 业务操作系统 — 数据建模、UI、工作流、权限、分析全部由 NocoBase 托管 |
| **MCP 服务** | 标准化操作通道 — Agent 通过 MCP Tools 操控 NocoBase，不直接写 SQL |
| **Skills** | 团队开发规范 — Agent 必须遵循对应 Skill |
| **Plugins** | 能力扩展 — 覆盖数据、流程、通知、AI 等场景 |

---

## 2. 接入方式

### 2.1 MCP 服务接入（Agent 操作通道）

将以下配置加入你的 MCP 客户端（CodeBuddy / Claude Desktop / Cursor 等）：

```json
{
  "mcpServers": {
    "noco-config": {
      "command": "docker",
      "args": [
        "run", "--rm", "--network", "host", "-i",
        "your-registry/noco-config-mcp:latest",
        "http://<NOCOBASE_HOST>:13000",
        "<ADMIN_EMAIL>",
        "<ADMIN_PASSWORD>"
      ]
    }
  }
}
```

### 2.2 REST API 直连（APP 前端通道）

APP 前端（移动端、小程序、Web）可直接调用 NocoBase REST API：

```
Base URL: http://<NOCOBASE_HOST>:13000/api
```

**主要 API 路径**：

| 操作 | 路径 | 说明 |
|------|------|------|
| 列表查询 | `GET /api/<collection>:list` | 支持筛选、分页、排序、关联加载 |
| 单条查询 | `GET /api/<collection>:get?filterByTk=<id>` | 支持关联加载 `appends` |
| 创建 | `POST /api/<collection>:create` | Body 为 JSON |
| 更新 | `POST /api/<collection>:update?filterByTk=<id>` | Body 为 JSON |
| 删除 | `POST /api/<collection>:destroy?filterByTk=<id>` | — |
| 登录 | `POST /api/auth:signIn` | `{email, password}` → 返回 token |
| 注册 | `POST /api/auth:signUp` | — |
| 触发工作流 | `POST /api/workflows:execute?filterByTk=<id>` | `{payload: {...}}` |
| Webhook 触发 | `POST /api/workflows/webhook/<key>` | — |

**认证方式**：

```javascript
const res = await fetch('http://<NOCOBASE_HOST>:13000/api/auth:signIn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'xxx' })
});
const { data } = await res.json();
const token = data.token;  // JWT

fetch('http://<NOCOBASE_HOST>:13000/api/orders:list?page=1&pageSize=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

---

## 3. 可用插件清单

NocoBase -full 镜像包含大量社区插件，按需启用即可。主要分类：

- **数据建模**: `collection-fdw`, `collection-sql`, `collection-tree`, `field-formula`, `field-sequence` 等
- **UI 与页面**: `block-grid-card`, `block-iframe`, `kanban`, `gantt`, `calendar`, `map` 等
- **工作流**: `workflow`, `workflow-action-trigger`, `workflow-delay`, `workflow-javascript` 等
- **通知**: `notification-email`, `notification-in-app-message`
- **权限与认证**: `acl`, `auth`, `departments`
- **数据可视化**: `data-visualization-echarts`
- **系统**: `api-doc`, `api-keys`, `file-manager`, `public-forms` 等

---

## 4. Skills 体系

每个 Agent 根据任务类型加载对应 Skill：

| 当你需要... | 加载这个 Skill |
|-------------|---------------|
| 创建/修改数据表 | `nocobase-data-modeling` |
| 设计页面/布局/区块 | `nocobase-ui-builder` |
| 配置自动化流程 | `nocobase-workflow-manage` |
| 设置角色/权限 | `nocobase-acl-manage` |
| 查询/统计数据 | `nocobase-data-analysis` |

---

## 5. 三大核心原则

1. **NocoBase 是唯一的业务真相源** — Agent 不直接操作数据库
2. **MCP 是唯一的操作通道** — 通过 MCP Tools 操作，禁止绕过 API
3. **Skills 是团队统一的操作规范** — 必须遵循对应 Skill 规范

---

## 6. 标准 APP 开发工作流

严格按以下阶段顺序执行：**数据建模 → UI → 工作流 → 权限 → APP 前端**。

---

## 7. 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| Collection name | 小写 + 下划线 | `orders`, `order_items` |
| Field name | 小写 + 下划线 | `created_at`, `total_amount` |
| Workflow title | 动词 + 对象 + 条件 | 「订单支付后发送通知」 |
| Role name | 业务角色名 | `sales_manager` |
