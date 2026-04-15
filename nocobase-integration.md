# NocoBase 智能应用开发集成规范

> **本文档面向所有基于 NocoBase 平台进行应用开发的 Code Agent 和开发者。**
> 你无需了解 NocoBase 的部署、数据库、容器等基础设施细节。
> 只需通过 **MCP 服务 + Skills + Plugins** 三要素即可完成全部业务开发。

---

## 1. 平台定位

| 角色 | 说明 |
|------|------|
| **NocoBase** | 业务操作系统 — 数据建模、UI、工作流、权限、分析全部由 NocoBase 托管 |
| **MCP 服务** | 标准化操作通道 — Agent 通过 155+ MCP Tools 操控 NocoBase，不直接写 SQL |
| **Skills** | 团队开发规范 — 8 个领域操作手册，Agent 必须遵循对应 Skill |
| **Plugins** | 能力扩展 — 86 个已启用插件，覆盖数据、流程、通知、AI 等场景 |

---

## 2. 接入方式

### 2.1 MCP 服务接入（Agent 操作通道）

将以下配置加入你的 MCP 客户端（CodeBuddy / Claude Desktop / Cursor 等），即可获得 155+ 个 NocoBase 操作工具：

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
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGVOYW1lIjoicm9vdCIsImlhdCI6MTc3NTkwNTc3NywiZXhwIjozMzMzMzUwNTc3N30.J34qD9hY5s8oh0lcpQqNBIlLUVJtFvuwaBNohFKIjfM"
      ]
    }
  }
}
```

> **注意**: token 由平台管理员提供，请勿在文档中硬编码。如需新 token，联系管理员通过 `auth:signIn` 或 API Key 获取。

### 2.2 REST API 直连（APP 前端通道）

APP 前端（移动端、小程序、Web）可直接调用 NocoBase REST API：

```
Base URL: http://192.168.1.28:13000/api
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
// 用户登录获取 token
const res = await fetch('http://192.168.1.28:13000/api/auth:signIn', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'xxx' })
});
const { data } = await res.json();
const token = data.token;  // JWT

