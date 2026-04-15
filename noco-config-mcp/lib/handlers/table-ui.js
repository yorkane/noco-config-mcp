import { api, uid, createAndAttach, saveStepParams } from '../api.js';
import { isSystemField, getDisplayModel, SORTABLE_INTERFACES, isAssociationField, HAS_MANY_INTERFACES, BELONGS_TO_INTERFACES, M2M_INTERFACES, getFormFieldModel, FORM_SKIP_INTERFACES } from '../constants.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'create': return createUI(args);
    case 'delete': return deleteUI(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

/**
 * create — one-click table management UI using v2 flow engine.
 * Structure: BlockGrid → TableBlock (with columns, actions, action column)
 */

async function createFormStructure(parentActionUid, collectionName, fields, formType) {
  const isCreate = formType === 'CreateFormModel';
  const childPageUid = uid();
  await createAndAttach(childPageUid, 'ChildPageModel', parentActionUid, 'page', 'object', 0,
    { pageSettings: { general: { displayTitle: false, enableTabs: true } } });

  const tabUid = uid();
  const tabTitle = isCreate ? '{{t("Add new")}}' : '{{t("Edit")}}';
  await createAndAttach(tabUid, 'ChildPageTabModel', childPageUid, 'tabs', 'object', 0,
    { pageTabSettings: { tab: { title: tabTitle } } });

  const blockGridUid = uid();
  await createAndAttach(blockGridUid, 'BlockGridModel', tabUid, 'grid', 'object', 0);

  const formModelUid = uid();
  const resourceInit = { dataSourceKey: 'main', collectionName };
  if (!isCreate) resourceInit.filterByTk = '{{ctx.view.inputArgs.filterByTk}}';
  await createAndAttach(formModelUid, formType, blockGridUid, 'items', 'array', 0,
    { resourceSettings: { init: resourceInit } });

  const blockRowName = uid();
  await saveStepParams(blockGridUid, {
    gridSettings: { grid: { rows: { [blockRowName]: [[formModelUid]] }, sizes: { [blockRowName]: [24] }, rowOrder: [blockRowName] } },
  });

  await createAndAttach(uid(), 'FormSubmitActionModel', formModelUid, 'actions', 'array', 0);

  const formGridUid = uid();
  await createAndAttach(formGridUid, 'FormGridModel', formModelUid, 'grid', 'object', 0);

  const formFields = fields.filter(f =>
    !isSystemField(f.name) && !FORM_SKIP_INTERFACES.has(f.interface) && !HAS_MANY_INTERFACES.has(f.interface)
  );

  const gridRows = {};
  const gridSizes = {};
  const gridRowOrder = [];
  let itemIdx = 0;

  for (const f of formFields) {
    const formItemUid = uid();
    const fieldModelName = getFormFieldModel(f);
    await createAndAttach(formItemUid, 'FormItemModel', formGridUid, 'items', 'array', itemIdx,
      { fieldSettings: { init: { dataSourceKey: 'main', collectionName, fieldPath: f.name } } });

    const fieldUid = uid();
    await createAndAttach(fieldUid, fieldModelName, formItemUid, 'field', 'object', 0);

    const isAssocSelect = BELONGS_TO_INTERFACES.has(f.interface) || M2M_INTERFACES.has(f.interface);
    if (isAssocSelect && f.target) {
      const displayUid = uid();
      await createAndAttach(displayUid, 'DisplayTextFieldModel', fieldUid, 'field', 'object', 0, {
        fieldSettings: { init: { dataSourceKey: 'main', collectionName: f.target, fieldPath: 'name' } },
        popupSettings: { openView: { collectionName: f.target, associationName: `${collectionName}.${f.name}`, dataSourceKey: 'main' } },
      });
    }

    const rowName = uid();
    gridRows[rowName] = [[formItemUid]];
    gridSizes[rowName] = [24];
    gridRowOrder.push(rowName);
    itemIdx++;
  }

  await saveStepParams(formGridUid, {
    gridSettings: { grid: { rows: gridRows, sizes: gridSizes, rowOrder: gridRowOrder } },
  });

  return formModelUid;
}

async function createUI(args) {
  const { collection_name, group_title, page_title } = args;

  // Step 1: Get collection info
  const colRes = await api('/collections:get', { query: `filterByTk=${collection_name}&appends=fields` });
  if (colRes.error) return { content: [{ type: 'text', text: `Error: Collection "${collection_name}" not found. ${JSON.stringify(colRes.data)}` }], isError: true };
  const colData = colRes.data;
  const fields = colData.fields || [];
  const userFields = fields.filter(f => !isSystemField(f.name));
  const pageTitle = page_title || colData.title || collection_name;

  // Step 2: Find or create group
  const routesRes = await api('/desktopRoutes:listAccessible', { query: 'tree=true' });
  if (routesRes.error) return { content: [{ type: 'text', text: `Error: Cannot list routes. ${JSON.stringify(routesRes.data)}` }], isError: true };
  let groupId;
  const groupTitle = group_title || '数据管理';
  for (const g of (routesRes.data || [])) {
    if (g.type === 'group' && g.title === groupTitle) { groupId = g.id; break; }
  }
  if (!groupId) {
    const gRes = await api('/desktopRoutes:create', { method: 'POST', body: { title: groupTitle, type: 'group', sort: 100 } });
    if (gRes.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(gRes.data)}` }], isError: true };
    groupId = gRes.data?.id;
  }

  // Step 3: Create route + tab + FlowRoute schema
  const tabSchemaUid = uid();
  const routeRes = await api('/desktopRoutes:create', {
    method: 'POST',
    body: {
      title: pageTitle, type: 'flowPage', parentId: groupId, sort: 100,
      children: [{ type: 'tabs', schemaUid: tabSchemaUid, tabSchemaName: pageTitle, hidden: true }],
    },
  });
  if (routeRes.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(routeRes.data)}` }], isError: true };
  const routeId = routeRes.data?.id;
  const log = [`Route: ID=${routeId}, tab=${tabSchemaUid}`];

  const routeSchemaUid = uid();
  await api('/uiSchemas:create', { method: 'POST', body: { type: 'void', 'x-component': 'FlowRoute', name: uid(), 'x-uid': routeSchemaUid, 'x-async': false } });
  await api('/desktopRoutes:update', { method: 'POST', query: `filterByTk=${routeId}`, body: { schemaUid: routeSchemaUid } });

  // Step 4: Wait for auto-created BlockGridModel
  let gridModelUid;
  for (let i = 0; i < 5; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const g = await api('/flowModels:findOne', { query: `parentId=${tabSchemaUid}&subKey=grid` });
    if (g.data?.uid) { gridModelUid = g.data.uid; break; }
  }
  if (!gridModelUid) {
    gridModelUid = uid();
    await createAndAttach(gridModelUid, 'BlockGridModel', tabSchemaUid, 'grid', 'object', 0, {});
    log.push('Grid created manually');
  }

  // ══════════════════════════════════════════════════════════════════
  // ── TableBlockModel ─────────────────────────────────────────────
  // ══════════════════════════════════════════════════════════════════
  const tableModelUid = uid();
  const tableStepParams = {
    resourceSettings: { init: { dataSourceKey: 'main', collectionName: collection_name } },
  };
  const tableRes = await createAndAttach(tableModelUid, 'TableBlockModel', gridModelUid, 'items', 'array', 0, tableStepParams);
  if (tableRes.error) {
    log.push(`ERROR TableBlockModel: ${JSON.stringify(tableRes.data)}`);
    return { content: [{ type: 'text', text: log.join('\n') }], isError: true };
  }
  log.push(`TableBlock: ${tableModelUid}`);

  // Save gridSettings with single row for table
  const tableRowName = uid();
  await saveStepParams(gridModelUid, {
    gridSettings: {
      grid: {
        rows: { [tableRowName]: [[tableModelUid]] },
        sizes: { [tableRowName]: [24] },
        rowOrder: [tableRowName],
      },
    },
  });

  // ── Actions directly under TableBlock (subKey=actions) ──
  await createAndAttach(uid(), 'FilterActionModel', tableModelUid, 'actions', 'array', 0);
  const addNewUid = uid();
  await createAndAttach(addNewUid, 'AddNewActionModel', tableModelUid, 'actions', 'array', 1,
    { popupSettings: { openView: { collectionName: collection_name, dataSourceKey: 'main' } } });
  await createFormStructure(addNewUid, collection_name, userFields, 'CreateFormModel');
  await createAndAttach(uid(), 'RefreshActionModel', tableModelUid, 'actions', 'array', 2);
  await createAndAttach(uid(), 'BulkDeleteActionModel', tableModelUid, 'actions', 'array', 3);
  log.push('Actions: filter, add-new(with form), refresh, bulk-delete');

  // ── Table columns (数字字段默认可排序) ──
  let colIdx = 0;
  const colErrors = [];
  for (const f of userFields) {
    const colModelUid = uid();
    const displayModel = getDisplayModel(f);
    const colStepParams = {
      fieldSettings: { init: { dataSourceKey: 'main', collectionName: collection_name, fieldPath: f.name } },
      tableColumnSettings: { model: { use: displayModel } },
    };
    // 数字类型字段默认可排序
    if (SORTABLE_INTERFACES.has(f.interface)) {
      colStepParams.tableColumnSettings.sortable = true;
      colStepParams.tableColumnSettings.sorter = { sorter: true };
    }
    const colRes2 = await createAndAttach(colModelUid, 'TableColumnModel', tableModelUid, 'columns', 'array', colIdx, colStepParams);
    if (colRes2.error) {
      colErrors.push(`${f.name}: ${JSON.stringify(colRes2.data)}`);
    } else {
      const displayUid = uid();
      let displayStepParams;
      if (isAssociationField(f) && f.target) {
        // 关联字段的 field 子项只需 popupSettings（避免循环引用）
        displayStepParams = {
          popupSettings: {
            openView: {
              collectionName: f.target,
              associationName: `${collection_name}.${f.name}`,
              dataSourceKey: 'main',
            },
          },
        };
      } else {
        // 非关联字段的 field 子项需要完整配置
        displayStepParams = {
          popupSettings: { openView: { collectionName: collection_name, dataSourceKey: 'main' } },
          fieldBinding: { use: displayModel },
          fieldSettings: { init: { dataSourceKey: 'main', collectionName: collection_name, fieldPath: f.name } },
        };
      }
      await createAndAttach(displayUid, displayModel, colModelUid, 'field', 'object', 0, displayStepParams);
    }
    colIdx++;
  }
  log.push(`Columns: ${colIdx} created${colErrors.length ? `, ${colErrors.length} failed` : ''}`);

  // ── Action column (编辑) ──
  const actColUid = uid();
  const actColRes = await createAndAttach(actColUid, 'TableActionsColumnModel', tableModelUid, 'columns', 'array', colIdx);
  if (!actColRes.error) {
    const editActionUid = uid();
    await createAndAttach(editActionUid, 'EditActionModel', actColUid, 'actions', 'array', 0,
      { popupSettings: { openView: { collectionName: collection_name, dataSourceKey: 'main' } }, buttonSettings: { general: { type: 'link', icon: null } } });
    await createFormStructure(editActionUid, collection_name, userFields, 'EditFormModel');
    log.push('Action column: edit(link) with form');
  }

  return {
    content: [{
      type: 'text',
      text: `Table UI created (v2 flow engine)!\n${log.join('\n')}\n\n- Collection: ${collection_name}\n- Group: ${groupTitle} (ID: ${groupId})\n- Page: ${pageTitle}\n- Route ID: ${routeId}\n- Columns: ${colIdx}${colErrors.length ? `, ${colErrors.length} failed` : ''}`,
    }],
  };
}

