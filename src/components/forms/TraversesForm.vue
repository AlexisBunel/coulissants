<script setup>
import { computed, reactive, watch } from "vue";
import { useConfigStore } from "../../stores/config.store";
import { useUiStore } from "../../stores/ui.store";

const ui = useUiStore();
const config = useConfigStore();

// --------- VISIBILITÉ DU FORMULAIRE ----------
const showForm = computed(() => String(config.range) !== "82");

// --------- VANTAUX / GROUPES ----------
const totalVantaux = computed(() =>
  Math.max(1, Number(config.leavesCount || 1))
);

function ensureGroups() {
  const n = totalVantaux.value;
  const groups = config.traverses.groups || (config.traverses.groups = []);
  while (groups.length < n) {
    groups.push({
      type:
        config.traverses.type || (traverseTypeOptions.value[0]?.value ?? ""),
      count: 0,
      heights: [],
    });
  }
  if (groups.length > n) groups.splice(n);

  // Si "identiques", on recopie le groupe 0 vers les suivants pour rester cohérent
  if (config.traverses.sameForAllLeaves && groups[0]) {
    const g0 = groups[0];
    for (let i = 1; i < groups.length; i++) {
      groups[i].type = g0.type;
      groups[i].count = g0.count;
      groups[i].heights = g0.heights.slice();
    }
  }
}

// Indices visibles selon le mode (identiques => uniquement [0])
const visibleIndices = computed(() =>
  config.traverses.sameForAllLeaves
    ? [0]
    : Array.from({ length: totalVantaux.value }, (_, i) => i)
);

const groupTitle = (i) =>
  config.traverses.sameForAllLeaves || totalVantaux.value === 1
    ? "TRAVERSES GÉNÉRALES"
    : `VANTAIL ${i + 1}`;

// --------- VANTAUX IDENTIQUES ----------
const vantauxIdentiques = computed({
  get: () => !!config.traverses?.sameForAllLeaves,
  set: (v) => {
    config.traverses.sameForAllLeaves = !!v;
    ensureGroups();
    if (v) {
      // copie immédiate du groupe 0 vers les autres
      const g0 = config.traverses.groups[0];
      for (let i = 1; i < config.traverses.groups.length; i++) {
        const gi = config.traverses.groups[i];
        gi.type = g0.type;
        gi.count = g0.count;
        gi.heights = g0.heights.slice();
      }
    }
    syncOpenState();
  },
});

// --------- TYPES DE TRAVERSE (selon gamme) ----------
const traverseTypeOptions = computed(() => {
  const r = String(config.range);
  if (r === "96")
    return [
      { value: "7", label: "Traverse 7mm" },
      { value: "25", label: "Traverse 25mm" },
    ];
  if (r === "96CA")
    return [
      { value: "28", label: "Traverse 28mm" },
      { value: "37", label: "Traverse 37mm" },
    ];
  return [];
});

const selectedTraverseType = computed({
  get: () =>
    config.traverses?.type ?? traverseTypeOptions.value[0]?.value ?? "",
  set: (v) => {
    const val = String(v);
    config.traverses.type = val;
    ensureGroups();
    if (config.traverses.groups[0]) config.traverses.groups[0].type = val;
    if (config.traverses.sameForAllLeaves) {
      for (let i = 1; i < config.traverses.groups.length; i++) {
        config.traverses.groups[i].type = val;
      }
    }
  },
});

// Sécurise le type quand la gamme change
watch(
  () => String(config.range),
  () => {
    const allowed = traverseTypeOptions.value.map((o) => o.value);
    if (!allowed.includes(selectedTraverseType.value)) {
      selectedTraverseType.value = allowed[0] ?? "";
    }
  }
);

// Si le nombre de vantaux change, on ajuste les groupes + mirroring si identiques
watch(totalVantaux, () => {
  ensureGroups();
  if (config.traverses.sameForAllLeaves) {
    const g0 = config.traverses.groups[0];
    for (let i = 1; i < config.traverses.groups.length; i++) {
      const gi = config.traverses.groups[i];
      gi.type = g0.type;
      gi.count = g0.count;
      gi.heights = g0.heights.slice();
    }
  }
});

