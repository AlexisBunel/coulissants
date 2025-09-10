// netlify/functions/upload-ar.mjs
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data"))
    return new Response("Bad Request", { status: 400 });

  const form = await req.formData();
  const configId = String(form.get("configId") || "").trim();
  const title = String(form.get("title") || `Config ${configId}`);
  const fileGlb = form.get("file_glb"); // File (Blob)
  const fileUsdz = form.get("file_usdz"); // File (Blob)

  if (!configId || !fileGlb || !fileUsdz) {
    return new Response("Missing fields", { status: 400 });
  }

  // ✅ Convertir en buffers réutilisables (évite les streams)
  const glbBuf = new Uint8Array(await fileGlb.arrayBuffer());
  const usdzBuf = new Uint8Array(await fileUsdz.arrayBuffer());
  const glbSize = glbBuf.byteLength;
  const usdzSize = usdzBuf.byteLength;

  // (optionnel) barrière de taille pour éviter les 502 si trop gros
  const total = glbSize + usdzSize;
  const MAX = 8 * 1024 * 1024; // ≈ 8 Mo (functions sync)
  if (total > MAX) {
    console.log("upload-ar TOO BIG", { glbSize, usdzSize, total });
    return new Response("Payload too large", { status: 413 });
  }

  const store = getStore("ar-models");
  const keyGlb = `${configId}.glb`;
  const keyUsdz = `${configId}.usdz`;

  // ✅ Donner un “body” réutilisable (pas .stream())
  const glbMeta = await store.set(keyGlb, glbBuf, {
    contentType: "model/gltf-binary",
    cacheControl: "public, max-age=31536000, immutable",
  });
  const usdzMeta = await store.set(keyUsdz, usdzBuf, {
    contentType: "model/vnd.usdz+zip",
    cacheControl: "public, max-age=31536000, immutable",
  });

  // URL relatives côté client (Android peut viser /api/blob..., iOS aura /usdz/:id)
  return Response.json({
    id: configId,
    title,
    glb: `/api/blob?store=ar-models&key=${encodeURIComponent(keyGlb)}`,
    usdz: `/api/blob?store=ar-models&key=${encodeURIComponent(keyUsdz)}`,
  });
};
