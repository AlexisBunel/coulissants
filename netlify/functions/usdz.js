// netlify/functions/usdz.js
import { getStore } from "@netlify/blobs";

export const config = { path: "/usdz/:key" };

export default async (req, ctx) => {
  const key = ctx?.params?.key;
  if (!key || !key.endsWith(".usdz")) {
    return new Response("Missing or invalid key", { status: 400 });
  }
  const store = getStore("ar-models");
  const ab = await store.get(key, { type: "arrayBuffer" });
  if (!ab || ab.byteLength === 0)
    return new Response("Not found or empty", { status: 404 });

  return new Response(ab, {
    headers: {
      "Content-Type": "model/vnd.usdz+zip",
      "Content-Length": String(ab.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Disposition": `inline; filename="${key}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
};
