import { api } from '../api.js';
import { INTERFACE_TYPE_MAP } from '../constants.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'list': return list(args);
    case 'create': return create(args);
    case 'update': return update(args);
    case 'delete': return del(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function list(args) {
  const { collection } = args;
  const colRes = await api('/collections:get', { query: `filterByTk=${collection}&appends=fields` });
  if (colRes.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(colRes.data)}` }], isError: true };
  const fields = (colRes.data?.fields || []).map(f => ({
    name: f.name, interface: f.interface, type: f.type, title: f.uiSchema?.title || f.name,
  }));
  return { content: [{ type: 'text', text: JSON.stringify(fields, null, 2) }] };
}

async function create(args) {
  const { collection, field } = args;
  const fieldBody = { name: field.name, interface: field.interface };
  fieldBody.type = field.type || INTERFACE_TYPE_MAP[field.interface] || 'string';
  if (field.title) fieldBody.uiSchema = { title: field.title };
  if (field.target) fieldBody.target = field.target;
  if (field.foreignKey) fieldBody.foreignKey = field.foreignKey;
  if (field.uiSchema) fieldBody.uiSchema = { ...fieldBody.uiSchema, ...field.uiSchema };
  const res = await api(`/collections/${collection}/fields:create`, { method: 'POST', body: fieldBody });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Field "${field.name}" created in collection "${collection}".` }] };
}

async function update(args) {
  const { collection, filterByTk, field } = args;
  const res = await api(`/collections/${collection}/fields:update`, { method: 'POST', query: `filterByTk=${filterByTk}`, body: field });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Field "${filterByTk}" updated in collection "${collection}".` }] };
}

async function del(args) {
  const { collection, filterByTk } = args;
  const res = await api(`/collections/${collection}/fields:destroy`, { method: 'POST', query: `filterByTk=${filterByTk}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Field "${filterByTk}" deleted from collection "${collection}".` }] };
}
