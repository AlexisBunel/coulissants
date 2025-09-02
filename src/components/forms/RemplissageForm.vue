<script setup>
import { watch } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

// Pont pour conserver le template tel quel
const isOpen = (id) => ui.isOpen(id);
const toggleForm = (id) => ui.toggleSection(id);

// Valeurs par défaut "safe"
function ensureDefaults() {
  if (config.filling == null) config.filling = "standard"; // ex: "standard" | "miroir"
  if (config.colorBrushes == null) config.colorBrushes = "Noir";
  if (config.colorSeal == null) config.colorSeal = "Noir";
  if (config.colorPGlass == null) config.colorPGlass = "Noir"; // ou "Translucide" si tu préfères
}

// Adapter aux gammes du projet (range : "82" | "96" | "96CA" | ...)
watch(
  () => String(config.range),
  (r) => {
    ensureDefaults();
    // Si on n'est pas en 96CA, le select "filling" est visible ; on s'assure d'une valeur valide
    if (r !== "96CA" && !["standard", "miroir"].includes(config.filling)) {
      config.filling = "standard";
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="form-wrapper" :class="{ open: isOpen('remplissage') }">
    <div class="form-header" @click="toggleForm('remplissage')">
      <h3>FINITIONS</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content">
      <!-- Type de remplissage : visible sauf pour 96CA -->
      <label v-if="config.range === '82' || config.range === '96'">
        Type de remplissage :
        <select v-model="config.filling">
          <option value="standard">Panneau</option>
          <option value="miroir">Panneau + Miroir</option>
        </select>
      </label>

      <!-- Couleur des balais anti-poussière (96 uniquement) -->
      <label v-if="config.range === '96'">
        Couleur des balais :
        <select v-model="config.colorBrushes">
          <option value="Noir">Noir</option>
          <option value="Gris">Gris</option>
        </select>
      </label>

      <!-- Options spécifiques à aux gammes -->
      <template v-if="config.range === '96' || '96CA'">
        <label>
          Couleur des joints de butée :
          <select v-model="config.colorSeal">
            <option value="Noir">Noir</option>
            <option value="Gris">Gris</option>
          </select>
        </label>
      </template>
      <template v-if="config.range === '96CA'">
        <label>
          Couleur des profils de vitrage :
          <select v-model="config.colorPGlass">
            <option v-if="config.tick === '6-8'" value="Noir">Noir</option>
            <option value="Translucide">Translucide</option>
          </select>
        </label>
      </template>
    </form>
  </div>
</template>
