---
name: sql-to-nocobase
description: 将标准 SQL DDL（CREATE TABLE / ALTER TABLE / INSERT）转换为 NocoBase REST API 建模操作。支持 PostgreSQL / MySQL DDL 语法，自动完成集合创建、字段映射、关联关系建立、字段中文化和初始数据录入。
argument-hint: "<sql-file-or-ddl-string> [--api <url>] [--email <admin>] [--password <pwd>]"
allowed-tools: shell, local file
---

# Goal

将标准 SQL DDL 语句（`CREATE TABLE`、`ALTER TABLE`、`COMMENT ON`、`INSERT INTO` 等）解析并转换为 NocoBase 的数据表<collection>对象, 并通过noco-config-mcp 完成:

1. 集合（Collection）创建 — 对应 `CREATE TABLE`
2. 字段（Field）创建 — 对应列定义 + `COMMENT ON COLUMN`
3. 关联关系（Relation）创建 — 对应 `FOREIGN KEY` 约束
4. 字段中文化 — 对应 `COMMENT ON COLUMN` 的中文描述
5. 初始数据录入 — 对应 `INSERT INTO`
6. 执行验证 — 确认 NocoBase 中 Schema 与 SQL 定义一致

# Mandatory Gates

1. **Auth Gate**: 所有 Schema 操作需要 Admin Session Token（通过 `auth:signIn` 获取），API Key 会导致 `fields:create` 返回 403。先获取 Token 再执行任何写操作。
2. **Existence Gate**: 创建前先检查集合是否已存在。如存在，确认是增量更新还是重建（删除后重建）。
3. **Dependency Gate**: 有外键依赖的集合按依赖顺序创建（先父表后子表），删除时反向（先子表后父表）。
4. **FK Collision Gate**: 关联字段的 `name`（逻辑名）不能与 `foreignKey`（数据库列名）同名，否则报 `Naming collision`。NocoBase 自动创建 FK 列，不需要手动创建同名字段。

# Core Rules

## SQL → NocoBase 映射原则

| SQL 概念 | NocoBase 概念 | API 端点 |
|----------|---------------|----------|
| `CREATE TABLE` | 集合 (Collection) | `POST /api/collections:create` |
| 列定义 (Column) | 字段 (Field) | `POST /api/fields:create` 或内嵌于集合创建 |
| `COMMENT ON TABLE` | 集合 `title` | 集合的 `title` 字段 |
| `COMMENT ON COLUMN` | 字段 `uiSchema.title` | 字段的 `uiSchema: {title: "..."}` |
| `FOREIGN KEY` | 关联关系 (Relation) | `POST /api/fields:create` (interface: m2o/o2m) |
| `CREATE INDEX` | 自动（NocoBase 管理） | 不需要手动创建 |
| `INSERT INTO` | 业务数据 (Record) | `POST /api/<collection>:create` |
| `DEFAULT value` | 字段 `defaultValue` | 字段的 `defaultValue` 属性 |
| `NOT NULL` | 字段 `required` 或验证器 | 字段的验证属性 |
| `AUTO_INCREMENT` / `SERIAL` | 模板自动管理 | `template: "general"` 自动创建 id |
| `created_at` / `updated_at` | 模板自动管理 | `template: "general"` 自动创建 |

## 执行优先级

```
SQL 输入
  │
  ├─ 1. 解析 DDL → 提取表结构、列定义、注释、外键
  │
  ├─ 2. 确定创建顺序（拓扑排序外键依赖）
  │
  ├─ 3. 创建集合（template: "general" + 普通字段 + 中文标题）
  │
  ├─ 4. 创建关联关系（m2o/o2m，含反向字段）
  │
  ├─ 5. 补全 FK 字段中文标题
  │
  ├─ 6. 录入 INSERT 数据
  │
  └─ 7. 验证（读回每个集合的字段列表，与 SQL 定义比对）
```

## 禁止事项