/**
 * delete — one-click delete UI page for a collection.
 */
async function deleteUI(args) {
  const { collection_name } = args;

  const routesRes = await api('/desktopRoutes:listAccessible', { query: 'tree=true' });
  if (routesRes.error) return { content: [{ type: 'text', text: `Error: Cannot list routes. ${JSON.stringify(routesRes.data)}` }], isError: true };

  let targetRoute = null;
  const colRes2 = await api('/collections:get', { query: `filterByTk=${collection_name}` });
  const colTitle = colRes2.data?.title || '';

  for (const group of (routesRes.data || [])) {
    for (const child of (group.children || [])) {
      const pageTitle = (child.title || '').toLowerCase();
      const cName = collection_name.toLowerCase();
      const cTitle = colTitle.toLowerCase();
      if (pageTitle.includes(cName) || pageTitle.includes(cTitle) ||
          (cTitle && pageTitle.includes(cTitle))) {
        targetRoute = child;
        break;
      }
    }
    if (targetRoute) break;
  }

  if (!targetRoute) {
    return { content: [{ type: 'text', text: `No page route found matching collection "${collection_name}".` }], isError: true };
  }

  const routeDelRes = await api('/desktopRoutes:destroy', { method: 'POST', query: `filterByTk=${targetRoute.id}` });
  if (routeDelRes.error) {
    return { content: [{ type: 'text', text: `Error: Failed to delete route. ${JSON.stringify(routeDelRes.data)}` }], isError: true };
  }

  if (targetRoute.schemaUid) {
    await api('/uiSchemas:destroy', { method: 'POST', query: `filterByTk=${targetRoute.schemaUid}` });
  }

  return {
    content: [{
      type: 'text',
      text: `Table UI deleted!\n- Collection: ${collection_name}\n- Route ID: ${targetRoute.id} (deleted)`,
    }],
  };
}
