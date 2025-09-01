<script setup>
import { computed } from "vue";
import { useDerivedStore } from "../../stores/derived.store";
import { profils as profilsDB } from "../../data/profiles";

const d = useDerivedStore();

function descFor(ref, fallback) {
  if (!ref) return fallback || "Profil";
  const m = profilsDB.find((p) => p.reference === ref);
  return m?.designation || fallback || "Profil";
}

function makeRow(node, finishCode, finishLabel, fallbackLabel) {
  if (!node || !node.ref) return null;
  return {
    ref: node.ref,
    description: descFor(node.ref, fallbackLabel),
    finishCode,
    finishLabel,
    qty: node.qty ?? 1,
    length: node.length ?? 0,
  };
}

const rows = computed(() => {
  const r = d.raw;
  if (!r) return [];

  // Récupèrer la finition
  const finishCode = d.profils?.Profiles?.finish?.code || "";
  const finishLabel = d.profils?.Profiles?.finish?.label || "";

  const items = [];

  // Rails / Poignée
  items.push(makeRow(r.rails?.top, finishCode, finishLabel, "Rail haut"));
  items.push(makeRow(r.rails?.bottom, finishCode, finishLabel, "Rail bas"));
  items.push(makeRow(r.handle, finishCode, finishLabel, "Poignée"));

  // TI intermédiaires
  items.push(
    makeRow(
      r.traverses?.intermediate,
      finishCode,
      finishLabel,
      "Traverse intermédiaire"
    )
  );

  // 96CA : TI28 (haut) & THB52 (bas)
  items.push(
    makeRow(r.traverses?.top, finishCode, finishLabel, "Traverse haute")
  );
  items.push(
    makeRow(r.traverses?.bottom, finishCode, finishLabel, "Traverse basse")
  );

  // Cornière
  items.push(makeRow(r.corner, finishCode, finishLabel, "Cornière basse"));

  // Afficher seulement si qty>0 ou length>0
  return items
    .filter(Boolean)
    .filter((row) => (row.qty ?? 0) > 0 || (row.length ?? 0) > 0);
});
</script>

<template>
  <table id="profiles">
    <caption>
      Profils
    </caption>
    <thead>
      <tr>
        <th>Référence</th>
        <th>Désignation</th>
        <th>Finition</th>
        <th>Quantité</th>
        <th>Longueur</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in rows" :key="row.ref + '-' + row.length">
        <td>{{ row.ref }}</td>
        <td>{{ row.description }}</td>
        <td>{{ row.finishLabel || row.finishCode || "—" }}</td>
        <td class="num">{{ row.qty }}</td>
        <td class="num">{{ row.length }} mm</td>
      </tr>
    </tbody>
  </table>
</template>
