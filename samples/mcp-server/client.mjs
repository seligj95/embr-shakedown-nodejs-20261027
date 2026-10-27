// Minimal HTTP client, not an OAuth implementation or a Builder compatibility receipt.
const endpoint = new URL(process.env.MCP_URL ?? 'http://127.0.0.1:8080/mcp');
if (endpoint.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(endpoint.hostname)) {
  throw new Error('Use HTTPS outside loopback');
}
if (!process.env.APP_API_TOKEN) throw new Error('APP_API_TOKEN is required');
let protocol;
async function rpc(id, method, params) {
  const response = await fetch(endpoint, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${process.env.APP_API_TOKEN}`,
      ...(protocol ? { 'MCP-Protocol-Version': protocol } : {}),
      ...(process.env.PLATFORM_ACCESS_TOKEN ? {
        'X-Embr-Authorization': `Bearer ${process.env.PLATFORM_ACCESS_TOKEN}`,
      } : {}),
    },
    body: JSON.stringify({ jsonrpc: '2.0', ...(id ? { id } : {}), method, params }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}; check authentication and target routing`);
  if (response.status === 202) return;
  const message = await response.json();
  if (message.error) throw new Error('MCP request failed');
  return message.result;
}
const initialized = await rpc(1, 'initialize', {
  protocolVersion: '2025-11-25', capabilities: {},
  clientInfo: { name: 'builder-sample-client', version: '1.0.0' },
});
protocol = initialized.protocolVersion;
await rpc(undefined, 'notifications/initialized');
const tools = await rpc(2, 'tools/list', {});
console.log('Tools:', tools.tools.map((tool) => tool.name).join(', '));
console.log(JSON.stringify(await rpc(3, 'tools/call', { name: 'text_length', arguments: { text: 'Hello' } })));
