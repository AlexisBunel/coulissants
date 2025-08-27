<script setup>
import { watch, onMounted, onBeforeUnmount } from "vue";
import { useDerivedStore } from "../stores/derived.store";

const d = useDerivedStore();

// Remplace ceci par ta vraie implémentation Three.js
let three = {
  init() {},
  update(g) {
    // console.log("[3D] geometry", g);
  },
  dispose() {},
};

onMounted(() => {
  three.init();
  three.update(d.geometry);
});

watch(
  () => d.geometry,
  (g) => {
    three.update(g);
  },
  { deep: true }
);

onBeforeUnmount(() => three.dispose());
</script>

<template>
  <canvas id="canvas"></canvas>
</template>
