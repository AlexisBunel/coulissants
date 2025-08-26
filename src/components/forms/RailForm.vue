<script setup>
import { computed } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

const rail = computed({
  get: () => config.rail,
  set: (v) => config.setRail(v),
});

const showRailsForm = computed(() => config.showRailsForm);
</script>
<template>
  <div
    v-if="showRailsForm"
    class="form-wrapper"
    :class="{ open: ui.isOpen('rail') }"
  >
    <div class="form-header" @click="ui.toggleSection('rail')">
      <h3>CHOIX DES RAILS</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content">
      <p>Choix des rails :</p>
      <div id="rail-options" class="radio-list">
        <label for="simple">
          <input
            type="radio"
            id="simple"
            name="rail"
            value="simple"
            v-model="rail"
          />
          Monorail
        </label>

        <label for="double">
          <input
            type="radio"
            id="double"
            name="rail"
            value="double"
            v-model="rail"
          />
          Rail double
        </label>
      </div>
    </form>
  </div>
</template>