- **禁止**用 `collections:update` 修改字段列表（会全量替换，遗漏字段会被删除）
- **禁止**在 `fields:create` 中使用 `collectionName` 参数（正确的是 `collection`）
- **禁止**省略关联字段的 `type` 参数（m2o 必须有 `"type": "belongsTo"`，o2m 必须有 `"type": "hasMany"`）
- **禁止**手动创建与 FK 同名的普通字段（NocoBase 关联创建时自动创建 FK 列）
- **禁止**在 `fields` 数组中包含 `id`、`createdAt`、`updatedAt`、`createdBy`、`updatedBy`（`template: "general"` 自动创建）

# SQL Data Type → NocoBase Interface Mapping

## 标量类型映射

| SQL 类型 | NocoBase `interface` | NocoBase `type` | 说明 |
|----------|----------------------|-----------------|------|
| `VARCHAR(n)` / `CHAR(n)` | `input` | `string` | 单行文本 |
| `TEXT` / `CLOB` | `textarea` | `text` | 多行文本 |
| `INTEGER` / `INT` / `SMALLINT` | `integer` | `integer` | 整数 |
| `BIGINT` (非FK) | `integer` | `integer` | 大整数 |
| `SERIAL` / `BIGSERIAL` | _(系统管理)_ | _(系统管理)_ | 由 general 模板自动创建 |
| `REAL` / `FLOAT` / `DOUBLE` / `DECIMAL` / `NUMERIC` | `number` | `double` | 浮点数 |
| `BOOLEAN` / `BOOL` | `checkbox` | `boolean` | 布尔 |
| `DATE` | `dateOnly` | `date` | 仅日期 |
| `TIME` | `time` | `time` | 仅时间 |
| `TIMESTAMP` / `DATETIME` | `datetime` | `date` | 日期时间 |
| `TIMESTAMPTZ` | `datetime` | `date` | 带时区日期时间 |
| `JSON` / `JSONB` | `json` | `json` | JSON 数据 |
| `UUID` | `input` | `string` | UUID 文本 |
| `BYTEA` / `BLOB` | `attachment` | `belongsToMany` | 二进制 → 附件 |

## 特殊语义推断

除了纯类型映射外，还需根据**列名语义**推断更精确的 interface：

| 列名模式 | 推断 `interface` | 说明 |
|----------|------------------|------|
| `*_email` / `email` | `email` | 邮箱 |
| `*_phone` / `*_tel` / `*_mobile` | `phone` | 电话 |
| `*_url` / `*_link` / `*_website` | `url` | 链接 |
| `*_password` / `*_pwd` | `password` | 密码 |
| `*_color` / `*_colour` | `color` | 颜色选择器 |
| `*_icon` | `icon` | 图标选择器 |
| `sort` / `*_sort` / `*_order` | `sort` | 排序字段 |
| `status` (有限值) | `select` | 下拉选择（需提取 enum） |
| `*_type` (有限值) | `select` | 类型选择 |
| `is_*` / `has_*` / `*_flag` | `checkbox` | 布尔标记 |
| `*_content` / `*_body` / `*_html` | `textarea` 或 `richText` | 富文本 |
| `*_price` / `*_amount` / `*_total` / `*_fee` | `number` | 金额 |
| `*_count` / `*_quantity` / `*_qty` / `*_num` | `integer` | 计数 |
| `*_rate` / `*_percent` / `*_ratio` | `percent` | 百分比 |
| `*_code` / `*_no` (有规律) | `sequence` | 序列号 |

## 外键 → 关联关系映射

| SQL 外键模式 | NocoBase 操作 | 说明 |
|-------------|---------------|------|
| `category_id BIGINT REFERENCES categories(id)` | 在 products 集合创建 `m2o` 字段 `category`，在 categories 集合自动创建 `o2m` 反向字段 | 多对一 |
| 需要一对多反向 | 同上，通过 `reverseField` 参数自动创建 | 自动 |
| 多对多（中间表） | 创建中间表集合 + 两个 `m2o` 字段，或在两端创建 `m2m` 字段 | 多对多 |

**外键转换规则**：

