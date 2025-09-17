<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDerivedStore } from "../stores/derived.store";

import { ThreeManager } from "../three/ThreeManager.js";
import { setThreeManager } from "../three/registry";
import { createMaterialLibrary } from "../three/materials.js";
import { buildInstances } from "../three/layout.js";

const d = useDerivedStore();
const { geometry } = storeToRefs(d);

const canvasEl = ref(null);
let three = null;
let matLib = null;

onMounted(() => {
  // 1 seule instance !
  three = new ThreeManager(canvasEl.value, { baseUrl: "/glb" });

  matLib = createMaterialLibrary();
  three.setMaterialLibrary(matLib);

  // Premier rendu
  three.update({ geometry: geometry.value, buildInstances });

  const wMm = geometry.value?.overall?.totalWidth ?? 1200; // fallback
  const hMm = geometry.value?.overall?.height ?? 2100;

  three.applyDefaultPoseFromDims({
    widthMm: wMm,
    heightMm: hMm,
    unitScale: 0.001, // mm -> m
    // padding: 1.5,    // ajuste si besoin (1.4–1.7)
    // direction: [2.5, 1.6, 2.8], // 3/4
    // fov: 45          // si tu veux forcer le fov
  });

  // Met l’instance dispo globalement
  setThreeManager(three);

  // debug éventuel
  window.__three = three;
});

watch(
  geometry,
  (g) => {
    if (!three) return;
    three.update({ geometry: g, buildInstances });
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (three) three.dispose();
  three = null;
});
</script>

<template>
  <canvas id="canvas" ref="canvasEl"></canvas>
</template>
