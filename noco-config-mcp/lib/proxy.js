import http from 'node:http';
import { URL } from 'node:url';
import { getToken, ensureToken } from './api.js';

/**
 * Start a reverse-proxy HTTP server that injects Bearer token into every request.
 *
 * @param {number} port       - Local port to listen on (e.g. 13001)
 * @param {string} backendUrl - Full backend base URL (e.g. http://192.168.1.28:13000)
 * @returns {Promise<http.Server>}
 */
export function startProxy(port, backendUrl) {
  const target = new URL(backendUrl);

  const server = http.createServer(async (clientReq, clientRes) => {
    // ─── Restrict to localhost only ────────────────────────────────
    const clientIp = clientReq.socket.remoteAddress;
    if (!isLocalhost(clientIp)) {
      clientRes.writeHead(403, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'Access denied: localhost only' }));
      console.error(`[proxy] Rejected request from ${clientIp} (non-localhost)`);
      return;
    }

    const token = getToken();
    if (!token) {
      clientRes.writeHead(503, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'No auth token available yet' }));
      return;
    }

    const proxyReq = buildProxyRequest(clientReq, target, token);
    await forwardRequest(proxyReq, clientReq, clientRes, target, 0);
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    // Listen on 127.0.0.1 only – no external access
    server.listen(port, '127.0.0.1', () => {
      console.error(`[proxy] Reverse proxy listening on 127.0.0.1:${port} -> ${target.origin} (localhost only)`);
      resolve(server);
    });
  });
}

// ─── Internal helpers ────────────────────────────────────────────────

/**
 * Check if an IP address is localhost (127.0.0.1, ::1, ::ffff:127.0.0.1).
 */
function isLocalhost(ip) {
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Build options for http.request to forward clientReq to the backend.
 */
function buildProxyRequest(clientReq, target, token) {
  const targetPath = clientReq.url;
  return {
    hostname: target.hostname,
    port: target.port,
    path: targetPath,
    method: clientReq.method,
    headers: {
      ...stripHopByHopHeaders(clientReq.headers),
      host: target.host,            // rewrite Host to backend
      authorization: `Bearer ${token}`,  // inject auth token
    },
  };
}

/**
 * Forward the request, with one 401-retry when token expires.
 */
async function forwardRequest(proxyOpts, clientReq, clientRes, target, retryCount) {
  const maxRetries = 1;

  const proxy = http.request(proxyOpts, (backendRes) => {
    // If 401 and we haven't retried yet, refresh token and retry
    if (backendRes.statusCode === 401 && retryCount < maxRetries) {
      // Drain the response body first
      backendRes.resume();
      backendRes.on('end', async () => {
        console.error('[proxy] Got 401, refreshing token and retrying...');
        try {
          const newToken = await ensureToken();
          proxyOpts.headers.authorization = `Bearer ${newToken}`;
          await forwardRequest(proxyOpts, clientReq, clientRes, target, retryCount + 1);
        } catch (err) {
          console.error('[proxy] Token refresh failed:', err.message);
          clientRes.writeHead(502, { 'Content-Type': 'application/json' });
          clientRes.end(JSON.stringify({ error: 'Token refresh failed', detail: err.message }));
        }
      });
      return;
    }

    // Normal response – pipe through
    const respHeaders = stripHopByHopHeaders(backendRes.headers);
    clientRes.writeHead(backendRes.statusCode, respHeaders);
    backendRes.pipe(clientRes, { end: true });
  });

  proxy.on('error', (err) => {
    console.error('[proxy] Backend request error:', err.message);
    if (!clientRes.headersSent) {
      clientRes.writeHead(502, { 'Content-Type': 'application/json' });
      clientRes.end(JSON.stringify({ error: 'Backend unreachable', detail: err.message }));
    }
  });

  // Pipe client request body to backend
  clientReq.pipe(proxy, { end: true });
}

/**
 * Remove hop-by-hop headers that should not be forwarded.
 */
function stripHopByHopHeaders(headers) {
  const hopByHop = new Set([
    'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailers', 'transfer-encoding', 'upgrade',
  ]);
  const result = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!hopByHop.has(key.toLowerCase())) {
      result[key] = value;
    }
  }
  return result;
}
