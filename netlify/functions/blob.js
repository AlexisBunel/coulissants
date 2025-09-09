// netlify/functions/blob.js
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/blob" };

export default async (req) => {
  const url = new URL(req.url);
  const storeName = url.searchParams.get("store") || "ar-models";
  const key = url.searchParams.get("key");
  if (!key) return new Response("Missing key", { status: 400 });

  const store = getStore(storeName);
  // Récup en stream (évite de tout charger en mémoire)
  const stream = await store.get(key, { type: "stream" });
  if (!stream) return new Response("Not found", { status: 404 });

  // Déduire le MIME (on l’a fixé à l’écriture, mais on le redéfinit ici)
  let contentType = "application/octet-stream";
  if (key.endsWith(".glb")) contentType = "model/gltf-binary";
  if (key.endsWith(".usdz")) contentType = "model/vnd.usdz+zip";

  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
};
