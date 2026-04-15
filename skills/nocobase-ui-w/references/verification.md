# 验证规则

本文件定义写操作后的验证方法和验收标准。

## 检查模式

- `inspect` 只读，不调用任何写 API
- 检查菜单结构用 `GET /api/desktopRoutes:listAccessible?tree=true`
- 检查页面内容用 `GET /api/uiSchemas:getJsonSchema/<schemaUid>`
- 检查数据表结构用 `GET /api/collections:list?pageSize=200`
- 输出聚焦于当前结构，不混入"写入成功"等措辞

## 验收级别

| 级别 | 含义 |
|---|---|
| **结构确认** | 菜单树/schema 回读确认结构存在、位置正确 |
| **语义确认** | 字段绑定、collection 引用、组件选择都正确 |
| **部分/未验证** | 写入返回成功但回读不足以确认意图，必须声明验证不完整 |

## 写后回读

### 每种操作的最小回读

| 操作 | 最小回读 |
|---|---|
| 创建分组 | 菜单树确认位置 |
| 创建页面（schema + route） | getJsonSchema + 菜单树 |
| 添加区块 | 父页面的 getJsonSchema |
| 更新节点 | 受影响区域的 getJsonSchema |
| 删除页面 | 菜单树确认移除 |

### 回读重点

- **菜单树**：分组 id、页面 schemaUid、标题、父子关系正确
- **页面 Schema**：Grid → Row → Col → Block 层级完整，所有 `x-uid` 存在且唯一
- **表格区块**：`collection` 正确绑定、列引用有效字段、操作按钮存在
- **关联字段**：`belongsTo` 字段引用了正确的外键 collection

## 批量验证

为 N 个页面建完后，执行：

```bash
TOKEN=$(...)

echo "=== 菜单树 ==="
curl -s "http://192.168.1.28:13000/api/desktopRoutes:listAccessible?tree=true" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
for group in data:
    print(f'分组: {group[\"title\"]}')
    for page in group.get('children', []):
        print(f'  页面: {page[\"title\"]} (schemaUid={page.get(\"schemaUid\",\"N/A\")})')
"

echo ""
echo "=== 逐页 Schema 验证 ==="
# 对每个 schemaUid 执行 getJsonSchema 并检查关键节点
for uid in <所有页面的schemaUid>; do
  echo "--- $uid ---"
  curl -s "http://192.168.1.28:13000/api/uiSchemas:getJsonSchema/$uid" \
    -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# 检查是否有 TableBlockProvider
schema_str = json.dumps(d)
if 'TableBlockProvider' in schema_str:
    print('✓ 包含表格区块')
else:
    print('✗ 缺少表格区块')
if 'TableV2' in schema_str:
    print('✓ 包含表格组件')
else:
    print('✗ 缺少表格组件')
"
done
```

## 数据验证

创建 UI 后验证数据可正常流通：

```bash
# 对每个 collection 测试 list API
curl -s "http://192.168.1.28:13000/api/<collection_name>:list?pageSize=5" \
  -H "Authorization: Bearer $TOKEN"
```

如果返回错误，说明 collection 或关联配置有问题。

## 常见失败模式

| 现象 | 原因 | 修复 |
|---|---|---|
| 页面空白 | schemaUid 与 route 不匹配 | 检查 route 的 schemaUid |
| 表格显示"暂无数据"但数据存在 | collection 名字拼写错误 | 确认 collection 名称 |
| 列显示原始 id 而非名称 | 缺少关联 append | 检查 AssociationField 配置 |
| 页面不在菜单中 | route 未创建或 parentId 错误 | 检查菜单树 |
| "uid already exists" | x-uid 重复 | 生成新的唯一 uid |
| 表格无法提交 | collection/resource 绑定缺失 | 检查 decorator-props |
