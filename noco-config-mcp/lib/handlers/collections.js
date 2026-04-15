import { api } from '../api.js';
import { isSystemTable, INTERFACE_TYPE_MAP } from '../constants.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'list': return list(args);
    case 'get': return get(args);
    case 'create': return create(args);
    case 'update': return update(args);
    case 'delete': return del(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function list(args) {
  const { filter_system = true, page = 1, pageSize = 200 } = args;
  const res = await api('/collections:list', { query: `page=${page}&pageSize=${pageSize}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  let data = res.data || [];
  if (filter_system) data = data.filter(c => !isSystemTable(c.name));
  const summary = data.map(c => ({ name: c.name, title: c.title || c.name, fields: (c.fields || []).length }));
  return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
}

async function get(args) {
  const { name: colName } = args;
  const res = await api('/collections:get', { query: `filterByTk=${colName}&appends=fields` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function create(args) {
  const { name: colName, title: colTitle, fields = [] } = args;
  const body = { name: colName, title: colTitle || colName };
  if (fields.length > 0) {
    body.fields = fields.map(f => {
      const field = { name: f.name, interface: f.interface };
      field.type = f.type || INTERFACE_TYPE_MAP[f.interface] || 'string';
      if (f.title) field.uiSchema = { title: f.title };
      if (f.target) field.target = f.target;
      if (f.foreignKey) field.foreignKey = f.foreignKey;
      if (f.uiSchema) field.uiSchema = { ...field.uiSchema, ...f.uiSchema };
      return field;
    });
  }
  const res = await api('/collections:create', { method: 'POST', body });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Collection "${colName}" created successfully. ${fields.length} fields included.` }] };
}

async function update(args) {
  const { filterByTk, ...updateBody } = args;
  const res = await api('/collections:update', { method: 'POST', query: `filterByTk=${filterByTk}`, body: updateBody });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Collection "${filterByTk}" updated successfully.` }] };
}

async function del(args) {
  const { name: colName } = args;
  const res = await api('/collections:destroy', { method: 'POST', query: `filterByTk=${colName}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Collection "${colName}" deleted successfully.` }] };
}