// --------- NOMBRE DE TRAVERSES PAR VANTAIL ----------
const traverseOptions = computed(() => {
  const max = maxTraverseCount();
  return Array.from({ length: max + 1 }, (_, n) => n); // 0..Nmax
});

function setGroupCount(i, count) {
  ensureGroups();
  const g = config.traverses.groups[i];
  const n = Math.max(0, Math.floor(count || 0));
  g.count = n;
  while (g.heights.length < n) g.heights.push(0);
  if (g.heights.length > n) g.heights = g.heights.slice(0, n);

  if (config.traverses.sameForAllLeaves && i === 0) {
    for (let k = 1; k < config.traverses.groups.length; k++) {
      config.traverses.groups[k].count = n;
      config.traverses.groups[k].heights = g.heights.slice();
      config.traverses.groups[k].type = g.type;
    }
  }
}

// --------- GÉNÉRATION & VALIDATION DES HAUTEURS ----------

function panelHeightEffective() {
  const H = Math.max(0, Number(config.height || 0));
  const r = String(config.range);
  const offset = r === "96CA" ? 54 : 50; // 96CA: -54, sinon (96): -50
  return Math.max(0, H - offset);
}

function geometryParams() {
  const Heff = panelHeightEffective();
  const r = String(config.range);
  // 96CA: cadre bas 52, haut 28 ; 96: pas de cadre
  const frameBottom = r === "96CA" ? 52 : 0;
  const frameTop = r === "96CA" ? 28 : 0;
  const innerHeight = Math.max(0, Heff - (frameBottom + frameTop));
  return { Heff, frameBottom, frameTop, innerHeight };
}

// --- Nombre max de traverses possible (écart entre centres ≥ 200) ---
function maxTraverseCount() {
  const { innerHeight } = geometryParams();
  const MIN_CENTER = 200;
  // condition: innerHeight >= (n+1)*200  => n <= innerHeight/200 - 1
  const nMax = Math.floor(innerHeight / MIN_CENTER) - 1;
  return Math.max(0, nMax); // jamais négatif
}

function generateDefaultHauteurs(i) {
  ensureGroups();
  const Heff = panelHeightEffective();
  const r = String(config.range);
  const g = config.traverses.groups[i];
  let n = Math.max(0, Number(g.count || 0));
  if (!n || !Heff) {
    g.heights = [];
    return;
  }

  // 96CA: cadre bas 52, haut 28 ; 96: aucun cadre
  const frameBottom = r === "96CA" ? 52 : 0;
  const frameTop = r === "96CA" ? 28 : 0;

  const MIN_CENTER = 200; // entre centres
  const MIN_BOTTOM = 200 + frameBottom; // centre → bord bas
  const MIN_TOP = 200 + frameTop; // centre → bord haut

  // Égalisation :
  // 96   -> gap = Heff/(n+1), pos = k*gap
  // 96CA -> gap = (Heff - frameBottom - frameTop)/(n+1), pos = frameBottom + k*gap
  const innerHeight = Math.max(0, Heff - (frameBottom + frameTop));
  let gap = innerHeight / (n + 1);

  // Faisabilité (>=200 entre centres)
  if (gap < MIN_CENTER) {
    const nMax = Math.max(0, Math.floor(innerHeight / MIN_CENTER) - 1);
    if (nMax <= 0) {
      g.count = 0;
      g.heights = [];
      if (config.traverses.sameForAllLeaves && i === 0) {
        for (let k = 1; k < config.traverses.groups.length; k++) {
          config.traverses.groups[k].count = 0;
          config.traverses.groups[k].heights = [];
          config.traverses.groups[k].type = g.type;
        }
      }
      return;
    }
    if (n > nMax) g.count = n = nMax;
    gap = innerHeight / (n + 1);
  }

  // Positions (réf. sous-panneau)
  g.heights = Array.from({ length: n }, (_, k) =>
    Math.round(frameBottom + (k + 1) * gap)
  );

  // Sécurités anti-arrondis : bornes aux bords + ≥200 entre centres
  g.heights = g.heights.map((x) =>
    Math.max(MIN_BOTTOM, Math.min(Heff - MIN_TOP, x))
  );
  for (let k = 1; k < g.heights.length; k++) {
    if (g.heights[k] - g.heights[k - 1] < MIN_CENTER) {
      g.heights[k] = g.heights[k - 1] + MIN_CENTER;
    }
  }
  if (g.heights.length > 0) {
    g.heights[g.heights.length - 1] = Math.min(
      g.heights[g.heights.length - 1],
      Heff - MIN_TOP
    );
  }

  // Mirroring si identiques
  if (config.traverses.sameForAllLeaves && i === 0) {
    for (let k = 1; k < config.traverses.groups.length; k++) {
      config.traverses.groups[k].heights = g.heights.slice();
      config.traverses.groups[k].count = g.count;
      config.traverses.groups[k].type = g.type;
    }
  }
}

