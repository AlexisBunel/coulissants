<script setup>
import { computed } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

const range = computed({
  get: () => config.range,
  set: (v) => config.setRange(v),
});
const tick = computed({
  get: () => config.tick,
  set: (v) => config.setTick(v),
});

const tickOptions = computed(() => config.tickOptions);
</script>

<template>
  <div class="form-wrapper" :class="{ open: ui.isOpen('range') }">
    <div class="form-header" @click="ui.toggleSection('range')">
      <h3>CHOIX DE LA GAMME</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content">
      <p>Gamme de coulissants :</p>
      <div class="radio-list">
        <label for="82">
          <input type="radio" id="82" name="range" value="82" v-model="range" />
          Coulissant 82
        </label>

        <label for="96">
          <input type="radio" id="96" name="range" value="96" v-model="range" />
          Coulissant 96
        </label>

        <label for="96CA">
          <input
            type="radio"
            id="96CA"
            name="range"
            value="96CA"
            v-model="range"
          />
          Coulissant 96 - CADRALU
        </label>
      </div>

      <p>Épaisseur du remplissage :</p>
      <div class="radio-list">
        <label v-for="opt in tickOptions" :key="opt.value">
          <input type="radio" name="tick" :value="opt.value" v-model="tick" />
          {{ opt.label }}
        </label>
      </div>
    </form>
  </div>
</template>
