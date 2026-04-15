import crypto from 'node:crypto';

let API_BASE = '';
let _email = '';
let _password = '';
let token = null;

/**
 * Initialize API client with connection parameters.
 * Called once from index.js entry point.
 */
export function initApi({ baseUrl, email, password }) {
  API_BASE = `${baseUrl.replace(/\/+$/, '')}/api`;
  _email = email;
  _password = password;
}

export function getBaseUrl() {
  return API_BASE.replace(/\/api$/, '');
}

export async function login() {
  const res = await fetch(`${API_BASE}/auth:signIn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: _email, password: _password }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  token = data.data?.token;
  if (!token) throw new Error('No token in login response');
  return token;
}

export async function api(path, options = {}) {
  if (!token) await login();
  const { method = 'GET', body, query } = options;
  let url = `${API_BASE}${path}`;
  if (query) url += `?${query}`;
  const headers = { Authorization: `Bearer ${token}` };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }
  let res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 401) {
    await login();
    headers.Authorization = `Bearer ${token}`;
    res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  }
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) return { error: true, status: res.status, data: json };
  return json;
}

// ─── Token management for proxy ────────────────────────────────────

let _refreshTimer = null;

/** Return the current token (may be null if not yet logged in). */
export function getToken() {
  return token;
}

/** Ensure we have a valid token; re-login if null. */
export async function ensureToken() {
  if (!token) await login();
  return token;
}

/**
 * Start periodic token refresh.
 * @param {number} intervalMs - Refresh interval in ms (default 1 hour)
 */
export function startTokenRefresh(intervalMs = 3600_000) {
  // Clear any existing timer
  if (_refreshTimer) clearInterval(_refreshTimer);
  _refreshTimer = setInterval(async () => {
    try {
      await login();
      console.error('[api] Token refreshed (periodic)');
    } catch (err) {
      console.error('[api] Periodic token refresh failed:', err.message);
    }
  }, intervalMs);
  // Don't let the timer prevent process exit
  if (_refreshTimer.unref) _refreshTimer.unref();
  console.error(`[api] Token auto-refresh every ${intervalMs / 1000}s`);
}

export function uid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

// Shared helper: create a flow model and attach to parent
export async function createAndAttach(modelUid, use, parentId, subKey, subType, sortIndex, stepParams) {
  const createBody = { uid: modelUid, use };
  if (sortIndex !== undefined) createBody.sortIndex = sortIndex;
  if (stepParams) createBody.stepParams = stepParams;
  const createRes = await api('/flowModels:create', { method: 'POST', body: createBody });
  if (createRes.error) return { error: true, data: createRes.data };
  if (parentId && subKey) {
    const qp = new URLSearchParams({ uid: modelUid, parentId, subKey });
    if (subType) qp.set('subType', subType);
    await api('/flowModels:attach', { method: 'POST', query: qp.toString() });
  }
  return createRes;
}

export async function saveStepParams(modelUid, stepParams) {
  return api('/flowModels:save', { method: 'POST', body: { uid: modelUid, stepParams } });
}