function validateHauteurs(i) {
  ensureGroups();
  const Heff = panelHeightEffective();
  const r = String(config.range);
  const g = config.traverses.groups[i];

  const frameBottom = r === "96CA" ? 52 : 0;
  const frameTop = r === "96CA" ? 28 : 0;

  const MIN_CENTER = 200;
  const MIN_BOTTOM = 200 + frameBottom;
  const MIN_TOP = 200 + frameTop;

  // Bornes asymétriques (bas 252 / haut 228 pour 96CA)
  g.heights = g.heights.map((v) => {
    const x = Math.floor(Number(v) || 0);
    return Math.max(MIN_BOTTOM, Math.min(Heff - MIN_TOP, x));
  });

  // ≥ 200 entre centres
  for (let k = 1; k < g.heights.length; k++) {
    if (g.heights[k] - g.heights[k - 1] < MIN_CENTER) {
      g.heights[k] = g.heights[k - 1] + MIN_CENTER;
    }
  }
  // borne haute finale
  if (g.heights.length > 0) {
    g.heights[g.heights.length - 1] = Math.min(
      g.heights[g.heights.length - 1],
      Heff - MIN_TOP
    );
  }

  // Mirroring si identiques
  if (config.traverses.sameForAllLeaves && i === 0) {
    for (let k = 1; k < config.traverses.groups.length; k++) {
      config.traverses.groups[k].heights = g.heights.slice();
    }
  }
}

// --------- OUVERTURE/COLLAPSE LOCAUX ----------
const localOpen = reactive(new Map());
localOpen.set("vantail-0", true); // par défaut, on ouvre le premier

function isVantailOpen(id) {
  return !!localOpen.get(String(id));
}
function toggleVantail(id) {
  const k = String(id);
  localOpen.set(k, !localOpen.get(k));
}
function syncOpenState() {
  if (config.traverses.sameForAllLeaves) {
    // un seul bloc visible -> ouvre le 0
    localOpen.clear?.();
    localOpen.set("vantail-0", true);
  } else {
    // repasse à plusieurs blocs : au moins le 0 ouvert
    if (!localOpen.get("vantail-0")) localOpen.set("vantail-0", true);
  }
}

// --------- TEXTE D’AIDE ----------
const helpText = computed(() => {
  const r = String(config.range);
  if (r === "96" || r === "96CA")
    return "Hauteur des traverses : sous-panneau / centre-traverse";
  return "";
});

watch(
  () => String(config.range),
  (r) => {
    // 1) Purge si 82
    if (r === "82") {
      config.traverses.groups = [];
      return;
    }

    // 2) Sécu du type selon la gamme
    const allowed = traverseTypeOptions.value.map((o) => o.value);
    if (!allowed.includes(selectedTraverseType.value)) {
      selectedTraverseType.value = allowed[0] ?? "";
    }

    // 3) S'assure que les groupes existent
    ensureGroups();

    // 4) Recalc des hauteurs par défaut adaptées à la gamme
    const max = maxTraverseCount();
    const indices = config.traverses.sameForAllLeaves
      ? [0]
      : Array.from(
          { length: Math.max(1, Number(config.leavesCount || 1)) },
          (_, i) => i
        );

    indices.forEach((i) => {
      const g = config.traverses.groups[i];
      const current = Number(g?.count || 0);
      if (current > max) {
        setGroupCount(i, max);
      }
      if ((g?.count ?? 0) > 0) {
        generateDefaultHauteurs(i);
      }
    });

    // 5) Mirroring si "identiques"
    if (config.traverses.sameForAllLeaves && config.traverses.groups[0]) {
      const g0 = config.traverses.groups[0];
      for (let i = 1; i < config.traverses.groups.length; i++) {
        const gi = config.traverses.groups[i];
        gi.type = g0.type;
        gi.count = g0.count;
        gi.heights = g0.heights.slice();
      }
    }

    // (optionnel) remettre l'ouverture locale cohérente
    syncOpenState?.();
  }
);

