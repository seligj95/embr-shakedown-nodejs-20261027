export function GET({ request }) {
  return Response.json({
    marker: "A",
    nonce: new URL(request.url).searchParams.get("nonce"),
  });
}