```python
# SQL: products.category_id REFERENCES categories(id)
# 转换为:
{
    "collection": "products",       # FK 所在表
    "name": "category",             # 逻辑名（去掉 _id 后缀）
    "interface": "m2o",
    "type": "belongsTo",
    "target": "categories",         # 被引用表
    "foreignKey": "category_id",    # 实际 FK 列名
    "targetKey": "id",
    "uiSchema": {"title": "所属分类"},
    "reverseField": {               # 反向关联（可选）
        "name": "products",
        "interface": "o2m",
        "type": "hasMany",
        "uiSchema": {"title": "产品列表"}
    }
}
```

**FK 字段名推导**：

- FK 列名 `category_id` → 逻辑名 `category`（去掉 `_id` 后缀）
- FK 列名 `order_id` → 逻辑名 `order`
- FK 列名 `user_id` → 逻辑名 `user` 或 `creator`
- `name`（逻辑名）不能与 `foreignKey`（数据库列名）同名

**m2o Payload 示例**：

```json
{
  "collection": "products",
  "name": "category",
  "interface": "m2o",
  "target": "categories",
  "foreignKey": "category_id",
  "targetKey": "id",
  "uiSchema": {"title": "所属分类"},
  "reverseField": {
    "name": "products",
    "interface": "o2m",
    "uiSchema": {"title": "产品列表"}
  }
}
```

# COMMENT → uiSchema.title 中文化

| SQL COMMENT 类型 | NocoBase 映射位置 | 何时设置 |
|-----------------|-------------------|----------|
| `COMMENT ON TABLE` | 集合的 `title` 字段 | `collections:create` 时 |
| `COMMENT ON COLUMN` | 字段的 `uiSchema.title` | `collections:create` 的 fields 中，或事后 `fields:update` |
| FK 列的 COMMENT | 需要在创建关联后，通过 `fields:update` 补全 | 关联创建后 |
| MySQL `COMMENT 'xxx'` | 等价于 PostgreSQL `COMMENT ON COLUMN` | 同上 |

**关键**: NocoBase 关联字段创建时自动生成 FK 列，该 FK 列的 `uiSchema.title` 默认为列名（如 `category_id`），需要事后用 `fields:update` 补全为中文。

**补全流程**：
1. `GET /api/collections:get?filterByTk=<collection>&appends=fields` → 获取字段列表
2. 找到 FK 字段的 `key`
3. `POST /api/fields:update?filterByTk=<key>` body: `{"uiSchema": {"title": "分类ID", "x-uid": "<key>"}}`

# Working Process（7 步 SOP）

## Step 1: 解析 SQL DDL

提取：`CREATE TABLE`（表名、列定义、约束）→ `COMMENT ON`（中文标题）→ `FOREIGN KEY`（关联关系）→ `INSERT INTO`（初始数据）→ 忽略 `CREATE INDEX`。

**解析优先级**:
1. `CREATE TABLE` → 表名、列定义、约束
2. `COMMENT ON` → 中文标题
3. `FOREIGN KEY` → 关联关系
4. `INSERT INTO` → 初始数据
5. `CREATE INDEX` → 忽略（NocoBase 自动管理索引）

## Step 2: 认证

- `POST /api/auth:signIn` 获取 Admin Session Token
- Schema 操作（建表/建字段/建关联）**必须**用 Session Token，API Key 会 403
- 业务 CRUD（INSERT 数据）两者均可

## Step 3: 创建集合

- 每个 `CREATE TABLE` → `POST /api/collections:create`
- 使用 `template: "general"` 自动创建 id/createdAt/updatedAt
- 普通列直接映射为字段，含 `uiSchema.title`
- **FK 列不放入 fields 数组**（Step 4 创建关联时自动生成）
- **系统列不放入 fields 数组**（id/created_at/updated_at 由模板管理）

```python
def create_collection(api, token, name, title, fields):
    """创建集合（含普通字段 + 中文标题）"""
    body = {
        "name": name,
        "title": title,
        "template": "general",
        "fields": fields  # 不含 id/createdAt/updatedAt/createdBy/updatedBy
    }
    # POST /api/collections:create
```

- 每个 `FOREIGN KEY` → `POST /api/fields:create` 创建 m2o 字段 + reverseField o2m
- 先创建被引用集合（父表），再创建有 FK 的集合（子表）
- 依赖顺序确保父表已存在

## 4. Create Relations（创建关联）

