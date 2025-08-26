<script setup>
import { computed } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

const projectName = computed({
  get: () => config.name,
  set: (v) => config.setName(v),
});

function closeProjectIfOpen() {
  if (ui.isOpen("project")) ui.openSectionById(null);
}

function onInputEnter(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget?.blur();
  closeProjectIfOpen();
}
</script>

<template>
  <div class="form-wrapper" :class="{ open: ui.isOpen('project') }">
    <div class="form-header" @click="ui.toggleSection('project')" tabindex="0">
      <div>
        <h3>NOM DU PROJET</h3>
        <span id="name-text">{{ projectName || "" }}</span>
      </div>
      <span class="material-icons toggle-icon">edit</span>
    </div>

    <form class="form-content" @submit.prevent v-show="ui.isOpen('project')">
      <input
        type="text"
        v-model="projectName"
        placeholder="Nom du projet"
        aria-label="Nom du projet"
        @keydown.enter="onInputEnter"
      />
    </form>
  </div>
</template>
