<script setup>
import { computed, watch } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

const basePath = window.basePath || "/";

const width = computed({
  get: () => config.width,
  set: (v) =>
    config.setWidth ? config.setWidth(v) : (config.width = Number(v) || 0),
});
const height = computed({
  get: () => config.height,
  set: (v) =>
    config.setHeight ? config.setHeight(v) : (config.height = Number(v) || 0),
});

const nb_vantaux = computed({
  get: () => String(config.leavesCount ?? 1),
  set: (v) => {
    const n = Math.max(1, Math.min(5, parseInt(v) || 1));
    config.leavesCount = n;
  },
});

const setDisposition = (value) => {
  config.arrangement = value;
};

const validate = () => {
  const isSimple = config.rail === "simple";
  const minWidth = 500;
  const maxWidth = isSimple ? 1200 : 5000;
  const minHeight = 600;
  const maxHeight = 2750;

  if (config.width < minWidth || config.width > maxWidth) {
    width.value = Math.max(minWidth, Math.min(config.width, maxWidth));
  }
  if (config.height < minHeight || config.height > maxHeight) {
    height.value = Math.max(minHeight, Math.min(config.height, maxHeight));
  }
};

const vantailOptions = computed(() => {
  const w = parseInt(config.width) || 0;
  const rail = config.rail;
  const options = [];

  if (rail === "double") {
    const min = Math.max(1, Math.ceil(w / 1200));
    const rawMax = Math.max(1, Math.floor(w / 500));
    const max = Math.min(rawMax, 5);
    for (let i = min; i <= max; i++) {
      options.push({
        value: String(i),
        label: `${i} vantaux`,
        disabled: false,
      });
    }
  } else {
    const disable1 = w / 2 > 1200;
    options.push({ value: "1", label: "1 vantail", disabled: disable1 });
    options.push({ value: "2", label: "2 vantaux", disabled: false });
  }

  // fallback si valeur invalide
  const validValues = options.filter((o) => !o.disabled).map((o) => o.value);
  if (!validValues.includes(nb_vantaux.value) && validValues.length) {
    nb_vantaux.value = validValues[0];
  }

  return options;
});

const ouvertureCalculee = computed(() => {
  if (config.rail === "simple") {
    const vantaux = parseInt(nb_vantaux.value) || 1;
    return config.width * 2 * vantaux;
  }
  return config.width;
});

const dimensionLabel = computed(() =>
  nb_vantaux.value === "1"
    ? "Dimensions du vantail :"
    : "Dimensions des vantaux :"
);

const showDisposition = computed(
  () => config.rail === "double" && nb_vantaux.value === "4"
);

watch(
  () => config.rail,
  (newRail) => {
    if (newRail === "simple" && config.width > 1200) {
      width.value = 1200;
    }
  }
);
</script>

<template>
  <div class="form-wrapper" :class="{ open: ui.isOpen('dimensions') }">
    <div class="form-header" @click="ui.toggleSection('dimensions')">
      <h3>DIMENSIONS</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content">
      <p>
        {{
          config.rail === "double"
            ? "Dimensions de l'ouverture :"
            : dimensionLabel
        }}
      </p>

      <label>
        Largeur (mm) :
        <input type="number" v-model.number="width" @blur="validate" />
      </label>

      <label>
        Hauteur (mm) :
        <input type="number" v-model.number="height" @blur="validate" />
      </label>

      <p class="rail-length">
        Dimension de l'ouverture :
        <strong>{{ ouvertureCalculee }} mm</strong>
      </p>

      <p>Nombre de vantaux :</p>
      <div id="vantaux-container">
        <select v-model="nb_vantaux">
          <option
            v-for="opt in vantailOptions"
            :key="opt.value"
            :value="opt.value"
            :disabled="opt.disabled"
          >
            {{ opt.label }}
          </option>
        </select>
      </div>

      <div id="disposition-vantaux" v-if="showDisposition">
        <p>Disposition des vantaux :</p>
        <div class="disposition-buttons">
          <button
            type="button"
            class="disposition-button"
            :class="{ selected: config.arrangement === 'quinconce' }"
            @click="setDisposition('quinconce')"
          >
            <span>En quinconce</span>
            <img
              :src="`${basePath}svg/v-quinconce.svg`"
              alt="Disposition en quinconce"
            />
          </button>
          <button
            type="button"
            class="disposition-button"
            :class="{ selected: config.arrangement === 'centre' }"
            @click="setDisposition('centre')"
          >
            <span>Avant centré</span>
            <img
              :src="`${basePath}svg/v-centre.svg`"
              alt="Disposition centrée"
            />
          </button>
        </div>
      </div>
    </form>
  </div>
</template>
