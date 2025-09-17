<template>
  <header>
    <h1>PORTES COULISSANTES</h1>
  </header>
  <main id="canvas-wrapper">
    <div id="sticky-container">
      <section id="three-canvas">
        <Canvas3D />
      </section>
      <section id="forms">
        <ProjectForm />
        <GammeForm />
        <RailForm />
        <PoigneeForm />
        <DimensionsForm />
        <TraversesForm />
        <FreinForm />
        <RemplissageForm />
      </section>
    </div>
    <section id="recapitulatif" role="complementary">
      <h2>RÉCAPITULATIFS</h2>
      <ProfilesTable />
      <AccessoriesTable />
      <FillingsTable />
    </section>
    <section id="qrcode" style="margin-top: 16px; padding: 12px">
      <h3>Réalité augmentée</h3>
      <div
        style="display: flex; gap: 8px; align-items: center; margin: 0.5rem 0"
      >
        <!-- <input
          id="ar-title"
          placeholder="Titre (facultatif)"
          style="
            flex: 1;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 8px;
          "
        /> -->
        <button
          id="ar-run"
          style="
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #ddd;
            background: #111;
            color: #fff;
          "
        >
          Générer le QRCode
        </button>
      </div>
      <canvas
        id="ar-qr"
        width="220"
        height="220"
        style="display: none"
      ></canvas>
      <p id="ar-link"></p>
    </section>
    <ExportSection />
  </main>
</template>

<script setup>
import ProjectForm from "./components/forms/ProjectForm.vue";
import GammeForm from "./components/forms/GammeForm.vue";
import RailForm from "./components/forms/RailForm.vue";
import PoigneeForm from "./components/forms/PoigneeForm.vue";
import DimensionsForm from "./components/forms/DimensionsForm.vue";
import TraversesForm from "./components/forms/TraversesForm.vue";
import FreinForm from "./components/forms/FreinForm.vue";
import RemplissageForm from "./components/forms/RemplissageForm.vue";
import ProfilesTable from "./components/summaries/ProfilesTable.vue";
import AccessoriesTable from "./components/summaries/AccessoriesTable.vue";
import FillingsTable from "./components/summaries/FillingsTable.vue";
import Canvas3D from "./components/Canvas3D.vue";
import ExportSection from "./components/ExportSection.vue";

import * as THREE from "three";
import { onMounted } from "vue";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { USDZExporter } from "three/examples/jsm/exporters/USDZExporter.js"; // export nommé

function bakeScene(root) {
  const g = new THREE.Group();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.visible) return;
    const geo = o.geometry.clone();
    const mat = new THREE.MeshStandardMaterial({
      color: o.material?.color?.clone?.() ?? new THREE.Color(0xaaaaaa),
      metalness: Math.min(1, o.material?.metalness ?? 0.1),
      roughness: Math.min(1, o.material?.roughness ?? 0.6),
    });
    const m = new THREE.Mesh(geo, mat);
    m.applyMatrix4(o.matrixWorld);
    m.updateMatrixWorld(true);
    g.add(m);
  });
  return g;
}

function toUSDZBlob(res) {
  const type = "model/vnd.usdz+zip";
  if (typeof Blob !== "undefined" && res instanceof Blob) return res;
  if (res && ArrayBuffer.isView(res) && typeof res.byteLength === "number") {
    return new Blob([res.buffer.slice(0, res.byteLength)], { type });
  }
  if (res && res instanceof ArrayBuffer) {
    return new Blob([res], { type });
  }
  if (res && typeof res === "object") {
    if (typeof res.size === "number" && typeof res.arrayBuffer === "function")
      return res;
    if (
      res?.buffer instanceof ArrayBuffer &&
      typeof res.byteLength === "number"
    ) {
      return new Blob([res.buffer.slice(0, res.byteLength)], { type });
    }
  }
  return null;
}

async function exportUSDZBlobFrom(root) {
  const baked = bakeScene(root);

  let meshes = 0,
    tris = 0;
  baked.traverse((o) => {
    if (o.isMesh && o.geometry?.attributes?.position) {
      meshes++;
      tris += Math.floor(o.geometry.attributes.position.count / 3);
    }
  });

  const exporter = new USDZExporter();
  try {
    const res = await exporter.parse(baked);
    const blob = toUSDZBlob(res);
    return blob;
  } catch (e) {
    console.error("[USDZ] parse FAILED:", e?.stack || e);
    throw e;
  }
}

async function exportGLB(root) {
  const ex = new GLTFExporter();
  return await new Promise((res, rej) =>
    ex.parse(root, (r) => res(r), rej, { binary: true, onlyVisible: true })
  );
}

function makeConfigId() {
  return "cfg-" + Date.now();
}

onMounted(() => {
  const btn = document.getElementById("ar-run");
  const cnv = document.getElementById("ar-qr");
  const link = document.getElementById("ar-link");
  const input = document.getElementById("ar-title");

  btn?.addEventListener("click", async () => {
    try {
      if (!window.__three?.root) {
        alert("Scène non prête");
        return;
      }
      btn.disabled = true;
      btn.textContent = "Export…";

      const configId = makeConfigId();

      // 1) GLB
      const glbBuf = await exportGLB(window.__three.root);

      // 2) USDZ
      btn.textContent = "Export USDZ…";
      const usdzBlob = await exportUSDZBlobFrom(window.__three.root);
      if (!usdzBlob || !usdzBlob.size || usdzBlob.size < 1024) {
        console.error("USDZ trop petit:", usdzBlob?.size);
        alert(
          "USDZ vide ou invalide (taille < 1 Ko). Vérifie la scène et réessaie."
        );
        btn.textContent = "Exporter + QR";
        btn.disabled = false;
        return;
      }

      // 3) Upload
      const form = new FormData();
      form.append("configId", configId);
      form.append("title", (input?.value || "").trim() || `Config ${configId}`);
      form.append(
        "file_glb",
        new Blob([glbBuf], { type: "model/gltf-binary" }),
        `${configId}.glb`
      );
      form.append("file_usdz", usdzBlob, `${configId}.usdz`);

      btn.textContent = "Upload…";
      // const r = await fetch("/api/upload-ar", { method: "POST", body: form });
      const r = await fetch("/.netlify/functions/upload-ar", {
        method: "POST",
        body: form,
      });
      if (!r.ok) throw new Error("Upload failed");
      const { glb, title: t, id } = await r.json();

      // 4) URL mobile
      const origin = window.location.origin;
      const usdzPretty = `${origin}/usdz/${encodeURIComponent(id)}.usdz`;
      const mobileUrl =
        `${origin}/ar.html?` +
        `glb=${encodeURIComponent(glb)}` +
        `&usdz=${encodeURIComponent(usdzPretty)}` +
        `&title=${encodeURIComponent(t)}` +
        `&id=${encodeURIComponent(id)}`;

      // 5) QR + lien
      const { default: QRCode } = await import(
        "https://cdn.skypack.dev/qrcode"
      );
      await QRCode.toCanvas(cnv, mobileUrl, { width: 220, margin: 1 });
      cnv.style.display = "block";
      link.innerHTML = `<a href="${mobileUrl}" target="_blank" rel="noopener">Ouvrir la page mobile</a>`;

      btn.textContent = "Générer le QRCode";
    } catch (e) {
      console.error(e);
      alert("Erreur export/upload AR");
    } finally {
      btn.disabled = false;
    }
  });
});
</script>