// 后续请求携带 token
fetch('http://192.168.1.28:13000/api/orders:list?page=1&pageSize=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**数据操作示例**：

```javascript
// 带筛选的分页查询
GET /api/orders:list?filter={"$and":[{"status":{"$eq":"paid"}}]}&page=1&pageSize=20&sort=-createdAt

// 创建记录
POST /api/orders:create
{ "title": "新订单", "amount": 99.9, "customer_id": 1 }

// 关联查询
GET /api/orders:get?filterByTk=1&appends=items,customer
```

---

## 3. 可用插件清单

以下 86 个插件已启用，可直接通过 MCP Tools 或 API 使用：

### 数据建模

| 插件 | 说明 |
|------|------|
| `collection-fdw` | 外部数据源（Foreign Data Wrapper）|
| `collection-sql` | SQL 集合（基于 SQL 查询的虚拟集合）|
| `collection-tree` | 树形结构集合 |
| `field-formula` | 公式字段 |
| `field-sequence` | 自增序列字段 |
| `field-sort` | 排序字段 |
| `field-m2m-array` | M2M 数组字段 |
| `field-code` | 代码字段 |
| `field-markdown-vditor` | Markdown 编辑器字段 |
| `field-attachment-url` | 附件 URL 字段 |
| `field-china-region` | 中国行政区划字段 |
| `graph-collection-manager` | 数据表关系图 |

### UI 与页面

| 插件 | 说明 |
|------|------|
| `block-grid-card` | 网格卡片区块 |
| `block-iframe` | iframe 嵌入区块 |
| `block-list` | 列表区块 |
| `block-markdown` | Markdown 区块 |
| `block-multi-step-form` | 多步表单区块 |
| `block-template` | 区块模板 |
| `block-tree` | 树形区块 |
| `block-workbench` | 工作台区块 |
| `kanban` | 看板视图 |
| `gantt` | 甘特图视图 |
| `calendar` | 日历视图 |
| `map` | 地图视图 |
| `mobile` | 移动端适配 |
| `theme-editor` | 主题编辑器 |
| `ui-templates` | UI 模板库 |

### 数据操作

| 插件 | 说明 |
|------|------|
| `action-bulk-edit` | 批量编辑 |
| `action-bulk-update` | 批量更新 |
| `action-custom-request` | 自定义 HTTP 请求 |
| `action-duplicate` | 复制记录 |
| `action-export` | 数据导出 |
| `action-import` | 数据导入 |
| `action-print` | 打印 |
| `form-drafts` | 表单草稿 |
| `multi-keyword-filter` | 多关键词筛选 |

### 工作流

| 插件 | 说明 |
|------|------|
| `workflow` | 工作流引擎核心 |
| `workflow-action-trigger` | 操作触发器 |
| `workflow-aggregate` | 聚合节点 |
| `workflow-cc` | 抄送节点 |
| `workflow-custom-action-trigger` | 自定义操作触发 |
| `workflow-date-calculation` | 日期计算节点 |
| `workflow-delay` | 延时节点 |
| `workflow-dynamic-calculation` | 动态计算节点 |
| `workflow-javascript` | JavaScript 节点 |
| `workflow-json-query` | JSON 查询节点 |
| `workflow-json-variable-mapping` | JSON 变量映射 |
| `workflow-loop` | 循环节点 |
| `workflow-mailer` | 邮件节点 |
| `workflow-manual` | 人工节点（审批）|
| `workflow-notification` | 通知节点 |
| `workflow-parallel` | 并行节点 |
| `workflow-request` | HTTP 请求节点 |
| `workflow-request-interceptor` | 请求拦截器 |
| `workflow-response-message` | 响应消息节点 |
| `workflow-sql` | SQL 节点 |
| `workflow-variable` | 工作流变量 |
| `flow-engine` | 流程引擎 |

### 通知

| 插件 | 说明 |
|------|------|
| `notification-manager` | 通知管理 |
| `notification-email` | 邮件通知 |
| `notification-in-app-message` | 站内消息通知 |

### 权限与认证

| 插件 | 说明 |
|------|------|
| `acl` | 访问控制列表 |
| `auth` | 认证 |
| `auth-sms` | 短信认证 |
| `departments` | 部门管理 |
| `users` | 用户管理 |
| `verification` | 验证码 |

### 数据可视化

| 插件 | 说明 |
|------|------|
| `data-visualization` | 数据可视化 |
| `data-visualization-echarts` | ECharts 图表 |

### 系统与工具

| 插件 | 说明 |
|------|------|
| `api-doc` | API 文档（Swagger）|
| `api-keys` | API Key 管理 |
| `async-task-manager` | 异步任务管理 |
| `client` | 客户端框架 |
| `comments` | 评论 |
| `custom-variables` | 自定义变量 |
| `data-source-manager` | 数据源管理 |
| `data-source-main` | 主数据源 |
| `embed` | 嵌入管理 |
| `environment-variables` | 环境变量 |
| `error-handler` | 错误处理 |
| `file-manager` | 文件管理 |
| `file-previewer-office` | Office 文件预览 |
| `license` | 许可证 |
| `localization` | 多语言 |
| `logger` | 日志 |
| `multi-app-manager` | 多应用管理 |
| `public-forms` | 公开表单 |
| `system-settings` | 系统设置 |
| `text-copy` | 文本复制 |
| `ui-schema-storage` | UI Schema 存储 |
| `user-data-sync` | 用户数据同步 |

### AI

| 插件 | 说明 |
|------|------|
| `ai` | AI 能力 |
| `ai-gigachat` | GigaChat 集成 |

---

## 4. Skills 体系（8 个领域操作手册）

每个 Agent 在接入后，根据任务类型加载对应 Skill。Skill 定义了标准操作流程、校验清单、错误处理和交接边界。

```
skills/
├── nocobase-install-start/       # [部署] 安装与启动（仅管理员）
├── nocobase-mcp-setup/           # [连接] MCP 接入配置（仅首次）
├── nocobase-data-modeling/       # [数据] 集合 / 字段 / 关系建模
├── nocobase-ui-builder/          # [界面] 页面 / 区块 / 弹窗搭建
├── nocobase-workflow-manage/     # [流程] 工作流 / 触发器 / 节点
├── nocobase-acl-manage/          # [权限] 角色 / 权限 / 行范围
├── nocobase-data-analysis/       # [分析] 数据查询 / 聚合 / 报表
└── nocobase-utils/               # [工具] 表达式引擎 / 过滤器语法
```

### Skill 选择矩阵

| 当你需要... | 加载这个 Skill | 不要跨入 |
|-------------|---------------|----------|
| 创建/修改数据表 | `nocobase-data-modeling` | 不要用 UI Builder 建表 |
| 设计页面/布局/区块 | `nocobase-ui-builder` | 不要用 Data Modeling 建 UI |
| 配置自动化流程 | `nocobase-workflow-manage` | 不要用 Script 节点替代独立 Skill |
| 设置角色/权限 | `nocobase-acl-manage` | 不要用 CRUD 写权限表 |
| 查询/统计数据 | `nocobase-data-analysis` | 不要直接 SQL |
| 查表达式/过滤器语法 | `nocobase-utils` | — |

### 阶段交接规则

```
数据建模完成 → 通知 UI Builder 可以绑定数据源
UI 页面完成   → 通知 ACL 配置菜单可见性
工作流需要字段 → 调用 Data Modeling 确认字段存在
权限需要数据范围 → 调用 Utils 确认过滤器语法
```

---

## 5. 三大核心原则

### 原则 1: NocoBase 是唯一的业务真相源

- 所有业务数据结构（Collections / Fields / Relations）由 NocoBase 管理
- 所有业务流程（Workflows）由 NocoBase 编排
- 所有权限（ACL / Roles / Scopes）由 NocoBase 控制
- **Agent 不直接操作数据库，不绕过 NocoBase API**

### 原则 2: MCP 是唯一的操作通道

- Agent 对 NocoBase 的所有操作必须通过 MCP Tools
- 禁止直接写 SQL、绕过 API 或修改 NocoBase 内部文件
- MCP 提供 155+ 个标准工具，覆盖完整的 CRUD + 管理 + 分析

### 原则 3: Skills 是团队统一的操作规范

- 每个 Agent 在执行特定领域任务时，必须加载对应的 Skill
- Skill 定义了操作流程、校验清单和错误处理
- **违反 Skill 规范的变更视为无效变更**

---

## 6. 标准 APP 开发工作流

严格按以下阶段顺序执行：**数据建模 → UI → 工作流 → 权限 → APP 前端**。

### 阶段 1: 数据建模 (`nocobase-data-modeling`)

```
1. 确认业务实体 → 确定 Collection 类型 (general / tree / file / calendar / sql)
2. 设计字段 → 选择 Interface (string / integer / select / date / relation ...)
3. 建立关系 → O2M / M2O / M2M / O2O
4. 通过 MCP 创建 → collections apply / fields apply
5. 验证 → collections get 确认结构正确
```

### 阶段 2: UI 搭建 (`nocobase-ui-builder`)

```
1. 规划页面结构 → 菜单组 → 菜单项 → 页面 → 标签页
2. 添加区块 → 列表 / 表单 / 详情 / 图表 / 看板
3. 配置字段 → 显示哪些字段、排列顺序
4. 配置操作 → 新增 / 编辑 / 删除 / 筛选 / 导出
5. 通过 MCP 创建 → flow_surfaces_* 系列工具
6. 验证 → desktop_routes_list_accessible 确认可见
```

### 阶段 3: 工作流编排 (`nocobase-workflow-manage`)

```
1. 确定触发方式 → 表单事件 / 定时 / Webhook / 审批
2. 设计节点链 → 条件 → 计算 → 创建/更新 → 通知
3. 通过 MCP 创建 → enabled: false → 配置触发器 → 添加节点 → 验证 → 启用
4. 测试执行 → workflows:execute → 检查 executions / jobs
```

### 阶段 4: 权限配置 (`nocobase-acl-manage`)

```
1. 创建角色
2. 配置系统权限 → 可访问的模块
3. 配置菜单权限 → 可见的菜单项
4. 配置表权限 → 全局策略 + 独立权限 + 字段权限
5. 配置行范围 → scope (全部 / 仅自己 / 自定义条件)
```

### 阶段 5: APP 前端开发

```
1. NocoBase 作为 Headless CMS / BaaS
2. APP 前端调用 NocoBase REST API（参见第 2.2 节）
3. 认证使用 NocoBase 用户登录或 API Key
4. 数据结构已在阶段 1 定义，API 路径与 Collection 对应
5. 工作流可在前端通过 API 触发
```

---

## 7. 开发规范

### 7.1 命名规范

| 对象 | 规范 | 示例 |
|------|------|------|
| Collection name | 小写 + 下划线，业务名词 | `orders`, `order_items`, `customers` |
| Field name | 小写 + 下划线 | `created_at`, `total_amount` |
| Relation field | 关系方向 + 目标名 | `customer` (M2O), `items` (O2M) |
| Workflow title | 动词 + 对象 + 条件 | 「订单支付后发送通知」 |
| Role name | 业务角色名 | `sales_manager`, `warehouse_staff` |

### 7.2 变更纪律

1. **先建模，再 UI，后流程，最后权限** — 严格按阶段顺序
2. **每个变更必须可验证** — 创建后立即 `get` 确认
3. **工作流必须先禁用** — `enabled: false` → 配置完成 → 人工确认 → 启用
4. **权限变更最小化** — 只授权必要的操作和字段
5. **不覆盖已有配置** — 先 `list` 检查，再决定 `create` 还是 `update`

### 7.3 禁止操作

| 禁止 | 原因 | 正确方式 |
|------|------|----------|
| 直接写 SQL 修改业务数据 | 绕过 Hook/Workflow/ACL | 通过 MCP 或 API |
| 用 `crud` 写 ACL 表 | 不经过权限中间件 | 通过 `nocobase-acl-manage` |
| 同时创建多个工作流节点 | 不支持并发节点创建 | 逐个顺序创建 |
| 在冻结版本上直接编辑 | 破坏已执行的流程 | 先创建 revision |
| 猜测字段 interface | 会导致创建失败 | 查阅 Skill 中 `field-capabilities.md` |

---

## 8. 典型场景：电商订单系统

### 执行步骤

```
Step 1 [Data Modeling]:
  创建 collections:
    - products (商品): name, price, stock, category, status, image
    - orders (订单): order_no, customer, total, status, items
    - order_items (订单明细): order, product, quantity, price
    - categories (分类): name, parent (tree)
  创建 relations:
    - products M2O categories
    - orders O2M order_items
    - order_items M2O products

Step 2 [UI Builder]:
  创建页面:
    - 菜单组「商品管理」→ 商品列表页 (含筛选/新增/编辑)
    - 菜单组「订单管理」→ 订单列表页 (含状态筛选/详情弹窗)
    - 菜单组「数据报表」→ 订单统计图表

Step 3 [Workflow]:
  创建工作流:
    - 「订单创建后扣减库存」: collection trigger → query product → update stock
    - 「大额订单审批」: condition → approval → notification

Step 4 [ACL]:
  配置权限:
    - role: sales_staff → 可看订单/客户，不可看财务数据
    - role: warehouse_staff → 可看库存/发货，不可看价格
    - role: admin → 全部权限

Step 5 [APP 前端]:
  对接 API:
    - 移动端/小程序通过 REST API 读写订单
    - 使用 API Key 或用户登录认证
    - 调用 workflows:execute 触发审批
```

---

## 9. 常见问题

| 现象 | 原因 | 解决方案 |
|------|------|----------|
| MCP tools/list 无响应 | inputSchema 循环引用 | 联系管理员，已内置 `sanitizeTool` 修复 |
| API 返回 INVALID_TOKEN | token 过期 | 重新调用 `auth:signIn` 获取新 token |
| 工作流节点创建失败 | 并发创建不支持 | 逐个顺序创建 |
| 权限配置不生效 | 字段权限未配置 | 独立权限必须配 field lists |
| APP 前端跨域 | CORS 未配置 | 联系管理员添加 CORS 配置 |
| 字段创建失败 | interface 类型错误 | 查阅 `field-capabilities.md` 确认正确类型 |
