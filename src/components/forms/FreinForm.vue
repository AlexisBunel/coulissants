<script setup>
import { computed, watch } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

// --- Sécu : toujours avoir l'objet absorber ---
function ensureAbsorber() {
  if (!config.absorber) {
    config.absorber = { frlamelle: 0, fram: 0, freco: 0 };
  }
}

// --- Champs contrôlés (entiers ≥ 0) ---
const frlamelle = computed({
  get: () => (ensureAbsorber(), Number(config.absorber.frlamelle ?? 0)),
  set: (v) => {
    ensureAbsorber();
    config.absorber.frlamelle = Math.max(0, Math.floor(Number(v) || 0));
  },
});

const fram = computed({
  get: () => (ensureAbsorber(), Number(config.absorber.fram ?? 0)),
  set: (v) => {
    ensureAbsorber();
    config.absorber.fram = Math.max(0, Math.floor(Number(v) || 0));
  },
});

const freco = computed({
  get: () => (ensureAbsorber(), Number(config.absorber.freco ?? 0)),
  set: (v) => {
    ensureAbsorber();
    config.absorber.freco = Math.max(0, Math.floor(Number(v) || 0));
  },
});

// --- ECO visible uniquement en 82 ---
const showFreco = computed(() => String(config.range) === "82");

const showFrlamelle = computed(() => String(config.range) !== "96CA");

// --- Valeurs par défaut = nb de vantaux selon la gamme ---
watch(
  [() => String(config.range), () => Number(config.leavesCount || 1)],
  ([rangeStr, leaves]) => {
    ensureAbsorber();
    const n = Math.max(0, Math.floor(leaves || 0));

    // ECO (82) : freco = nb de vantaux ; sinon 0
    if (rangeStr === "82") {
      config.absorber.freco = n;
      config.absorber.frlamelle = n;
    } else {
      config.absorber.freco = 0;
    }

    // FRAM (96 / 96CS) : fram = nb de vantaux ; sinon 0
    if (rangeStr === "96" || rangeStr === "96CA") {
      config.absorber.fram = n;
      config.absorber.frlamelle = n;
    } else {
      config.absorber.fram = 0;
    }

    if (rangeStr === "96CA") {
      config.absorber.frlamelle = 0;
    }

    // Sécu clamp
    config.absorber.frlamelle = Math.max(
      0,
      Math.floor(Number(config.absorber.frlamelle ?? 0))
    );
    config.absorber.fram = Math.max(
      0,
      Math.floor(Number(config.absorber.fram ?? 0))
    );
    config.absorber.freco = Math.max(
      0,
      Math.floor(Number(config.absorber.freco ?? 0))
    );
  },
  { immediate: true }
);
</script>

<template>
  <div class="form-wrapper" :class="{ open: ui.isOpen('freins') }">
    <div class="form-header" @click="ui.toggleSection('freins')">
      <h3>FREINS</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content" id="frein-form">
      <label v-if="showFrlamelle">
        Nombre de freins à lamelle :
        <input type="number" min="0" step="1" v-model.number="frlamelle" />
      </label>

      <label>
        Nombre de kits freins amortisseur magnétique :
        <input type="number" min="0" step="1" v-model.number="fram" />
      </label>

      <!-- ECO : visible uniquement en 82 -->
      <label v-if="showFreco">
        Nombre de kits frein amortisseur mécanique :
        <input type="number" min="0" step="1" v-model.number="freco" />
      </label>
    </form>
  </div>
</template>
