import { api } from '../api.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'list': return list();
    case 'create_group': return createGroup(args);
    case 'create_page': return createPage(args);
    case 'delete': return del(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function list() {
  const res = await api('/desktopRoutes:listAccessible', { query: 'tree=true' });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function createGroup(args) {
  const { title, sort = 100 } = args;
  const res = await api('/desktopRoutes:create', { method: 'POST', body: { title, type: 'group', sort } });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Group "${title}" created. ID: ${res.data?.id || 'N/A'}` }] };
}

async function createPage(args) {
  const { title, schemaUid, parentId, sort = 100, children } = args;
  const body = { title, type: 'flowPage', parentId, sort };
  if (children && children.length > 0) {
    body.children = children;
  } else if (schemaUid) {
    body.schemaUid = schemaUid;
  }
  const res = await api('/desktopRoutes:create', { method: 'POST', body });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  const info = [`Page "${title}" created. ID: ${res.data?.id || 'N/A'}`];
  if (children?.length) info.push(`Tabs: ${children.map(c => c.tabSchemaName || c.schemaUid).join(', ')}`);
  if (schemaUid) info.push(`schemaUid: ${schemaUid}`);
  return { content: [{ type: 'text', text: info.join('\n') }] };
}

async function del(args) {
  const { id } = args;
  const res = await api('/desktopRoutes:destroy', { method: 'POST', query: `filterByTk=${id}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Route ${id} deleted.` }] };
}
