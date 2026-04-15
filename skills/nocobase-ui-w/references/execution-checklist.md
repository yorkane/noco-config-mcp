# 执行流程

本文件是默认执行入口。按照以下步骤操作。

## 流程总览

```
预检 → 发现数据表 → 分组决策 → 批量建页面 → 验证
```

---

## 1. 预检

- 确认 NocoBase API 可达
- 获取认证 Token（参考 [api-guide.md](./api-guide.md)）
- `inspect` 模式下只读，不执行写操作

```bash
# 快速获取 Token
TOKEN=$(curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"noco@D807"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 验证连接
curl -s http://192.168.1.28:13000/api/app:getInfo -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['version'])"
```

---

## 2. 发现数据表

### 2.1 查询所有用户数据表

```bash
curl -s "http://192.168.1.28:13000/api/collections:list?pageSize=200" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
# 过滤系统表
system_prefixes = ['_', 'audit', 'workflow']
for c in data:
    name = c['name']
    if not any(name.startswith(p) for p in system_prefixes):
        fields = [f['name'] for f in c.get('fields', [])]
        print(f'{name}: {fields}')
"
```

### 2.2 过滤系统表

排除以下表：
- 名字以 `_` 开头的表
- NocoBase 内置表（users, roles, collections, fields, migrations 等）

保留所有用户创建的业务表。

---

## 3. 分组决策

### 3.1 分析表名前缀

对过滤后的用户表列表：

1. 提取所有表名
2. 检测是否存在共同前缀（用下划线分隔）

**共同前缀检测算法：**

```
表名列表 = ["shop_categories", "shop_products", "shop_orders"]

1. 按下划线分割每个表名
2. 取第一部分作为前缀候选
3. 如果所有表的第一部分相同 → 共同前缀 = 第一部分
4. 否则 → 无共同前缀

示例：
  ["shop_categories", "shop_products", "shop_orders"] → 前缀 "shop"
  ["categories", "products", "orders"] → 无前缀
  ["tea_products", "coffee_orders"] → 无共同前缀（"tea" ≠ "coffee"）
```

### 3.2 确定分组名称

| 情况 | 操作 |
|---|---|
| 有共同前缀 | 分组名 = 前缀的中文含义或首字母大写形式 |
| 无共同前缀 | **必须询问用户**：请提供分组名称 |
| 用户指定分组名 | 使用用户指定的名称 |

### 3.3 检查/创建分组

```bash
# 查看现有分组
curl -s "http://192.168.1.28:13000/api/desktopRoutes:listAccessible?tree=true" \
  -H "Authorization: Bearer $TOKEN"

# 如果分组已存在 → 获取 groupId
# 如果分组不存在 → 创建
curl -s -X POST http://192.168.1.28:13000/api/desktopRoutes:create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"分组名","type":"group","sort":100}'
```

---

## 4. 批量建页面

对每个用户数据表，执行以下操作：

### 4.1 为每个表确定页面标题

- 如果表有共同前缀：页面标题 = 去掉前缀后的部分，转换为中文或友好名称
- 如果没有前缀：使用表的 `title`（如果有）或 `name`

**标题推断规则：**
```
products → "产品列表"
categories → "分类管理"
orders → "订单管理"
order_items → "订单明细"
users → "用户管理"
```

### 4.2 确定表格列和筛选字段

对表的每个字段：
1. 读取字段 `interface` 类型
2. 跳过系统字段（id, created_at, updated_at, *_id 外键）
3. 根据映射表确定 UI 组件（参考 [field-mapping.md](./field-mapping.md)）
4. 推断列标题
5. **数字/日期字段**：列定义中添加 `"sorter": true` 启用排序
6. **文本/选择字段**：同时作为筛选表单的候选字段

### 4.3 创建页面（两步法）

**第一步：创建 Schema**

构建包含**筛选表单 + 数据表格**的完整页面 Schema：
- 页面骨架：2 行 Grid（filter 行 + table 行）
- 筛选表单区块：`FilterFormBlockProvider`，包含文本/选择字段的筛选控件，通过 `x-filter-targets` 连接到表格区块
- 数据表格区块：`TableBlockProvider`，包含所有业务列 + 操作列
- 数字/日期列：添加 `"sorter": true`

```bash
# 生成唯一 uid（每个节点一个）
ROOT_UID=$(python3 -c "import secrets; print(secrets.token_urlsafe(8))")
GRID_UID=$(python3 -c "import secrets; print(secrets.token_urlsafe(8))")
FILTER_BLOCK_UID=$(python3 -c "import secrets; print(secrets.token_urlsafe(8))")
TABLE_BLOCK_UID=$(python3 -c "import secrets; print(secrets.token_urlsafe(8))")
# ... 为每个节点生成 uid

# 提交 schema（参考 schema-templates.md 的完整页面示例）
curl -s -X POST http://192.168.1.28:13000/api/uiSchemas:insertAdjacent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @- << 'EOF'
{
  "schema": {
    ... 完整的页面 Schema（筛选表单 + 表格区块 + 所有列） ...
  }
}
EOF
```

**第二步：创建路由**

```bash
curl -s -X POST http://192.168.1.28:13000/api/desktopRoutes:create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"页面标题\",\"type\":\"flowPage\",\"schemaUid\":\"$ROOT_UID\",\"parentId\":$GROUP_ID}"
```

### 4.4 批量循环

```
对每个表：
  1. 生成所有 uid
  2. 构建 Schema JSON（页面骨架 + 表格区块 + 列定义）
  3. 提交 uiSchemas:insertAdjacent
  4. 确认成功 → 提交 desktopRoutes:create
  5. 任一步失败 → 立即停止，报告
```

---

## 5. 验证

参考 [verification.md](./verification.md)。

最小验证：
- 读取菜单树，确认所有页面都出现在正确分组下
- 对每个页面的 schemaUid 调用 getJsonSchema，确认内容完整
- 在浏览器中打开页面确认可正常访问

---

## 6. 其他意图

### 检查（inspect）

```
1. GET /api/desktopRoutes:listAccessible?tree=true → 菜单结构
2. GET /api/uiSchemas:getJsonSchema/<uid> → 页面内容
3. 只读，不调用任何写 API
```

### 修改页面

```
1. 读取当前 schema
2. 使用 uiSchemas:patch 或 uiSchemas:insertAdjacent 修改
3. readback 确认
```

### 删除页面

```
1. POST /api/desktopRoutes:destroy?filterByTk=<route_id>
2. POST /api/uiSchemas:remove  { "x-uid": "<schema_root_uid>" }
必须同时删除两者
```

---

## 7. 停止/移交

- 认证无法恢复 → 停止并报告
- Schema 树不一致且无法通过重新读取解决 → 停止并报告
- 数据建模需求（collection/field 创建） → 提示用户这不是本 SKILL 的职责
