<script setup>
import { computed } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

const colorProfile = computed({
  get: () => config.colorProfiles,
  set: (v) => config.setColorProfile(v),
});
const handle = computed({
  get: () => config.handle,
  set: (v) => config.setHandle(v),
});

const finishOptions = computed(() => config.finishOptions);
const handleOptions = computed(() => config.handleOptions);

const basePath = window.basePath || "/";
const imageUrl = computed(() => {
  if (!handle.value || !colorProfile.value) return null;
  return `${basePath}img/profils/${handle.value}-${colorProfile.value}.webp`;
});
</script>
<template>
  <div class="form-wrapper" :class="{ open: ui.isOpen('handle') }">
    <div
      class="form-header"
      role="button"
      tabindex="0"
      @click="ui.toggleSection('handle')"
    >
      <h3>CHOIX DE LA POIGNÉE</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content" @submit.prevent v-show="ui.isOpen('handle')">
      <p>Finition :</p>
      <div id="finish-options">
        <select v-model="colorProfile" aria-label="Finition">
          <option
            v-for="opt in finishOptions"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <p>Poignée :</p>
      <div id="poignee-container">
        <div class="radio-list" id="handle-options">
          <label
            v-for="opt in handleOptions"
            :key="opt.value"
            :for="`handle-${opt.value}`"
          >
            <input
              type="radio"
              name="handle"
              :id="`handle-${opt.value}`"
              :value="opt.value"
              v-model="handle"
            />
            {{ opt.label }}
          </label>

          <p
            v-if="handleOptions.length === 0"
            style="color: #888; font-size: 0.9rem"
          >
            Aucune poignée disponible pour cette finition.
          </p>
        </div>

        <div id="handle-preview" class="poignee-preview" v-if="imageUrl">
          <img :src="imageUrl" :alt="`Aperçu ${handle}`" />
        </div>
      </div>
    </form>
  </div>
</template>
