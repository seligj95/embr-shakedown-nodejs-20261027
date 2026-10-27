import http from 'node:http';

const marker = 'B';
http.createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const send = (status, body) => {
    response.writeHead(status, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Shakedown-Component': 'api',
    });
    response.end(JSON.stringify(body));
  };
  if (request.method === 'GET' && path === '/api/health') {
    return send(200, { status: 'healthy', marker });
  }
  if (request.method === 'GET' && path === '/api/data') {
    return send(200, { marker, message: 'synthetic-only' });
  }
  if (request.method === 'GET' && path === '/api/config') {
    return send(200, {
      label: process.env.SHAKEDOWN_LABEL || 'unset',
      renamed: process.env.SHAKEDOWN_RENAMED || 'unset',
    });
  }
  if (request.method === 'GET' && path === '/api/redirect') {
    response.writeHead(302, { Location: '/api/data' });
    return response.end();
  }
  if (request.method === 'POST' && path === '/api/echo') {
    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 4096) return send(413, { error: 'Synthetic payload too large' });
    }
    let value;
    try {
      value = JSON.parse(body);
    } catch {
      return send(400, { error: 'Invalid JSON' });
    }
    return send(200, { marker, value });
  }
  return send(404, { error: 'No synthetic API route', marker });
}).listen(Number(process.env.PORT || 8080), '0.0.0.0', () => {
  console.log(`SHAKEDOWN_FULL_STACK_API_READY_${marker}`);
});
