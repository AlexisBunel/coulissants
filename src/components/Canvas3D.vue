<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useDerivedStore } from "../stores/derived.store"; // ton store qui expose `geometry`

import { ThreeManager } from "../three/ThreeManager.js";
import { createMaterialLibrary } from "../three/materials.js";
import { buildInstances } from "../three/layout.js";

const d = useDerivedStore();
const { geometry } = storeToRefs(d); // geometry: computed() retournant l’objet que tu as décrit

const canvasEl = ref(null);
let three = null;
let matLib = null;

onMounted(() => {
  three = new ThreeManager(canvasEl.value, { baseUrl: "/glb" }); // adapte le dossier
  matLib = createMaterialLibrary();
  three.setMaterialLibrary(matLib);

  // Premier rendu
  three.update({ geometry: geometry.value, buildInstances });
});

// Réactivité : dès que `geometry` change -> on met à jour la scène
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

<style scoped>
#canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

<template>
  <canvas id="canvas" ref="canvasEl"></canvas>
</template>

<!-- <style scoped>
#canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style> -->
