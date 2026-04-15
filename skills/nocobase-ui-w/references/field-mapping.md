# 字段类型 → UI 组件映射

本文件定义从 NocoBase collection 字段类型到 UI 组件的通用映射规则。
所有映射基于字段的 `interface` 属性（可通过 `collections:list` 获取）。

## 字段 interface → x-component 映射表

| 字段 interface | x-component | 备注 |
|---|---|---|
| `input` | `Input` | 单行文本 |
| `textarea` | `Input.TextArea` | 多行文本，`{ "rows": 3 }` |
| `email` | `Input` | 邮箱 |
| `phone` | `Input` | 手机号 |
| `password` | `Password` | 密码 |
| `number` | `InputNumber` | 数字，`{ "step": "0.01" }` |
| `integer` | `InputNumber` | 整数，`{ "step": "1" }` |
| `percent` | `Percent` | 百分比 |
| `checkbox` | `Checkbox` | 布尔值 |
| `select` | `Select` | 下拉选择，需要 `enum` |
| `radioGroup` | `Radio.Group` | 单选组 |
| `checkboxGroup` | `Checkbox.Group` | 多选组 |
| `datePicker` | `DatePicker` | 日期 |
| `timePicker` | `TimePicker` | 时间 |
| `url` | `Input` | URL |
| `colorPicker` | `ColorPicker` | 颜色 |
| `icon` | `IconPicker` | 图标 |
| `richText` | `RichText` | 富文本 |
| `attachment` | `Upload` | 附件 |
| `m2o` / `belongsTo` | `AssociationField` | `{ "mode": "Select" }` |
| `o2m` / `hasMany` | `AssociationField` | `{ "mode": "Select" }` |
| `m2m` / `belongsToMany` | `AssociationField` | `{ "mode": "Select" }` |
| `json` | `Input.TextArea` | JSON 文本 |
| `text` | `Input.TextArea` | 长文本 |

## 系统字段（建表时跳过）

以下字段在创建表格列时跳过，但在表单中可选保留：

| 字段名模式 | 说明 |
|---|---|
| `id` | 主键 |
| `created_at` / `createdAt` | 创建时间 |
| `updated_at` / `updatedAt` | 更新时间 |
| `created_by_id` / `createdById` | 创建人 |
| `updated_by_id` / `updatedById` | 更新人 |
| `*_id`（结尾） | 外键字段，在表格中隐藏，关联字段用 AssociationField 展示 |

## 字段中文标题推断

从字段元数据推断列标题的优先级：

1. `field.uiSchema.title`（如果有）
2. `field.uiSchema.title` 的翻译
3. 从字段名自动推断：
   - `name` → "名称"
   - `title` → "标题"
   - `description` → "描述"
   - `status` → "状态"
   - `sort` → "排序"
   - `price` → "价格"
   - `quantity` / `count` → "数量"
   - `phone` / `mobile` → "手机号"
   - `email` → "邮箱"
   - `remark` / `note` → "备注"
   - `icon` → "图标"
   - `type` → "类型"
   - `total` / `amount` → "金额"
   - 其他 → 首字母大写或保持原样

## 列定义模板

每个列遵循此结构：

```json
{
  "name": "<字段名>",
  "x-uid": "<唯一ID>",
  "x-component": "TableV2.Column",
  "x-component-props": {
    "title": "<中文标题>"
  },
  "properties": {
    "<字段名>": {
      "x-uid": "<唯一ID>",
      "x-component": "<映射的组件>",
      "x-decorator": "FormItem",
      "x-decorator-props": {
        "collectionField": "<表名>.<字段名>"
      },
      "x-read-pretty": true
    }
  }
}
```

### 可排序列（数字/日期字段）

数字和日期类型的列必须在 `x-component-props` 中添加 `"sorter": true`：

```json
{
  "name": "<字段名>",
  "x-uid": "<唯一ID>",
  "x-component": "TableV2.Column",
  "x-component-props": {
    "title": "<中文标题>",
    "sorter": true
  },
  "properties": { ... }
}
```

**需要排序的字段 interface：** `number`, `integer`, `float`, `datePicker`, `timePicker`, `percent`

## 表单字段模板

```json
{
  "name": "<字段名>",
  "x-uid": "<唯一ID>",
  "x-component": "<映射的组件>",
  "x-decorator": "FormItem",
  "x-decorator-props": {
    "collectionField": "<表名>.<字段名>"
  },
  "x-component-props": {}
}
```
