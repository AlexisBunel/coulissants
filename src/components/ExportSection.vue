<script setup>
import { computed } from "vue";
import { useDerivedStore } from "../stores/derived.store";
import { getRenderer, getThreeManager } from "../three/registry";
import { generateRecapPDF } from "../utils/recapPdf";
import { profils as profilsDB } from "../data/profiles";
import { useConfigStore } from "../stores/config.store";
import { storeToRefs } from "pinia";

// ----- helpers identiques à ton composant Profils -----
const d = useDerivedStore();
const cfg = useConfigStore();
const { filling, tick, typeRemplissage } = storeToRefs(cfg);

// Helper robuste qui essaie plusieurs clés possibles
const dims = computed(() => {
  const r = d.raw || {};
  // adapte ces chemins à ta structure exacte :
  const w =
    d.dimensions?.width ??
    r.dimensions?.width ??
    r.width ??
    r.global?.width ??
    0;
  const h =
    d.dimensions?.height ??
    r.dimensions?.height ??
    r.height ??
    r.global?.height ??
    0;
  return {
    width: Number(w) || 0,
    height: Number(h) || 0,
    unitScale: 1, // si ta scène est en mm comme tes données, laisse 1
  };
});

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

const profileRows = computed(() => {
  const r = d.raw;
  if (!r) return [];
  const finishCode = d.profils?.Profiles?.finish?.code || "";
  const finishLabel = d.profils?.Profiles?.finish?.label || "";

  const items = [];
  items.push(makeRow(r.rails?.top, finishCode, finishLabel, "Rail haut"));
  items.push(makeRow(r.rails?.bottom, finishCode, finishLabel, "Rail bas"));
  items.push(makeRow(r.handle, finishCode, finishLabel, "Poignée"));
  items.push(
    makeRow(
      r.traverses?.intermediate,
      finishCode,
      finishLabel,
      "Traverse intermédiaire"
    )
  );
  items.push(
    makeRow(r.traverses?.top, finishCode, finishLabel, "Traverse haute")
  );
  items.push(
    makeRow(r.traverses?.bottom, finishCode, finishLabel, "Traverse basse")
  );
  items.push(makeRow(r.corner, finishCode, finishLabel, "Cornière basse"));

  return items
    .filter(Boolean)
    .filter((row) => (row.qty ?? 0) > 0 || (row.length ?? 0) > 0);
});

function normalizeAccessory(
  row,
  fallbackFinishLabel = "",
  fallbackFinishCode = ""
) {
  return {
    ref: row?.ref ?? row?.reference ?? "",
    designation: row?.designation ?? row?.type ?? "—",
    finishLabel: row?.finishLabel ?? row?.finish ?? fallbackFinishLabel ?? "",
    finishCode: row?.finishCode ?? fallbackFinishCode ?? "",
    qty: Number(row?.qty ?? row?.quantite ?? 0) || 0,
    length: row?.length ?? row?.longueur ?? null, // en mm ou null
  };
}

const accessoryRows = computed(() => {
  const list = d.accessories?.list ?? [];

  // on tente d’abord une finition “accessoires”, sinon on retombe sur celle des profils
  const fallbackFinishLabel =
    d.profils?.Accessories?.finish?.label ??
    d.profils?.Profiles?.finish?.label ??
    "";

  const fallbackFinishCode =
    d.profils?.Accessories?.finish?.code ??
    d.profils?.Profiles?.finish?.code ??
    "";

  return (
    list
      .filter(Boolean)
      .map((row) =>
        normalizeAccessory(row, fallbackFinishLabel, fallbackFinishCode)
      )
      // on ne garde que les lignes “utiles”
      .filter((r) => (r.qty ?? 0) > 0 || (r.length ?? 0) > 0)
  );
});

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
    // panneau support pour miroir
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

// --- ce computed produit ce que le PDF consomme: { designation, qty, dim } ---
const fillingRows = computed(() => {
  const F = d.fillings; // { perLeaf, meta }
  if (!F || !F.perLeaf) return [];

  const panelDesignation = getDesignation();
  const isMirror = fillType.value === "miroir";
  const delta = mirrorDelta.value;

  // Agrégation par (designation + dimensions)
  const bag = new Map(); // key: `${designation}|${dim}` -> { designation, qty, dim }

  const addLine = (designation, H, W) => {
    if (!(H > 0 && W > 0)) return;
    const dimStr = `${fmtMm(H)} X ${fmtMm(W)}`;
    const key = `${designation}|${dimStr}`;
    if (!bag.has(key)) bag.set(key, { designation, qty: 0, dim: dimStr });
    bag.get(key).qty += 1;
  };

  // Parcours de chaque vantail
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

  // tri par dimensions pour une sortie stable
  return Array.from(bag.values()).sort((a, b) =>
    a.dim.localeCompare(b.dim, "fr")
  );
});

async function exportPDF() {
  const renderer = getRenderer();
  if (!renderer) {
    console.error("Renderer indisponible (Canvas3D pas encore monté ?)");
    alert(
      "Le rendu 3D n’est pas prêt. Ouvre la scène avant d’exporter le PDF."
    );
    return;
  }

  await generateRecapPDF({
    renderer,
    dims: dims.value,
    profileRows: profileRows.value,
    accessoryRows: accessoryRows.value,
    fillingRows: fillingRows.value,
    logo: "/img/logo.webp",
    pName: cfg.name,
    totalHeight: d.geometry.overall.height,
    totalWidth: d.geometry.overall.totalWidth,
    leavesCount: d.geometry.overall.leavesCount,
  });
}
</script>

<template>
  <section style="padding: 12px; margin-top: -40px">
    <h3>Exports</h3>
    <div>
      <button @click="exportPDF">Exporter PDF</button>
    </div>
  </section>
</template>
