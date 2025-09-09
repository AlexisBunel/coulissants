// netlify/functions/upload-ar.js
import { getStore } from "@netlify/blobs";

export const config = { path: "/api/upload-ar" };

export default async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data"))
    return new Response("Bad Request", { status: 400 });

  const form = await req.formData();
  const configId = String(form.get("configId") || "").trim();
  const fileGlb = form.get("file_glb");
  const fileUsdz = form.get("file_usdz");
  const title = String(form.get("title") || `Config ${configId}`);

  if (!configId || !fileGlb || !fileUsdz)
    return new Response("Missing fields", { status: 400 });

  const storeName = "ar-models";
  const store = getStore(storeName);
  const keyGlb = `${configId}.glb`;
  const keyUsdz = `${configId}.usdz`;

  await store.set(keyGlb, fileGlb.stream(), {
    contentType: "model/gltf-binary",
    cacheControl: "public, max-age=31536000, immutable",
  });
  await store.set(keyUsdz, fileUsdz.stream(), {
    contentType: "model/vnd.usdz+zip",
    cacheControl: "public, max-age=31536000, immutable",
  });

  // URLs RELATIVES (résolues par le navigateur selon le host courant)
  const glbRel = `/api/blob?store=${encodeURIComponent(
    storeName
  )}&key=${encodeURIComponent(keyGlb)}`;
  const usdzRel = `/api/blob?store=${encodeURIComponent(
    storeName
  )}&key=${encodeURIComponent(keyUsdz)}`;

  // ORIGIN PUBLIC en --live via en-têtes, sinon local/prod automatique
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto");
  const base = new URL(req.url);
  const proto = fwdProto || base.protocol.replace(":", "") || "https";
  const host = fwdHost || base.host;
  const origin = `${proto}://${host}`;

  const mobileUrl = `${origin}/ar.html?glb=${encodeURIComponent(
    glbRel
  )}&usdz=${encodeURIComponent(usdzRel)}&title=${encodeURIComponent(
    title
  )}&id=${encodeURIComponent(configId)}`;

  return Response.json({
    glb: glbRel,
    usdz: usdzRel,
    id: configId,
    title,
  });
};
