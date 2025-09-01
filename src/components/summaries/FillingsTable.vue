<script setup>
import { computed } from "vue";
import { useDerivedStore } from "../../stores/derived.store";
import { useConfigStore } from "../../stores/config.store";
import { storeToRefs } from "pinia";

const d = useDerivedStore();
const cfg = useConfigStore();
const { filling, tick, typeRemplissage } = storeToRefs(cfg);
// NOTE: si ton store n'a que `typeRemplissage`, on s'en sert en fallback.

const normTick = computed(() => {
  const t = String(tick?.value ?? "").trim();
  if (t === "6-8" || t === "6" || t === "8") return "6-8";
  if (t === "12") return "12";
  if (t === "16") return "16";
  if (t === "19") return "19";
  return t || ""; // fallback
});

function getDesignation() {
  const f = (filling?.value || typeRemplissage?.value || "")
    .toString()
    .toLowerCase();
  const t = normTick.value;
  if (f === "standard") {
    // Panneau 16mm | 19mm
    return t ? `Panneau ${t}mm` : "Panneau";
  }
  if (f === "verre") {
    // Verre 6mm - 8mm | Verre 12mm
    return t === "6-8" ? "Verre 6mm - 8mm" : t ? `Verre ${t}mm` : "Verre";
  }
  return t ? `Remplissage ${t}mm` : "Remplissage";
}

function fmtMm(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0 mm";
  // si entier, pas de décimale; sinon une décimale (ex: 9.5)
  return (Number.isInteger(n) ? n : Math.round(n * 10) / 10) + " mm";
}

const rows = computed(() => {
  const F = d.fillings; // { perLeaf, meta }
  if (!F || !F.perLeaf) return [];

  const designation = getDesignation();
  const bag = new Map(); // key = `${designation}|${dim}` -> { designation, qty, dim }

  // Parcours vantaux
  for (const [leafId, data] of Object.entries(F.perLeaf)) {
    if (!data) continue;
    const W = data.width?.cut ?? 0;

    const pushPiece = (H) => {
      if (!H || H <= 0) return;
      const dimStr = `${fmtMm(H)} X ${fmtMm(W)}`;
      const key = `${designation}|${dimStr}`;
      if (!bag.has(key)) {
        bag.set(key, { designation, qty: 0, dimensions: dimStr });
      }
      bag.get(key).qty += 1;
    };

    // Bas
    if (data.heights?.bottom != null) pushPiece(data.heights.bottom);
    // Intermédiaires
    if (Array.isArray(data.heights?.between)) {
      for (const h of data.heights.between) pushPiece(h);
    }
    // Haut (si calculé)
    if (data.heights?.top != null) pushPiece(data.heights.top);
  }

  // On renvoie les items triés par dimensions (optionnel)
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
