<script setup>
import { computed } from "vue";
import { useDerivedStore } from "../../stores/derived.store";
import { profils as profilsDB } from "../../data/profiles";

const d = useDerivedStore();

const rows = computed(() => {
  const P = d.profils?.Profiles || {};
  const finish = P.finish || {};
  const items = [];

  const pushItem = (node, fallbackType) => {
    if (!node || !node.Ref) return;
    items.push({
      ref: node.Ref,
      description: descFor(node.Ref, fallbackType),
      finishLabel: finish.label,
      finishCode: finish.code,
      qty: node.qty ?? 1,
      length: node.Length ?? 0,
    });
  };

  // Rails haut / bas / poignée
  pushItem(P.RT, "Rail haut");
  pushItem(P.RB, "Rail bas");
  pushItem(P.Handle, "Poignée");

  // TI : qty = nb total de traverses (somme des hauteurs définies sur tous les vantaux)
  if (P.TI && P.TI.Ref) {
    const totalHeights = P.TI.Leaves
      ? Object.values(P.TI.Leaves).reduce(
          (acc, v) => acc + (Array.isArray(v?.height) ? v.height.length : 0),
          0
        )
      : 0;

    items.push({
      ref: P.TI.Ref,
      description: descFor(P.TI.Ref, "Traverse intermédiaire"),
      finishLabel: finish.label,
      finishCode: finish.code,
      qty: totalHeights,
      length: P.TI.Length ?? 0,
    });
  }

  // Traverse haute/basse (96CA) et cornière
  pushItem(P.THB, "Traverse haute/basse");
  pushItem(P.Corner, "Cornière basse");

  // On n'affiche que ce qui a une quantité >0 ou une longueur >0
  return items.filter((r) => (r.qty ?? 0) > 0 || (r.length ?? 0) > 0);
});

function descFor(ref, fallback) {
  if (!ref) return fallback || "Profil";
  const m = profilsDB.find((p) => p.reference === ref);
  if (m?.designation) return m.designation;
  return fallbackFromRef(ref, fallback);
}
function fallbackFromRef(ref, fb) {
  if (!ref) return fb || "Profil";
  if (/^RH/.test(ref)) return "Rail haut";
  if (/^RB/.test(ref)) return "Rail bas";
  if (/^P/.test(ref)) return "Poignée";
  if (/^TI/.test(ref)) return "Traverse intermédiaire";
  if (/^THB/.test(ref)) return "Traverse haute/basse";
  if (ref === "CCLA") return "Cornière basse";
  return fb || "Profil";
}
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
