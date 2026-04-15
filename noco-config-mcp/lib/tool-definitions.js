// ─── Tool definitions (OpenAPI-style: resource + action) ──────────
export const TOOLS = [
  {
    name: 'collections',
    description: 'NocoBase collections (data tables) management. Actions: list — list all collections (optional filter_system, page, pageSize); get — get collection detail by name; create — create collection with optional fields; update — update collection title etc; delete — delete collection by name.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'get', 'create', 'update', 'delete'],
          description: 'Operation to perform',
        },
        // ── list params
        filter_system: { type: 'boolean', default: true, description: '[list] Filter out system tables' },
        page: { type: 'number', default: 1, description: '[list] Page number' },
        pageSize: { type: 'number', default: 200, description: '[list] Page size' },
        // ── get/delete params
        name: { type: 'string', description: '[get/delete] Collection name' },
        // ── create params
        title: { type: 'string', description: '[create] Display title' },
        fields: {
          type: 'array',
          description: '[create] Field definitions. Each field needs: name, interface (e.g. input, number, select, datePicker, m2o), and optionally title, type, target, foreignKey.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              interface: { type: 'string', description: 'Field interface: input, textarea, number, integer, select, datePicker, checkbox, m2o, o2m, m2m, etc.' },
              type: { type: 'string' },
              title: { type: 'string' },
              uiSchema: { type: 'object' },
              target: { type: 'string', description: 'Target collection for relation fields' },
              foreignKey: { type: 'string' },
            },
            required: ['name', 'interface'],
          },
        },
        // ── update params
        filterByTk: { type: 'string', description: '[update] Collection name to update' },
      },
      required: ['action'],
    },
  },
  {
    name: 'fields',
    description: 'NocoBase collection fields management. Actions: list — list fields of a collection; create — add a field; update — update a field; delete — remove a field.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create', 'update', 'delete'],
          description: 'Operation to perform',
        },
        collection: { type: 'string', description: 'Collection name (required for all actions)' },
        // ── create params
        field: {
          type: 'object',
          description: '[create/update] Field definition',
          properties: {
            name: { type: 'string' },
            interface: { type: 'string', description: 'Field interface: input, textarea, number, integer, select, datePicker, checkbox, m2o, o2m, m2m, etc.' },
            type: { type: 'string' },
            title: { type: 'string' },
            uiSchema: { type: 'object' },
            target: { type: 'string' },
            foreignKey: { type: 'string' },
          },
          required: ['name', 'interface'],
        },
        // ── update/delete params
        filterByTk: { type: 'string', description: '[update/delete] Field name to update or delete' },
      },
      required: ['action', 'collection'],
    },
  },
  {
    name: 'records',
    description: 'NocoBase collection records CRUD. Actions: list — query records with filtering/sorting/pagination; create — create one record; update — update a record by ID; delete — delete a record by ID; batch_create — create multiple records.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create', 'update', 'delete', 'batch_create'],
          description: 'Operation to perform',
        },
        collection: { type: 'string', description: 'Collection name (required for all actions)' },
        // ── list params
        page: { type: 'number', default: 1, description: '[list] Page number' },
        pageSize: { type: 'number', default: 20, description: '[list] Page size' },
        filter: { type: 'object', description: '[list] NocoBase filter conditions' },
        sort: { type: 'array', items: { type: 'string' }, description: '[list] Sort fields, prefix - for descending' },
        appends: { type: 'array', items: { type: 'string' }, description: '[list] Relation fields to append' },
        // ── create/update params
        record: { type: 'object', description: '[create/update] Record data (field name → value)' },
        // ── update/delete params
        filterByTk: { type: 'number', description: '[update/delete] Record ID' },
        // ── batch_create params
        records: { type: 'array', items: { type: 'object' }, description: '[batch_create] Array of record objects' },
      },
      required: ['action', 'collection'],
    },
  },
  {
    name: 'routes',
    description: 'NocoBase desktop menu routes management. Actions: list — list menu tree; create_group — create a menu group; create_page — create a page route (v2 flow engine); delete — delete a route by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create_group', 'create_page', 'delete'],
          description: 'Operation to perform',
        },
        // ── create_group/create_page params
        title: { type: 'string', description: '[create_group/create_page] Display title' },
        sort: { type: 'number', default: 100, description: '[create_group/create_page] Sort order' },
        // ── create_page params
        parentId: { type: 'number', description: '[create_page] Parent group route ID' },
        schemaUid: { type: 'string', description: '[create_page] UI Schema root UID (legacy)' },
        children: {
          type: 'array',
          description: '[create_page] Tab definitions for flowPage. Example: [{type:"tabs", schemaUid:"uid1", tabSchemaName:"Tab1", hidden:true}]',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              schemaUid: { type: 'string' },
              tabSchemaName: { type: 'string' },
              hidden: { type: 'boolean' },
            },
          },
        },
        // ── delete params
        id: { type: 'number', description: '[delete] Route ID to delete' },
      },
      required: ['action'],
    },
  },
  {
    name: 'schemas',
    description: 'NocoBase UI Schema management. Actions: create — insert a UI schema node; get — read schema tree by UID; update — patch-update a schema node; delete — remove a schema node.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'get', 'update', 'delete'],
          description: 'Operation to perform',
        },
        uid: { type: 'string', description: 'Schema node x-uid (required for get/update/delete; optional parent UID for create)' },
        // ── create params
        schema: { type: 'object', description: '[create] Full UI Schema JSON object. Must include x-uid and x-component.' },
        position: { type: 'string', enum: ['beforeEnd', 'afterBegin', 'beforeBegin', 'afterEnd'], default: 'beforeEnd', description: '[create] Insert position' },
        // ── update params
        patch: { type: 'object', description: '[update] Properties to update on the schema node' },
      },
      required: ['action'],
    },
  },
  {
    name: 'flow_models',
    description: 'NocoBase v2 flow engine models management. Actions: create — create a flow model; attach — attach existing model to parent; find — find model by UID or parent+subKey; list — list child models; save — update model properties; destroy — delete a model. Common model classes: BlockGridModel, TableBlockModel, TableColumnModel, TableActionsColumnModel, FilterFormBlockModel, FilterFormGridModel, FilterFormItemModel, FilterActionModel, FormBlockModel, CreateFormModel, EditFormModel, DetailsBlockModel, ActionGroupModel, AddNewActionModel, EditActionModel, ViewActionModel, DeleteActionModel, BulkDeleteActionModel, RefreshActionModel, FormItemModel, FormActionModel, FormSubmitActionModel, FilterFormSubmitActionModel, FilterFormResetActionModel, FilterFormCollapseActionModel, GridCardBlockModel, ListBlockModel, MarkdownBlockModel, IframeBlockModel, ChartBlockModel.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'attach', 'find', 'list', 'save', 'destroy'],
          description: 'Operation to perform',
        },
        uid: { type: 'string', description: 'Flow model UID' },
        use: { type: 'string', description: '[create] Registered model class name (e.g. BlockGridModel, TableBlockModel)' },
        props: { type: 'object', description: '[create/save] Model properties' },
        parentId: { type: 'string', description: '[create/attach/find/list] Parent model UID' },
        subKey: { type: 'string', description: '[create/attach/find/list] Sub-model key (e.g. grid, blocks, columns, actions, items, field)' },
        subType: { type: 'string', enum: ['array', 'object'], description: '[create/attach] Sub-model relationship type' },
        sortIndex: { type: 'number', description: '[create] Sort order among siblings' },
      },
      required: ['action'],
    },
  },
  {
    name: 'table_ui',
    description: 'One-click table management UI operations using v2 flow engine. Actions: create — auto-disovers fields, creates menu group/page/route, BlockGridModel + TableBlockModel with columns, filter form and action buttons; delete — removes the UI page (route + schemas) for a collection.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'delete'],
          description: 'Operation to perform',
        },
        collection_name: { type: 'string', description: 'Collection name' },
        group_title: { type: 'string', description: '[create] Menu group title (default "数据管理")' },
        page_title: { type: 'string', description: '[create] Page title (default derived from collection)' },
      },
      required: ['action', 'collection_name'],
    },
  },
];
