# noco-config-mcp

NocoBase 配置 MCP Server，通过标准 MCP 协议暴露 NocoBase REST API 操作，供 AI Agent 完成基础配置任务。

> **v2.1**: OpenAPI 风格资源级工具设计，7 个工具（原 28 个），每个通过 `action` 参数区分操作。

## 7 个工具

| 工具名 | actions | 说明 |
|--------|---------|------|
| `collections` | list, get, create, update, delete | 数据表管理 |
| `fields` | list, create, update, delete | 字段管理 |
| `records` | list, create, update, delete, batch_create | 记录 CRUD |
| `routes` | list, create_group, create_page, delete | 菜单路由 |
| `schemas` | create, get, update, delete | UI Schema |
| `flow_models` | create, attach, find, list, save, destroy | Flow Engine 模型 |
| `table_ui` | create, delete | 一站式建表/删表 UI |

## 导入 MCP 服务

### CodeBuddy / Cursor / Windsurf

在 MCP 配置文件中添加（路径通常为 `~/.codebuddy/mcp.json` 或项目根目录 `.cursor/mcp.json`）：

```json
{
  "mcpServers": {
    "noco-config": {
      "command": "docker",
      "args": [
        "run", "--rm", "--network", "host", "-i",
        "wasu-wtvdev-registry-test-registry.cn-hangzhou.cr.aliyuncs.com/pub/noco-config-mcp:latest",
        "http://192.168.1.28:13000",
        "admin@nocobase.com",
        "noco@D807"
      ]
    }
  }
}
```

> 也可挂载本地代码运行（开发调试用）：将 `noco-config-mcp:latest` 替换为 `-v /code/noco/noco-config-mcp:/app -w /app node:24-slim node index.js`

### Claude Desktop

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`（macOS）或对应路径，填入相同的 `mcpServers` 配置。

### 直接运行（调试用）

```bash
# 安装依赖
cd noco-config-mcp && npm install

# 启动（stdin/stdout MCP 协议）
node index.js http://192.168.1.28:13000 admin@nocobase.com noco@D807
```

命令行参数：`node index.js <base_url> <email> <password>`

认证：启动时自动登录获取 Bearer token，401 自动重试。

## 部署

### 目录结构

```
noco-config-mcp/
├── index.js                  # 入口
├── package.json
├── lib/
│   ├── api.js                # API 客户端（登录、请求、token 管理）
│   ├── constants.js          # 系统表/字段判断、类型映射
│   ├── tool-definitions.js   # 7 个工具定义
│   └── handlers/
│       ├── collections.js    # 数据表 CRUD
│       ├── fields.js         # 字段 CRUD
│       ├── records.js        # 记录 CRUD
│       ├── routes.js         # 菜单路由
│       ├── schemas.js        # UI Schema
│       ├── flow-models.js    # Flow Engine 模型
│       └── table-ui.js       # 一站式建表/删表
```

### 依赖

- Node.js >= 18（推荐 24）
- `@modelcontextprotocol/sdk`（MCP SDK）
- 无其他外部依赖，无需数据库连接

### Docker 部署

```bash
# 挂载本地代码运行（开发/调试）
docker run --rm --network host -i \
  -v /code/noco/noco-config-mcp:/app \
  -e NOCO_BASE_URL=http://192.168.1.28:13000 \
  -e NOCO_EMAIL=admin@nocobase.com \
  -e NOCO_PASSWORD='noco@D807' \
  -e NOCO_PROXY_PORT=13001 \
  -w /app \
  node:24-slim \
  node index.js
```

### 注意事项

- `--network host`：MCP 使用 stdio 通信，但需要访问 NocoBase API，确保网络可达
- 首次启动会自动 `npm install`（Docker 挂载方式）
- 不暴露任何端口，通过 stdin/stdout 与宿主 MCP 客户端通信

## 典型工作流

### 一键建表

```
collections { action: "create", name: "orders", title: "订单", fields: [...] }
table_ui    { action: "create", collection_name: "orders", group_title: "订单管理" }
```

### 删除

```
table_ui    { action: "delete", collection_name: "orders" }   ← 先删 UI
collections { action: "delete", name: "orders" }              ← 再删表
```

### 手动构建页面

```
routes      { action: "create_group", title: "报表" }
routes      { action: "create_page", title: "销售报表", parentId: 5, children: [...] }
flow_models { action: "create", use: "BlockGridModel", parentId: "tabUid", subKey: "grid" }
flow_models { action: "create", use: "TableBlockModel", parentId: "gridUid", subKey: "items" }
flow_models { action: "create", use: "TableColumnModel", parentId: "tableUid", subKey: "columns" }
```

## NocoBase v2 Flow Engine

`flowModels` + `flowModelTreePath` 替代旧版 `uiSchemas`。模型通过 `use` 字段指定类名，树结构通过 `parentId` + `subKey` 关联。

### 常用模型

| 类名 | 用途 |
|------|------|
| `BlockGridModel` | 页面网格容器 |
| `TableBlockModel` | 数据表格块 |
| `TableColumnModel` | 表格列 |
| `TableActionsColumnModel` | 操作列 |
| `FilterFormBlockModel` | 筛选表单块 |
| `FilterFormGridModel` | 筛选表单网格 |
| `FilterFormItemModel` | 筛选表单项 |
| `FilterActionModel` | 筛选操作按钮组 |
| `FormBlockModel` | 表单块 |
| `ActionGroupModel` | 操作按钮组 |
| `AddNewActionModel` | 新增按钮 |
| `EditActionModel` | 编辑按钮 |
| `DeleteActionModel` | 删除按钮 |
| `RefreshActionModel` | 刷新按钮 |
| `BulkDeleteActionModel` | 批量删除按钮 |

### subKey 树结构

```
Tab (schemaUid)
  └── grid → BlockGridModel (object)
        ├── items[0] → FilterFormBlockModel
        │     ├── grid → FilterFormGridModel
        │     │     └── items → [FilterFormItemModel × N]
        │     │           └── field → InputFieldModel / ...
        │     └── actions → FilterActionModel
        │           └── items → [Submit, Reset, Collapse]
        └── items[1] → TableBlockModel
              ├── columns → [TableColumnModel × N, TableActionsColumnModel]
              │     └── field → DisplayModel
              │     └── items → [EditAction, DeleteAction]
              └── actions → ActionGroupModel
                    └── items → [AddNew, Refresh, BulkDelete]
```

### 字段类型映射

| interface | DisplayModel | 可筛选 |
|-----------|-------------|--------|
| input / textarea | InputVM | ✓ |
| number / integer | NumberVM | ✗ |
| select | SelectVM | ✓ |
| datePicker | DatePickerVM | 可选 |
| checkbox | CheckboxVM | ✗ |
| m2o | AssociationVM | ✓ |