watch(
  () => Number(config.height || 0),
  () => {
    // purge si 82 (par sécurité si quelqu’un change height alors que 82)
    if (String(config.range) === "82") return;

    ensureGroups();

    const max = maxTraverseCount();
    const indices = config.traverses.sameForAllLeaves
      ? [0]
      : Array.from(
          { length: Math.max(1, Number(config.leavesCount || 1)) },
          (_, i) => i
        );

    indices.forEach((i) => {
      const g = config.traverses.groups[i];
      const current = Number(g?.count || 0);
      if (current > max) {
        setGroupCount(i, max);
      }
      if ((g?.count ?? 0) > 0) {
        generateDefaultHauteurs(i);
      }
    });
  }
);
</script>

<template>
  <div
    v-if="showForm"
    class="form-wrapper"
    :class="{ open: ui.isOpen('traverses') }"
  >
    <div class="form-header" @click="ui.toggleSection('traverses')">
      <h3>TRAVERSES</h3>
      <span class="material-icons toggle-arrow">expand_more</span>
    </div>

    <form class="form-content" id="traverses-form-content">
      <label v-if="parseInt(totalVantaux) > 1">
        Vantaux identiques :
        <input type="checkbox" v-model="vantauxIdentiques" />
      </label>

      <div class="radio-list" style="margin: 10px 0">
        <label
          v-for="opt in traverseTypeOptions"
          :key="opt.value"
          :for="`trv-${opt.value}`"
          style="display: flex; gap: 10px; align-items: center"
        >
          <input
            type="radio"
            name="traverse-global"
            :id="`trv-${opt.value}`"
            :value="opt.value"
            v-model="selectedTraverseType"
          />
          {{ opt.label }}
        </label>
      </div>

      <!-- Aide selon gamme -->
      <p style="margin-bottom: 10px; font-style: italic">
        {{ helpText }}
      </p>

      <!-- BOUCLE : 1 seul wrapper si identiques, sinon 1 par vantail -->
      <div
        v-for="i in visibleIndices"
        :key="i"
        class="vantail-wrapper form-wrapper"
        :class="{ open: isVantailOpen(`vantail-${i}`) }"
      >
        <div class="form-header" @click="toggleVantail(`vantail-${i}`)">
          <h3>{{ groupTitle(i) }}</h3>
        </div>

        <div class="vantail-content">
          <label>
            Nombre de traverses :
            <select
              :value="config.traverses.groups?.[i]?.count ?? 0"
              @change="
                setGroupCount(i, Number($event.target.value));
                generateDefaultHauteurs(i);
              "
            >
              <option v-for="n in traverseOptions" :key="n" :value="n">
                {{ n }}
              </option>
            </select>
          </label>

          <button
            v-if="(config.traverses.groups?.[i]?.count ?? 0) > 0"
            type="button"
            @click="generateDefaultHauteurs(i)"
          >
            Répartition uniforme des traverses
          </button>

          <div
            class="traverse-input-group"
            v-if="config.traverses.groups?.[i]?.heights?.length > 0"
          >
            <label
              v-for="(h, j) in config.traverses.groups[i].heights"
              :key="j"
              style="display: flex; flex-direction: row; margin: 10px 0"
            >
              Traverse {{ j + 1 }} :
              <input
                type="number"
                v-model.number="config.traverses.groups[i].heights[j]"
                @change="validateHauteurs(i)"
              />
            </label>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>
