# API 参考

本文件是所有 REST API 操作的唯一参考。覆盖：认证、collections 发现、desktopRoutes 管理、uiSchemas 管理。

## 目录

1. [认证](#1-认证)
2. [Collections API（数据表发现）](#2-collections-api)
3. [desktopRoutes API（菜单路由）](#3-desktoproutes-api)
4. [uiSchemas API（页面内容）](#4-uischemas-api)
5. [两步建页面流程](#5-两步建页面流程)
6. [错误处理](#6-错误处理)

---

## 1. 认证

### 登录获取 Token

```bash
POST /api/auth:signIn
Content-Type: application/json

{
  "email": "admin@nocobase.com",
  "password": "noco@D807"
}
```

**响应：**
```json
{
  "data": {
    "token": "<session_token>",
    "user": { "id": 1, "email": "admin@nocobase.com" }
  }
}
```

**后续请求需携带：**
```
Authorization: Bearer <session_token>
```

**获取 Token 的快捷命令：**
```bash
TOKEN=$(curl -s -X POST http://192.168.1.28:13000/api/auth:signIn \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@nocobase.com","password":"noco@D807"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")
```

---

## 2. Collections API

### 列出所有数据表

```
GET /api/collections:list?pageSize=200
Authorization: Bearer <token>
```

**响应结构（关键字段）：**
```json
{
  "data": [
    {
      "name": "products",
      "title": "产品",
      "fields": [
        {
          "name": "name",
          "type": "string",
          "interface": "input",
          "uiSchema": { "title": "名称" }
        },
        {
          "name": "price",
          "type": "float",
          "interface": "number",
          "uiSchema": { "title": "价格" }
        }
      ]
    }
  ]
}
```

**过滤系统表：**
系统表的 `name` 通常以 `_` 开头或是 NocoBase 内置表。只需关注用户创建的表。

**过滤逻辑：**
```
用户表 = 排除 name 以 "_" 开头的表
        排除 name 在 ["users", "roles", "collections", "fields"] 中的内置表
```

### 获取单个数据表详情

```
GET /api/collections:get?filterByTk=<collection_name>
Authorization: Bearer <token>
```

---

## 3. desktopRoutes API

### 列出菜单树

```
GET /api/desktopRoutes:listAccessible?tree=true
Authorization: Bearer <token>
```

**响应结构：**
```json
{
  "data": [
    {
      "id": 123,
      "title": "分组名",
      "type": "group",
      "sort": 100,
      "children": [
        {
          "id": 456,
          "title": "页面名",
          "type": "flowPage",
          "schemaUid": "abc123",
          "parentId": 123
        }
      ]
    }
  ]
}
```

**关键字段：**
- `type`: `group`（分组）| `flowPage`（页面）
- `schemaUid`: 页面内容的 UI schema 根 uid
- `parentId`: 父级分组 id

### 创建分组

```
POST /api/desktopRoutes:create
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "分组名称",
  "type": "group",
  "sort": 100
}
```

### 创建页面路由

```
POST /api/desktopRoutes:create
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "页面名称",
  "type": "flowPage",
  "schemaUid": "<schema根节点uid>",
  "parentId": <分组id>,
  "sort": 100
}
```

**关键：** `schemaUid` 必须引用一个已存在的 UI schema。

### 更新路由

```
POST /api/desktopRoutes:update?filterByTk=<路由id>
Content-Type: application/json

{
  "title": "新标题"
}
```

### 删除路由

```
POST /api/desktopRoutes:destroy?filterByTk=<路由id>
```

**注意：** 删除路由不会自动删除关联的 UI schema，需手动清理。

---

## 4. uiSchemas API

### 插入新的 Schema 根节点

```
POST /api/uiSchemas:insertAdjacent
Content-Type: application/json
Authorization: Bearer <token>

{
  "schema": {
    "name": "root",
    "x-uid": "<全局唯一ID>",
    "x-component": "Page",
    "properties": { ... }
  }
}
```

### 在已有节点下插入子节点

```
POST /api/uiSchemas:insertAdjacent
Content-Type: application/json

{
  "position": "beforeEnd",
  "uid": "<父节点uid>",
  "schema": { ... }
}
```

**position 值：**
- `beforeEnd` — 追加为最后一个子节点（最常用）
- `afterBegin` — 插入为第一个子节点
- `beforeBegin` — 在目标兄弟节点前
- `afterEnd` — 在目标兄弟节点后

### 更新 Schema 节点

```
POST /api/uiSchemas:patch
Content-Type: application/json

{
  "x-uid": "<目标uid>",
  "x-component-props": { "title": "新标题" }
}
```

### 删除 Schema 节点

```
POST /api/uiSchemas:remove
Content-Type: application/json

{
  "x-uid": "<目标uid>"
}
```

### 读取完整 Schema

```
GET /api/uiSchemas:getJsonSchema/<schemaUid>
Authorization: Bearer <token>
```

返回完整的嵌套 JSON schema 树。

---

## 5. 两步建页面流程

### 第一步：创建 UI Schema

```
POST /api/uiSchemas:insertAdjacent

{
  "schema": {
    "name": "root",
    "x-uid": "<PAGE_ROOT_UID>",
    "x-component": "Page",
    "properties": {
      "grid": {
        "type": "void",
        "x-component": "Grid",
        "x-uid": "<GRID_UID>",
        "properties": {
          "row": {
            "type": "void",
            "x-component": "Grid.Row",
            "x-uid": "<ROW_UID>",
            "properties": {
              "col": {
                "type": "void",
                "x-component": "Grid.Col",
                "x-uid": "<COL_UID>",
                "properties": {}
              }
            }
          }
        }
      }
    }
  }
}
```

根节点的 `x-uid` 即为页面的 `schemaUid`。

### 第二步：创建路由

```
POST /api/desktopRoutes:create

{
  "title": "页面标题",
  "type": "flowPage",
  "schemaUid": "<PAGE_ROOT_UID>",
  "parentId": <分组id>
}
```

**顺序不能反：** Schema 必须先于 Route 存在。

---

## 6. 错误处理

### 常见错误

| 错误 | 原因 | 解决 |
|---|---|---|
| `uid already exists` | x-uid 重复 | 重新生成唯一 uid |
| `schema not found` | uid 不存在 | 通过 getJsonSchema 确认 |
| `401 Unauthorized` | Token 过期 | 重新认证 |
| `parent_id not found` | 分组不存在 | 先创建分组 |
| 页面空白 | schemaUid 与 route 不匹配 | 检查 route 的 schemaUid |

### 恢复规则

1. 认证失败 → 重新登录
2. UID 冲突 → 生成新 uid
3. Schema 操作失败 → 先读取当前状态再重试
4. Route 创建失败但 Schema 已存在 → 清理孤立 Schema（`uiSchemas:remove`）
5. 批量操作部分失败 → 立即停止，分别报告
