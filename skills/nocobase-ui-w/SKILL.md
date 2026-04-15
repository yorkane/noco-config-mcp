---
name: nocobase-ui-w
description: >-
  通用 NocoBase UI 构建器。当用户需要为 NocoBase 中的数据表批量或单个创建 UI 页面时触发。
  自动发现数据表，智能分组，为每张表生成标准化的列表页面。
  覆盖：菜单分组、页面路由、表格区块、表单区块。
---

# 通用 NocoBase UI 构建器

## 触发条件

用户提到以下意图时激活本 SKILL：
- "为nocobase 数据表创建页面/界面/UI"
- "nocobase 批量建页面"
- "nocobase 建 UI"
- 检查/修改/删除 NocoBase UI 页面

## 执行入口

阅读 [execution-checklist.md](./references/execution-checklist.md) 开始执行。

## 范围

### 负责
- 通过 `collections:list` 自动发现用户数据表
- 分析表名，智能确定分组（共同前缀 → 自动分组，无前缀 → 问用户）
- 创建/查找菜单分组（`desktopRoutes` group）
- 为每张数据表创建 `flowPage` 页面，包含表格列表区块
- 页面内容：表格 + 操作按钮（新增/编辑/查看/删除）

### 不负责
- 数据建模（collection/field 创建）→ 提示用户自行操作
- 权限/ACL 管理
- 工作流编排
- 复杂 UI（图表、弹窗嵌套、自定义组件）

## 硬规则

1. 所有写操作只走 `uiSchemas:*` + `desktopRoutes:*` REST API
2. 写操作前必须确认 API 可达且认证有效
3. 每个新 schema 节点的 `x-uid` 必须全局唯一，不可复用
4. 建页面永远两步：**先 Schema，后 Route**
5. 删页面必须同时删除 Route 和 Schema
6. 多步操作中任一步失败，立即停止，分别报告成功和失败
7. `inspect` 模式只读，不调用任何写 API

## 实例信息

| 项目 | 值 |
|---|---|
| Base URL | `http://192.168.1.28:13000` |
| 版本 | NocoBase v2.0.36 |
| API | `uiSchemas:*` + `desktopRoutes:*` + `collections:*` |
| 认证 | `POST /api/auth:signIn` → Bearer token |

## 术语

| 术语 | 含义 |
|---|---|
| `schemaUid` | 页面 UI schema 根节点的 `x-uid`，被 `desktopRoutes` 引用 |
| `x-uid` | UI schema 树中每个节点的全局唯一标识 |
| `flowPage` | NocoBase v2 的标准页面类型 |
| `collection` | 数据表，通过 `collections:list` 发现 |
| `readback` | 写操作后的最小化读取确认 |

## 参考文档

| 文档 | 用途 |
|---|---|
| [execution-checklist.md](./references/execution-checklist.md) | 执行流程：预检→发现→分组→建页→验证 |
| [api-guide.md](./references/api-guide.md) | REST API 参考（认证 + collections + routes + schemas） |
| [field-mapping.md](./references/field-mapping.md) | 字段类型 → UI 组件的通用映射规则 |
| [schema-templates.md](./references/schema-templates.md) | 通用 JSON 模板（页面/表格/列/操作） |
| [verification.md](./references/verification.md) | 验证规则（readback、验收级别、常见错误） |
