import { api } from '../api.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'create': return create(args);
    case 'get': return get(args);
    case 'update': return update(args);
    case 'delete': return del(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function create(args) {
  const { schema, position = 'beforeEnd', uid: parentUid } = args;
  if (parentUid) {
    const res = await api('/uiSchemas:insertAdjacent', { method: 'POST', body: { schema, position, uid: parentUid } });
    if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
    return { content: [{ type: 'text', text: `Schema inserted. UID: ${schema['x-uid']}` }] };
  }
  const res = await api('/uiSchemas:create', { method: 'POST', body: schema });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Schema created. UID: ${schema['x-uid']}` }] };
}

async function get(args) {
  const { uid: schemaUid } = args;
  const res = await api(`/uiSchemas:getJsonSchema/${schemaUid}`);
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function update(args) {
  const { uid: schemaUid, patch } = args;
  const body = { 'x-uid': schemaUid, ...patch };
  const res = await api('/uiSchemas:patch', { method: 'POST', body });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Schema node "${schemaUid}" updated.` }] };
}

async function del(args) {
  const { uid: schemaUid } = args;
  const res = await api('/uiSchemas:destroy', { method: 'POST', query: `filterByTk=${schemaUid}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Schema node "${schemaUid}" destroyed.` }] };
}
