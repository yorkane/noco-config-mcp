import { api } from '../api.js';

export async function dispatch(args) {
  const { action } = args;
  switch (action) {
    case 'create': return create(args);
    case 'attach': return attach(args);
    case 'find': return find(args);
    case 'list': return list(args);
    case 'save': return save(args);
    case 'destroy': return destroy(args);
    default: return { content: [{ type: 'text', text: `Unknown action: ${action}` }], isError: true };
  }
}

async function create(args) {
  const { uid: modelUid, use, props, parentId, subKey, subType, sortIndex } = args;
  const body = { use };
  if (modelUid) body.uid = modelUid;
  if (props) body.props = props;
  if (parentId) body.parentId = parentId;
  if (subKey) body.subKey = subKey;
  if (subType) body.subType = subType;
  if (sortIndex !== undefined) body.sortIndex = sortIndex;
  const res = await api('/flowModels:create', { method: 'POST', body });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function attach(args) {
  const { uid: modelUid, parentId, subKey, subType } = args;
  const queryParams = new URLSearchParams({ uid: modelUid, parentId, subKey });
  if (subType) queryParams.set('subType', subType);
  const res = await api('/flowModels:attach', { method: 'POST', query: queryParams.toString() });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Model ${modelUid} attached to ${parentId} under ${subKey}.` }] };
}

async function find(args) {
  const { uid: modelUid, parentId, subKey } = args;
  const params = new URLSearchParams();
  if (modelUid) params.set('uid', modelUid);
  if (parentId) params.set('parentId', parentId);
  if (subKey) params.set('subKey', subKey);
  const res = await api('/flowModels:findOne', { query: params.toString() });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function list(args) {
  const { parentId, subKey } = args;
  const params = new URLSearchParams({ parentId, subKey });
  const res = await api('/flowModels:list', { query: params.toString() });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: JSON.stringify(res.data, null, 2) }] };
}

async function save(args) {
  const { uid: modelUid, props } = args;
  const res = await api('/flowModels:save', { method: 'POST', body: { uid: modelUid, props } });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Model ${modelUid} saved.` }] };
}

async function destroy(args) {
  const { uid: modelUid } = args;
  const res = await api('/flowModels:destroy', { method: 'POST', query: `filterByTk=${modelUid}` });
  if (res.error) return { content: [{ type: 'text', text: `Error: ${JSON.stringify(res.data)}` }], isError: true };
  return { content: [{ type: 'text', text: `Model ${modelUid} destroyed.` }] };
}
