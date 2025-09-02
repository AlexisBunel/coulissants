<script setup>
import { computed } from "vue";
import { useDerivedStore } from "../../stores/derived.store";
import { useConfigStore } from "../../stores/config.store";
import { storeToRefs } from "pinia";

const d = useDerivedStore();
const cfg = useConfigStore();
const { filling, tick, typeRemplissage } = storeToRefs(cfg);

const normTick = computed(() => {
  const t = String(tick?.value ?? "").trim();
  if (t === "6-8" || t === "6" || t === "8") return "6-8";
  if (t === "12") return "12";
  if (t === "16") return "16";
  if (t === "19") return "19";
  return t || "";
});

const fillType = computed(() =>
  (filling?.value || typeRemplissage?.value || "").toString().toLowerCase()
);

const mirrorDelta = computed(() => {
  if (fillType.value !== "miroir") return 0;
  return normTick.value === "19" ? 2 : normTick.value === "16" ? 4 : 0;
});

function getDesignation() {
  const f = fillType.value;
  const t = normTick.value;
  if (f === "standard") {
    return t ? `Panneau ${t}mm` : "Panneau";
  }
  if (f === "verre") {
    return t === "6-8" ? "Verre 6mm - 8mm" : t ? `Verre ${t}mm` : "Verre";
  }
  if (f === "miroir") {
    // Panneau support pour miroir
    if (t === "19") return "Panneau 15mm";
    if (t === "16") return "Panneau 12mm";
    return "Panneau";
  }
  return t ? `Remplissage ${t}mm` : "Remplissage";
}

function fmtMm(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0 mm";
  return (Number.isInteger(n) ? n : Math.round(n * 10) / 10) + " mm";
}

const rows = computed(() => {
  const F = d.fillings; // { perLeaf, meta }
  if (!F || !F.perLeaf) return [];

  const panelDesignation = getDesignation();
  const isMirror = fillType.value === "miroir";
  const delta = mirrorDelta.value;

  const bag = new Map(); // key = `${designation}|${dim}` -> { designation, qty, dimensions: dim }

  const addLine = (designation, H, W) => {
    if (!(H > 0 && W > 0)) return;
    const dimStr = `${fmtMm(H)} X ${fmtMm(W)}`;
    const key = `${designation}|${dimStr}`;
    if (!bag.has(key))
      bag.set(key, { designation, qty: 0, dimensions: dimStr });
    bag.get(key).qty += 1;
  };

  // Parcours vantaux
  for (const data of Object.values(F.perLeaf)) {
    if (!data) continue;
    const W = Number(data.width?.cut ?? 0);

    const pushForHeight = (H) => {
      if (!(H > 0)) return;
      // 1) Panneau (toujours)
      addLine(panelDesignation, H, W);

      // 2) Miroir 4mm (si filling = "miroir")
      if (isMirror) {
        addLine("Miroir ép. 4mm", H - delta, W - delta);
      }
    };

    if (data.heights?.bottom != null)
      pushForHeight(Number(data.heights.bottom));
    if (Array.isArray(data.heights?.between)) {
      for (const h of data.heights.between) pushForHeight(Number(h));
    }
    if (data.heights?.top != null) pushForHeight(Number(data.heights.top));
  }

  return Array.from(bag.values()).sort((a, b) =>
    a.dimensions.localeCompare(b.dimensions, "fr")
  );
});
</script>

<template>
  <table id="fillings">
    <caption>
      Remplissages
    </caption>
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Quantité</th>
        <th>Dimensions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="rows.length === 0">
        <td colspan="3">—</td>
      </tr>
      <tr v-for="row in rows" :key="row.designation + '-' + row.dimensions">
        <td>{{ row.designation }}</td>
        <td class="num">{{ row.qty }}</td>
        <td>{{ row.dimensions }}</td>
      </tr>
    </tbody>
  </table>
</template>