```python
def create_relation(api, token, source, field_name, target, fk_column, reverse_name=None):
    """创建关联字段（m2o）含反向字段（o2m）"""
    body = {
        "collection": source,        # 注意：是 "collection" 不是 "collectionName"
        "name": field_name,           # 逻辑名，如 "category"（不带 _id）
        "interface": "m2o",
        "type": "belongsTo",          # 必须显式指定！
        "target": target,
        "foreignKey": fk_column,
        "targetKey": "id",
        "uiSchema": {"title": f"所属{target.rstrip('s')}"},
        "reverseField": {
            "name": reverse_name or f"{source}_list",
            "interface": "o2m",
            "type": "hasMany",         # 反向字段也必须指定 type！
            "uiSchema": {"title": f"{source}列表"}
        }
    }
    # POST /api/fields:create
```

## Step 6: 录入初始数据

- 每个 `INSERT INTO` → `POST /api/<collection>:create`
- 字段名对应 SQL 列名

## Step 7: 验证

- `GET /api/collections:get?filterByTk=<name>&appends=fields` 检查字段
- `GET /api/<collection>:list?pageSize=1` 检查记录数

# Relation Reference

## 关联类型选择决策

| 场景 | 关联类型 | FK 位置 | interface | type |
|------|---------|---------|-----------|------|
| 多条记录属于一条目标记录 | m2o | 当前集合 | `m2o` | `belongsTo` |
| 一条记录拥有多条目标记录 | o2m | 目标集合 | `o2m` | `hasMany` |
| 一条记录对应一条目标记录 | o2o | 先确定所有者 | `m2o`/`o2o` | `belongsTo`/`hasOne` |
| 两端都多条，需要中间表 | m2m | 中间表 | `m2m` | `belongsToMany` |
| 插件提供的多对多数组 | mbm | — | `mbm` | `belongsToArray` |

调试关联时的推荐顺序：
1. 确认 FK 在哪一侧
2. 选择关联类型
3. 确认 `target`、`foreignKey`、`sourceKey`、`targetKey`、`through`、`otherKey`
4. 最后定义 `reverseField`

## m2o（Many To One）

场景：FK 存储在**当前集合**。

```json
{
  "name": "customer",
  "interface": "m2o",
  "title": "Customer",
  "target": "customers",
  "foreignKey": "customerId",
  "targetKey": "id",
  "targetTitleField": "name",
  "reverseField": {
    "name": "orders",
    "title": "Orders",
    "interface": "o2m"
  }
}
```

验证：当前集合包含 `customerId`，类型为 `belongsTo`，反向字段出现在目标集合。

## o2m（One To Many）

场景：FK 存储在**目标集合**。

```json
{
  "name": "items",
  "interface": "o2m",
  "title": "Items",
  "target": "order_items",
  "sourceKey": "id",
  "foreignKey": "orderId",
  "targetKey": "id",
  "targetTitleField": "id",
  "reverseField": {
    "name": "order",
    "title": "Order",
    "interface": "m2o"
  }
}
```

验证：目标集合包含 `orderId`，类型为 `hasMany`，反向字段在目标集合为 `belongsTo`。

## o2o（One To One）

场景：先确定所有者侧。FK 在当前集合用 `belongsTo`，FK 在目标集合用 `hasOne`。

```json
{
  "name": "profile",
  "interface": "m2o",
  "title": "Profile",
  "target": "profiles",
  "foreignKey": "profileId",
  "targetKey": "id",
  "targetTitleField": "displayName",
  "reverseField": {
    "name": "user",
    "title": "User",
    "interface": "o2o"
  }
}
```

注意：不要在两侧都放 FK，不要混淆 o2o 与 o2m。

## m2m（Many To Many）

场景：两端都多条记录，需要中间表。必须指定 `through`、`foreignKey`、`otherKey`。

```json
{
  "name": "tags",
  "interface": "m2m",
  "title": "Tags",
  "target": "tags",
  "through": "orders_tags",
  "sourceKey": "id",
  "foreignKey": "orderId",
  "otherKey": "tagId",
  "targetKey": "id",
  "targetTitleField": "name",
  "reverseField": {
    "name": "orders",
    "title": "Orders",
    "interface": "m2m"
  }
}
```

