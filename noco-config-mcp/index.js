#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { initApi, login, getBaseUrl, startTokenRefresh } from './lib/api.js';
import { startProxy } from './lib/proxy.js';
import { TOOLS } from './lib/tool-definitions.js';

// ─── Config from CLI args or env vars ────────────────────────────────
const baseUrl = process.argv[2] || process.env.NOCO_BASE_URL;
const email = process.argv[3] || process.env.NOCO_EMAIL;
const password = process.argv[4] || process.env.NOCO_PASSWORD;
const proxyPort = parseInt(process.argv[5] || process.env.NOCO_PROXY_PORT || '13001', 10);
if (!baseUrl || !email || !password) {
  console.error('Usage: node index.js <base_url> <email> <password> [proxy_port]');
  console.error('   Or set NOCO_BASE_URL, NOCO_EMAIL, NOCO_PASSWORD, NOCO_PROXY_PORT env vars');
  process.exit(1);
}
initApi({ baseUrl, email, password });

// ─── Resource handlers (each exports a dispatch function) ──────────
const handlers = {
  collections: (await import('./lib/handlers/collections.js')).dispatch,
  fields: (await import('./lib/handlers/fields.js')).dispatch,
  records: (await import('./lib/handlers/records.js')).dispatch,
  routes: (await import('./lib/handlers/routes.js')).dispatch,
  schemas: (await import('./lib/handlers/schemas.js')).dispatch,
  flow_models: (await import('./lib/handlers/flow-models.js')).dispatch,
  table_ui: (await import('./lib/handlers/table-ui.js')).dispatch,
};

// ─── MCP Server setup ───────────────────────────────────────────────
const server = new Server(
  { name: 'noco-config-mcp', version: '2.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const handler = handlers[name];
  if (!handler) {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
  try {
    return await handler(args || {});
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Internal error: ${err.message}` }],
      isError: true,
    };
  }
});

// ─── Start ──────────────────────────────────────────────────────────
async function main() {
  await login();
  startTokenRefresh();  // Refresh token every 1 hour
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`noco-config-mcp connected to ${getBaseUrl()}`);

  // Start reverse proxy
  try {
    await startProxy(proxyPort, getBaseUrl());
  } catch (err) {
    console.error(`[proxy] Failed to start proxy on :${proxyPort}: ${err.message}`);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
