import { api } from '../api.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'list': return list(args);
    case 'create': return create(args);
    case 'update': return update(args);
    case 'delete': return del(args);
    case 'batch_create': return batchCreate(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function list(args) {
  const { collection, page = 1, pageSize = 20, filter, sort, appends } = args;
  const params = new URLSearchParams({ page, pageSize });
  if (filter) params.set('filter', JSON.stringify(filter));
  if (sort) params.set('sort', sort.join(','));
  if (appends) params.set('appends', appends.join(','));
  const res = await api(`/${collection}:list`, { query: params.toString() });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function create(args) {
  const { collection, record } = args;
  const res = await api(`/${collection}:create`, { method: 'POST', body: record });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Record created in "${collection}". ID: ${res.data?.id || 'N/A'}` }] };
}

async function update(args) {
  const { collection, filterByTk, record } = args;
  const res = await api(`/${collection}:update`, { method: 'POST', query: `filterByTk=${filterByTk}`, body: record });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Record ${filterByTk} updated in "${collection}".` }] };
}

async function del(args) {
  const { collection, filterByTk } = args;
  const res = await api(`/${collection}:destroy`, { method: 'POST', query: `filterByTk=${filterByTk}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Record ${filterByTk} deleted from "${collection}".` }] };
}

async function batchCreate(args) {
  const { collection, records } = args;
  const results = [];
  for (const record of records) {
    const res = await api(`/${collection}:create`, { method: 'POST', body: record });
    results.push(res.error ? { ok: false, error: res.data } : { ok: true, id: res.data?.id });
  }
  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  return { content: [{ type: 'text', text: `Batch create: ${ok} succeeded, ${fail} failed.\n${JSON.stringify(results, null, 2)}` }] };
}
