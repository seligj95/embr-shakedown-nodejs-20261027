export function GET({ request }) {
  return Response.json({
    marker: "B",
    nonce: new URL(request.url).searchParams.get("nonce"),
  });
}
