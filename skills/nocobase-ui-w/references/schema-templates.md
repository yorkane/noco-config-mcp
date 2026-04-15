# 通用 Schema 模板

本文件提供通用的 JSON Schema 模板，用于为任意数据表创建标准化的列表页面。
所有占位符格式为 `<描述>`，使用时替换为实际值。

## 目录

1. [页面骨架模板（含筛选行）](#1-页面骨架模板含筛选行)
2. [筛选表单区块模板](#2-筛选表单区块模板)
3. [表格区块模板](#3-表格区块模板)
4. [列定义模板（含排序）](#4-列定义模板含排序)
5. [操作按钮模板](#5-操作按钮模板)
6. [完整页面示例](#6-完整页面示例)
7. [UID 生成规则](#7-uid-生成规则)

---

## 1. 页面骨架模板（含筛选行）

每个新页面包含两行 Grid：第一行放筛选表单，第二行放数据表格。

```json
{
  "name": "root",
  "x-uid": "<PAGE_ROOT_UID>",
  "x-component": "Page",
  "properties": {
    "grid": {
      "type": "void",
      "x-component": "Grid",
      "x-uid": "<GRID_UID>",
      "properties": {
        "row_filter": {
          "type": "void",
          "x-component": "Grid.Row",
          "x-uid": "<FILTER_ROW_UID>",
          "properties": {
            "col_filter": {
              "type": "void",
              "x-component": "Grid.Col",
              "x-uid": "<FILTER_COL_UID>",
              "properties": {}
            }
          }
        },
        "row_table": {
          "type": "void",
          "x-component": "Grid.Row",
          "x-uid": "<TABLE_ROW_UID>",
          "properties": {
            "col_table": {
              "type": "void",
              "x-component": "Grid.Col",
              "x-uid": "<TABLE_COL_UID>",
              "properties": {}
            }
          }
        }
      }
    }
  }
}
```

**结构说明：**
- `row_filter` → `col_filter`：放置筛选表单区块（FilterFormBlockProvider）
- `row_table` → `col_table`：放置数据表格区块（TableBlockProvider）

---

## 2. 筛选表单区块模板

筛选表单通过 `FilterFormBlockProvider` 实现，绑定到同一个 collection，通过 `x-filter-targets` 连接到数据表格区块。

**插入位置：** `position: "beforeEnd"`，`uid` 为页面骨架中 `col_filter` 的 uid。

```json
{
  "name": "filter-form-block",
  "x-uid": "<FILTER_BLOCK_UID>",
  "x-component": "FilterFormBlockProvider",
  "x-decorator": "BlockItem",
  "x-decorator-props": {
    "collection": "<COLLECTION_NAME>"
  },
  "x-filter-targets": [
    {
      "uid": "<TABLE_BLOCK_UID>"
    }
  ],
  "properties": {
    "filter-form": {
      "type": "void",
      "x-uid": "<FILTER_FORM_UID>",
      "x-component": "FormV2",
      "properties": {
        "grid": {
          "type": "void",
          "x-component": "Grid",
          "x-uid": "<FILTER_GRID_UID>",
          "properties": {
            "row1": {
              "type": "void",
              "x-component": "Grid.Row",
              "x-uid": "<FILTER_FROW_UID>",
              "properties": {
                "col1": {
                  "type": "void",
                  "x-component": "Grid.Col",
                  "x-uid": "<FILTER_FCOL_UID>",
                  "properties": {}
                }
              }
            }
          }
        },
        "actions": {
          "type": "void",
          "x-component": "ActionBar",
          "x-uid": "<FILTER_ACTIONS_UID>",
          "properties": {
            "filter-submit": {
              "type": "void",
              "x-uid": "<FILTER_SUBMIT_UID>",
              "x-component": "Action",
              "x-component-props": {
                "type": "primary",
                "useAction": "{{ cm.useFilterAction }}"
              },
              "title": "筛选"
            },
            "filter-reset": {
              "type": "void",
              "x-uid": "<FILTER_RESET_UID>",
              "x-component": "Action",
              "x-component-props": {
                "useAction": "{{ cm.useResetAction }}"
              },
              "title": "重置"
            }
          }
        }
      }
    }
  }
}
```

### 筛选字段模板

筛选字段插入到筛选表单的 Grid.Col 中。通常选择字符串和选择类型字段作为筛选条件：

**文本筛选字段：**
```json
{
  "name": "<字段名>",
  "x-uid": "<FILTER_FIELD_UID>",
  "x-component": "Input",
  "x-decorator": "FormItem",
  "x-decorator-props": {
    "collectionField": "<COLLECTION_NAME>.<字段名>"
  },
  "x-component-props": {
    "placeholder": "请输入<中文标题>"
  }
}
```

**下拉选择筛选字段：**
```json
{
  "name": "<字段名>",
  "x-uid": "<FILTER_FIELD_UID>",
  "x-component": "Select",
  "x-decorator": "FormItem",
  "x-decorator-props": {
    "collectionField": "<COLLECTION_NAME>.<字段名>"
  },
  "x-component-props": {
    "placeholder": "请选择<中文标题>"
  }
}
```

**日期范围筛选字段：**
```json
{
  "name": "<字段名>",
  "x-uid": "<FILTER_FIELD_UID>",
  "x-component": "DatePicker",
  "x-decorator": "FormItem",
  "x-decorator-props": {
    "collectionField": "<COLLECTION_NAME>.<字段名>"
  },
  "x-component-props": {}
}
```

### 筛选字段选择规则

| 字段 interface | 是否作为筛选字段 | 筛选组件 |
|---|---|---|
| `input` / `textarea` | 是 | `Input`（模糊匹配） |
| `select` | 是 | `Select`（精确匹配） |
| `number` / `integer` | 否（通过表格列排序） | — |
| `datePicker` | 可选 | `DatePicker` |
| `checkbox` | 否 | — |
| `m2o` / `belongsTo` | 是 | `AssociationField`（mode: Select） |

---

## 3. 表格区块模板

标准的数据表格区块，绑定到指定 collection：

```json
{
  "name": "table-block",
  "x-uid": "<TABLE_BLOCK_UID>",
  "x-component": "TableBlockProvider",
  "x-decorator": "BlockItem",
  "x-decorator-props": {
    "collection": "<COLLECTION_NAME>",
    "resource": "<COLLECTION_NAME>",
    "action": "list",
    "params": {
      "pageSize": 20
    }
  },
  "properties": {
    "actions": {
      "type": "void",
      "x-component": "ActionBar",
      "x-uid": "<ACTION_BAR_UID>",
      "properties": {
        "add": {
          "type": "void",
          "x-uid": "<ADD_BTN_UID>",
          "x-component": "Action",
          "x-component-props": {
            "openMode": "drawer",
            "component": "CreateRecordAction"
          },
          "title": "添加"
        },
        "delete": {
          "type": "void",
          "x-uid": "<DELETE_BTN_UID>",
          "x-component": "Action",
          "x-component-props": {
            "component": "DeleteAction"
          },
          "title": "删除"
        }
      }
    },
    "table": {
      "type": "array",
      "x-uid": "<TABLE_UID>",
      "x-component": "TableV2",
      "x-component-props": {
        "rowKey": "id",
        "rowSelection": { "type": "checkbox" }
      },
      "properties": {
        "action-column": {
          "type": "void",
          "x-uid": "<ACTION_COL_UID>",
          "x-component": "TableV2.Column",
          "x-component-props": {
            "title": "操作",
            "fixed": "right"
          },
          "properties": {
            "view": {
              "type": "void",
              "x-uid": "<VIEW_BTN_UID>",
              "x-component": "Action",
              "x-component-props": {
                "openMode": "drawer"
              },
              "title": "查看"
            },
            "edit": {
              "type": "void",
              "x-uid": "<EDIT_BTN_UID>",
              "x-component": "Action",
              "x-component-props": {
                "openMode": "drawer",
                "component": "UpdateAction"
              },
              "title": "编辑"
            },
            "delete-row": {
              "type": "void",
              "x-uid": "<DEL_ROW_UID>",
              "x-component": "Action",
              "x-component-props": {
                "component": "DeleteAction"
              },
              "title": "删除"
            }
          }
        }
      }
    }
  }
}
```

**插入位置：** `position: "beforeEnd"`，`uid` 为页面骨架中 Grid.Col 的 uid。

---

## 4. 列定义模板（含排序）

每个字段一列，插入到表格的 `table` properties 中（与 `action-column` 平级）：

### 普通文本列

```json
{
  "name": "<字段名>",
  "x-uid": "<COL_FIELD_UID>",
  "x-component": "TableV2.Column",
  "x-component-props": {
    "title": "<中文标题>"
  },
  "properties": {
    "<字段名>": {
      "x-uid": "<FIELD_UID>",
      "x-component": "<UI组件>",
      "x-decorator": "FormItem",
      "x-decorator-props": {
        "collectionField": "<COLLECTION_NAME>.<字段名>"
      },
      "x-read-pretty": true
    }
  }
}
```

### 可排序列（数字 / 日期类型）

数字类型（integer, number, float）和日期类型（datePicker）的列**必须启用排序**，
在 `x-component-props` 中添加 `"sorter": true`：

```json
{
  "name": "<字段名>",
  "x-uid": "<COL_FIELD_UID>",
  "x-component": "TableV2.Column",
  "x-component-props": {
    "title": "<中文标题>",
    "sorter": true
  },
  "properties": {
    "<字段名>": {
      "x-uid": "<FIELD_UID>",
      "x-component": "<UI组件>",
      "x-decorator": "FormItem",
      "x-decorator-props": {
        "collectionField": "<COLLECTION_NAME>.<字段名>"
      },
      "x-read-pretty": true
    }
  }
}
```

### 排序字段规则

| 字段 interface | 是否启用排序 | 说明 |
|---|---|---|
| `number` / `integer` / `float` | **是** `sorter: true` | 价格、数量、金额等 |
| `datePicker` / `timePicker` | **是** `sorter: true` | 创建时间、日期等 |
| `input` / `textarea` / `select` | 否 | 文本排序无意义或由筛选实现 |
| `checkbox` | 否 | — |
| `m2o` / `belongsTo` | 否 | — |

### 关联字段列（belongsTo）

```json
{
  "name": "<关联字段名>",
  "x-uid": "<COL_ASSOC_UID>",
  "x-component": "TableV2.Column",
  "x-component-props": {
    "title": "<中文标题>"
  },
  "properties": {
    "<关联字段名>": {
      "x-uid": "<ASSOC_UID>",
      "x-component": "AssociationField",
      "x-decorator": "FormItem",
      "x-decorator-props": {
        "collectionField": "<COLLECTION_NAME>.<关联字段名>"
      },
      "x-component-props": {
        "mode": "Select"
      },
      "x-read-pretty": true
    }
  }
}
```

---

## 5. 操作按钮模板

### 添加按钮（顶部操作栏）

```json
{
  "type": "void",
  "x-uid": "<UID>",
  "x-component": "Action",
  "x-component-props": {
    "openMode": "drawer",
    "component": "CreateRecordAction"
  },
  "title": "添加"
}
```

---

## 6. 完整页面示例

以下是为一个 `products` 表创建完整页面的示例，包含**筛选表单**和**可排序数字列**：

```json
{
  "name": "root",
  "x-uid": "<PAGE_ROOT_UID>",
  "x-component": "Page",
  "properties": {
    "grid": {
      "type": "void",
      "x-component": "Grid",
      "x-uid": "<GRID_UID>",
      "properties": {
        "row_filter": {
          "type": "void",
          "x-component": "Grid.Row",
          "x-uid": "<FILTER_ROW_UID>",
          "properties": {
            "col_filter": {
              "type": "void",
              "x-component": "Grid.Col",
              "x-uid": "<FILTER_COL_UID>",
              "properties": {
                "filter-form-block": {
                  "x-uid": "<FILTER_BLOCK_UID>",
                  "x-component": "FilterFormBlockProvider",
                  "x-decorator": "BlockItem",
                  "x-decorator-props": {
                    "collection": "products"
                  },
                  "x-filter-targets": [
                    { "uid": "<TABLE_BLOCK_UID>" }
                  ],
                  "properties": {
                    "filter-form": {
                      "type": "void",
                      "x-uid": "<FILTER_FORM_UID>",
                      "x-component": "FormV2",
                      "properties": {
                        "grid": {
                          "type": "void",
                          "x-component": "Grid",
                          "x-uid": "<FILTER_GRID_UID>",
                          "properties": {
                            "row1": {
                              "type": "void",
                              "x-component": "Grid.Row",
                              "x-uid": "<FILTER_FROW_UID>",
                              "properties": {
                                "col1": {
                                  "type": "void",
                                  "x-component": "Grid.Col",
                                  "x-uid": "<FILTER_FCOL_UID>",
                                  "properties": {
                                    "name": {
                                      "x-uid": "<FILTER_NAME_UID>",
                                      "x-component": "Input",
                                      "x-decorator": "FormItem",
                                      "x-decorator-props": { "collectionField": "products.name" },
                                      "x-component-props": { "placeholder": "请输入名称" }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        },
                        "actions": {
                          "type": "void",
                          "x-component": "ActionBar",
                          "x-uid": "<FILTER_ACTIONS_UID>",
                          "properties": {
                            "filter-submit": {
                              "type": "void",
                              "x-uid": "<FILTER_SUBMIT_UID>",
                              "x-component": "Action",
                              "x-component-props": { "type": "primary", "useAction": "{{ cm.useFilterAction }}" },
                              "title": "筛选"
                            },
                            "filter-reset": {
                              "type": "void",
                              "x-uid": "<FILTER_RESET_UID>",
                              "x-component": "Action",
                              "x-component-props": { "useAction": "{{ cm.useResetAction }}" },
                              "title": "重置"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "row_table": {
          "type": "void",
          "x-component": "Grid.Row",
          "x-uid": "<TABLE_ROW_UID>",
          "properties": {
            "col_table": {
              "type": "void",
              "x-component": "Grid.Col",
              "x-uid": "<TABLE_COL_UID>",
              "properties": {
                "table-block": {
                  "x-uid": "<TABLE_BLOCK_UID>",
                  "x-component": "TableBlockProvider",
                  "x-decorator": "BlockItem",
                  "x-decorator-props": {
                    "collection": "products",
                    "resource": "products",
                    "action": "list",
                    "params": { "pageSize": 20 }
                  },
                  "properties": {
                    "actions": {
                      "type": "void",
                      "x-component": "ActionBar",
                      "x-uid": "<ACTION_BAR_UID>",
                      "properties": {
                        "add": {
                          "type": "void",
                          "x-uid": "<ADD_BTN_UID>",
                          "x-component": "Action",
                          "x-component-props": { "openMode": "drawer", "component": "CreateRecordAction" },
                          "title": "添加"
                        },
                        "delete": {
                          "type": "void",
                          "x-uid": "<DELETE_BTN_UID>",
                          "x-component": "Action",
                          "x-component-props": { "component": "DeleteAction" },
                          "title": "删除"
                        }
                      }
                    },
                    "table": {
                      "type": "array",
                      "x-uid": "<TABLE_UID>",
                      "x-component": "TableV2",
                      "x-component-props": { "rowKey": "id", "rowSelection": { "type": "checkbox" } },
                      "properties": {
                        "col_name": {
                          "x-uid": "<COL_NAME_UID>",
                          "x-component": "TableV2.Column",
                          "x-component-props": { "title": "名称" },
                          "properties": {
                            "name": {
                              "x-uid": "<F_NAME_UID>",
                              "x-component": "Input",
                              "x-decorator": "FormItem",
                              "x-decorator-props": { "collectionField": "products.name" },
                              "x-read-pretty": true
                            }
                          }
                        },
                        "col_price": {
                          "x-uid": "<COL_PRICE_UID>",
                          "x-component": "TableV2.Column",
                          "x-component-props": { "title": "价格", "sorter": true },
                          "properties": {
                            "price": {
                              "x-uid": "<F_PRICE_UID>",
                              "x-component": "InputNumber",
                              "x-decorator": "FormItem",
                              "x-decorator-props": { "collectionField": "products.price" },
                              "x-read-pretty": true
                            }
                          }
                        },
                        "action-column": {
                          "type": "void",
                          "x-uid": "<ACTION_COL_UID>",
                          "x-component": "TableV2.Column",
                          "x-component-props": { "title": "操作", "fixed": "right" },
                          "properties": {
                            "view": {
                              "type": "void",
                              "x-uid": "<VIEW_UID>",
                              "x-component": "Action",
                              "x-component-props": { "openMode": "drawer" },
                              "title": "查看"
                            },
                            "edit": {
                              "type": "void",
                              "x-uid": "<EDIT_UID>",
                              "x-component": "Action",
                              "x-component-props": { "openMode": "drawer", "component": "UpdateAction" },
                              "title": "编辑"
                            },
                            "delete-row": {
                              "type": "void",
                              "x-uid": "<DEL_ROW_UID>",
                              "x-component": "Action",
                              "x-component-props": { "component": "DeleteAction" },
                              "title": "删除"
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
```

**示例要点：**
- 页面骨架有 2 行：`row_filter`（筛选表单）+ `row_table`（数据表格）
- 筛选表单通过 `x-filter-targets` 连接到表格区块（`<TABLE_BLOCK_UID>`）
- 数字列 `col_price` 带有 `"sorter": true`，在表头可点击排序
- 文本列 `col_name` 不带排序，通过上方筛选表单实现模糊搜索

---

## 7. UID 生成规则

每个 `x-uid` 必须全局唯一。

**推荐方法：**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(8))"
```

**规则：**
- 最少 6 个字符
- 仅限字母数字 + `-_`
- 绝不复用，即使是已删除的 schema
- 不使用连续或可预测的模式