注意：不要省略 `through`；`foreignKey` 和 `otherKey` 不要搞反；不要用 m2m 代替 m2o/o2m。

## mbm（Many To Many Array）

仅当插件提供的多对多数组接口时使用。需先确认 `@nocobase/plugin-m2m-array` 已安装启用。

```json
{
  "name": "members",
  "interface": "mbm",
  "title": "Members",
  "target": "users",
  "foreignKey": "f_members",
  "targetKey": "id"
}
```

注意：不要将 mbm 与核心 m2m 混淆；确认插件已启用后才能创建。

# Model Pack Reference

Model Pack 是经过验证的完整多表建模模式。使用时先根据 Collection Type 选择模板，再用 Relation Reference 确定关联方向，最后用 Model Pack 验证端到端结构。

**Authority 规则**: collection-type > field > relation > model-pack。即 Model Pack 仅供参考验证，不覆盖底层规则。

## 模板类型速查

| SQL 模式 | NocoBase template | 说明 |
|----------|-------------------|------|
| 普通业务表 | `general` | 自动创建 id/createdAt/updatedAt/createdBy/updatedBy |
| 继承表 | `inherit` | 需配合 `inherits: "parent_collection"` |
| 文件表 | `file` | 包含 filename/path/mimetype/url 等模板字段 |
| 日历表 | `calendar` | 包含 cron/exclude 等模板字段 |
| 树形结构 | `tree` | 包含 parentId/parent/children 结构字段 |
| SQL 查询 | `sql` | 直接写 SQL，需配合 `sql` 字段 |
| 数据库视图 | `view` | 映射已有数据库视图 |

## 订单模式（Orders）

典型事务模型：`customers` → `orders` → `order_items`

- 三个集合均用 `general` 模板
- `orders.customer` → m2o → `customers`（FK: `customerId`）
- `order_items.order` → m2o → `orders`（FK: `orderId`）
- 反向字段：`customers.orders`（o2m）、`orders.items`（o2m）
- 创建顺序：customers → orders → order_items

## 继承模式（Person → Students）

- `person` 用 `general` 模板，包含共享字段（name/email/phone）
- `students` 用 `inherit` 模板 + `inherits: "person"`，仅添加 studentNo/grade/score
- 继承表不需要手动重复父表字段

## 文件模式（Contracts + Contract Files）

- `contracts` 用 `general` 模板
- `contract_files` 用 `file` 模板（自动包含 filename/extname/size/mimetype/url 等字段）
- 关联：`contract_files.contract` → m2o → `contracts`（添加在 file 模板之上）
- **注意**：file 模板字段不要手动重复创建

## 日历模式（Calendar Appointments）

- `appointments` 用 `calendar` 模板
- 自动包含 cron/exclude 等模板字段
- 业务字段：title/startAt/endAt/status/notes
- startAt/endAt 使用 `datetime` interface，设置 `timezone: true`

## 树形模式（Tree Categories）

- `product_categories` 用 `tree` 模板 + `tree: "adjacencyList"`
- 模板自动创建 parentId/parent/children
- parent 字段带 `treeParent: true`，children 字段带 `treeChildren: true`
- **注意**：不要手动创建 parentId/parent/children，它们由模板管理
- 自引用：target 指向自身 `product_categories`

## SQL 视图模式（SQL / View）

| 需求 | template | 关键参数 |
|------|----------|---------|
| NocoBase 管理查询 | `sql` | `"sql": "SELECT ..."` + 声明 fields |
| 映射已有数据库视图 | `view` | `"view": true, "schema": "public"` |

# Pitfall Record（踩坑记录）

## P1: `fields:create` 返回 403
**原因**: Admin API Key 没有 Schema 管理权限。
**解决**: 通过 `POST /api/auth:signIn` 获取 Admin Session Token。

## P2: 参数名 `collection` 不是 `collectionName`
**原因**: `fields:create` body 中集合参数名为 `collection`。
**解决**: 使用 `"collection": "products"` 而非 `"collectionName": "products"`。

