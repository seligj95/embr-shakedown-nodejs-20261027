export function GET() {
  return new Response("OK\n", { headers: { "content-type": "text/plain" } });
}