## P3: 关联字段缺少 `type` 导致 `unsupported field type null`
**原因**: NocoBase 要求关联字段显式指定 `type`。
**解决**: m2o: `belongsTo` / o2m: `hasMany` / m2m: `belongsToMany` / reverseField 也必须指定。

## P4: `collections:update` 会全量替换字段
**原因**: 传 fields 数组时，不带 key 的已有字段会被删除。
**解决**: **永远用 `fields:create` 单独添加字段**。避免使用 `collections:update`。

## P5: 关联字段 name 与 foreignKey 同名导致冲突
**原因**: `name`（逻辑名）与 `foreignKey`（数据库列名）不能相同。
**解决**: name 去掉 `_id` 后缀，如 `category_id` → name 为 `category`。

## P6: 字段中文标题在 `uiSchema.title` 而非 `title`
**原因**: NocoBase 的字段显示标题存储在 `uiSchema.title` 中。
**解决**: 创建时用 `"uiSchema": {"title": "中文名"}`，更新时用 `fields:update`。

## P7: FK 字段标题需要事后补全
**原因**: 创建关联时自动生成的 FK 列 `uiSchema.title` 默认为列名。
**解决**: 创建关联后，通过 `fields:update` 补全中文标题。

## P8: general 模板自动创建系统字段
**原因**: `template: "general"` 自动创建 id/createdAt/updatedAt/createdBy/updatedBy。
**解决**: 不要在 fields 数组中包含这些字段。

## P9: 数据表创建完成后没有id字段
**原因**: 数据表创建完成后，NocoBase 会自动创建 id 字段。
**解决**: 完成后，通过 `/api/mainDataSource:syncFields` POST `{"collections":["<collection_name>"}` 同步nocobase 生成好的id字段。

## P10: 数据表同步id字段后标题字段丢失
**原因**: 数据表字段同步后，数据表标题字段默认变成了id
**解决**: 通过 `/api/collections:update?filterByTk=<collection_name>`  POST  {"titleField":"<field_name>"} 来设置标题字段。标题字段尽量是描述性的，如 name, title, caption


# Quick Reference

## SQL 一行 → NocoBase 字段一行

```
name VARCHAR(255) NOT NULL COMMENT '名称'  →  {"name":"name","interface":"input","type":"string","uiSchema":{"title":"名称"}}
description TEXT COMMENT '描述'             →  {"name":"description","interface":"textarea","type":"text","uiSchema":{"title":"描述"}}
price DOUBLE DEFAULT 0 COMMENT '价格'       →  {"name":"price","interface":"number","type":"double","uiSchema":{"title":"价格"},"defaultValue":0}
is_hot BOOLEAN DEFAULT FALSE COMMENT '热门' →  {"name":"is_hot","interface":"checkbox","type":"boolean","uiSchema":{"title":"热门"},"defaultValue":false}
status VARCHAR(32) DEFAULT 'pending'        →  {"name":"status","interface":"select","type":"string","defaultValue":"pending"}
sort INTEGER DEFAULT 0                      →  {"name":"sort","interface":"sort","type":"integer","defaultValue":0}
category_id BIGINT REFERENCES categories(id) →  创建 m2o 关联，不放入 fields 数组
created_at TIMESTAMP DEFAULT NOW()           →  不放入 fields 数组（general 模板自动创建）
```

## curl 速查

```bash
API="http://host:13000/api"
TOKEN="<admin_session_token>"

# 认证
curl -s -X POST "$API/auth:signIn" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@nocobase.com","password":"admin123"}'

# 创建集合
curl -s -X POST "$API/collections:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"products","title":"产品","template":"general","fields":[{"name":"name","interface":"input","type":"string","uiSchema":{"title":"产品名称"}}]}'

# 创建关联（m2o + o2m 反向）
curl -s -X POST "$API/fields:create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"collection":"products","name":"category","interface":"m2o","target":"categories","foreignKey":"category_id","targetKey":"id","uiSchema":{"title":"所属分类"},"reverseField":{"name":"products","interface":"o2m","uiSchema":{"title":"产品列表"}}}'

# 查看 Schema
curl -s "$API/collections:get?filterByTk=products&appends=fields"

# 查看字段列表
curl -s "$API/fields:list?collection=products"

```
