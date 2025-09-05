import { defineStore, storeToRefs } from "pinia";
import { computed } from "vue";
import { useConfigStore } from "./config.store";
import { ProfilesCalculator } from "../calculators/ProfilesCalculator";
import { AccessoriesCalculator } from "../calculators/AccessoriesCalculator";
import { FillingsCalculator } from "../calculators/FillingsCalculator";
import { FINISH_LABEL } from "../data/finishes";

export const useDerivedStore = defineStore("derived", () => {
  const config = useConfigStore();
  const {
    range,
    rail,
    width,
    height,
    leavesCount,
    arrangement,
    traverses,
    colorProfiles,
    tick,
    handle,
    absorber,
    colorSeal,
    colorBrushes,
    colorPGlass,
    filling,
  } = storeToRefs(config);

  const raw = computed(() =>
    ProfilesCalculator.compute({
      range: String(range.value),
      rail: String(rail.value),
      width: Number(width.value) || 0,
      height: Number(height.value) || 0,
      leavesCount: Number(leavesCount.value) || 1,
      arrangement: String(arrangement.value || ""),
      traverses: traverses.value,
      tick: String(tick?.value ?? ""),
      handle: String(handle?.value ?? ""),
    })
  ); // -> { rails:{top,bottom}, handle, corner, traverses:{top,bottom,intermediate}, meta:{...} }

  const profils = computed(() => {
    const r = raw.value;
    const finishCode = String(colorProfiles.value || "");
    const finishLabel = FINISH_LABEL[finishCode] || finishCode;

    // Rails
    const RT = r?.rails?.top
      ? {
          Ref: r.rails.top.ref,
          Length: r.rails.top.length,
          qty: r.rails.top.qty,
        }
      : { Ref: null, Length: 0, qty: 0 };

    const RB = r?.rails?.bottom
      ? {
          Ref: r.rails.bottom.ref,
          Length: r.rails.bottom.length,
          qty: r.rails.bottom.qty,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // Poignée
    const nLeaves = Math.max(1, Number(leavesCount.value) || 1);
    const Handle = r?.handle
      ? {
          Ref: r.handle.ref,
          Length: r.handle.length ?? 0,
          qty: r.handle.qty ?? nLeaves,
        }
      : { Ref: String(handle.value || ""), Length: 0, qty: nLeaves };

    // Vantaux (heights) recopiés depuis la config
    const same = !!traverses.value?.sameForAllLeaves;
    const groups = Array.isArray(traverses.value?.groups)
      ? traverses.value.groups
      : [];
    const Leaves = {};
    for (let i = 0; i < nLeaves; i++) {
      const g = same ? groups[0] : groups[i];
      Leaves[String(i + 1)] = {
        height: Array.isArray(g?.heights) ? g.heights.slice() : [],
      };
    }

    // Type global des traverses intermédiaires
    const traverseType =
      String(traverses.value?.type ?? groups?.[0]?.type ?? "") || null;

    // TI
    const TI = r?.traverses?.intermediate
      ? {
          Ref: r.traverses.intermediate.ref,
          Length: r.traverses.intermediate.length ?? 0,
          Type: traverseType,
          Leaves,
        }
      : { Ref: null, Length: 0, Type: traverseType, Leaves };

    // TH
    const TH = r?.traverses?.top
      ? {
          Ref: r.traverses.top.ref,
          Length: r.traverses.top.length ?? 0,
          qty: r.traverses.top.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // TB
    const TB = r?.traverses?.bottom
      ? {
          Ref: r.traverses.bottom.ref,
          Length: r.traverses.bottom.length ?? 0,
          qty: r.traverses.bottom.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    // Cornière
    const Corner = r?.corner
      ? {
          Ref: r.corner.ref,
          Length: r.corner.length ?? 0,
          qty: r.corner.qty ?? 0,
        }
      : { Ref: null, Length: 0, qty: 0 };

    return {
      Profiles: {
        RT,
        RB,
        Handle,
        TI,
        TH,
        TB,
        Corner,
        finish: { code: finishCode, label: finishLabel },
      },
    };
  });

  // ---------- 3) Remplissages (hauteurs/largeur) ----------
  // heightsByLeaf = { '1':[...], ... } depuis la config (comme Leaves ci-dessus)
  const heightsByLeaf = computed(() => {
    const n = Math.max(1, Number(leavesCount.value) || 1);
    const same = !!traverses.value?.sameForAllLeaves;
    const groups = Array.isArray(traverses.value?.groups)
      ? traverses.value.groups
      : [];
    const out = {};
    for (let i = 0; i < n; i++) {
      const g = same ? groups[0] : groups[i];
      out[String(i + 1)] = Array.isArray(g?.heights) ? g.heights.slice() : [];
    }
    return out;
  });

  // Déduction de la ref TI (utile pour 96CA afin de choisir TI28 ou TI37)
  const traverseRef = computed(() => {
    const r = String(range.value || "").toUpperCase();
    if (r === "96CA") {
      const groups = Array.isArray(traverses.value?.groups)
        ? traverses.value.groups
        : [];
      const ty = String(traverses.value?.type ?? groups?.[0]?.type ?? "");
      if (ty === "28") return "TI28";
      if (ty === "37") return "TI37";
      return "TI28"; // fallback raisonnable si non précisé
    }
    // 96 : non nécessaire pour les formules, mais on peut refléter le tick
    const t = String(tick?.value ?? "").replace(/\s/g, "");
    if (t === "16") return "TI16";
    if (t === "19") return "TI19";
    return "";
  });

  const fillings = computed(() =>
    FillingsCalculator.compute({
      range: String(range.value),
      height: Number(height.value) || 0,
      fillingWidth: Number(raw.value?.meta?.fillingWidth) || 0, // largeur utile par vantail  :contentReference[oaicite:4]{index=4}
      traverseRef: traverseRef.value,
      tick: String(tick?.value ?? ""),
      leavesCount: Number(leavesCount.value) || 1,
      heightsByLeaf: heightsByLeaf.value, // centres des TI par vantail (depuis config)  :contentReference[oaicite:5]{index=5}
    })
  );

  const accessories = computed(() => {
    const PRAW = raw.value || {};
    const P = profils.value || {};

    const nLeaves = Math.max(1, Number(leavesCount.value) || 1);

    const base = AccessoriesCalculator.compute({
      range: String(range.value || ""),
      tick: String(tick?.value ?? ""),
      rail: String(rail.value || ""),
      width: Number(width.value) || 0,
      leavesCount: nLeaves,
      absorber: absorber?.value || {},
      colors: {
        seal: String(colorSeal?.value ?? ""),
        brushes: String(colorBrushes?.value ?? ""),
        pglass: String(colorPGlass?.value ?? ""),
      },
      lengths: {
        handleLen: Number(P?.Handle?.Length ?? PRAW?.handle?.length ?? 0),
        topTraverseLen: Number(
          P?.TH?.Length ?? PRAW?.traverses?.top?.length ?? 0
        ),
        cornerLen: Number(P?.Corner?.Length ?? PRAW?.corner?.length ?? 0),
        tiQty: Number(PRAW?.traverses?.intermediate?.qty ?? 0),
        tiLen: Number(PRAW?.traverses?.intermediate?.length ?? 0),
      },
    });

    // On renvoie tel quel : chaque ligne porte sa propre finition éventuelle
    return base; // { list, byType, meta }
  });

  // Données géométriques utiles 3D
  const geometry = computed(() => {
    const n = Math.max(1, Number(leavesCount.value) || 1);
    const finishCode = String(colorProfiles.value || "");
    const finishLabel = FINISH_LABEL[finishCode] || finishCode;
    const r = raw.value || {};

    // Sécurité / helpers
    const pack = (node) =>
      node
        ? {
            ref: node.ref,
            length: Number(node.length) || 0,
            qty: Number(node.qty) || 0,
          }
        : { ref: null, length: 0, qty: 0 };

    // Traverses intermédiaires par vantail  hauteurs (depuis la config)
    const groups = heightsByLeaf.value; // { '1':[...], '2':[...], ...}
    const ti = r?.traverses?.intermediate || null;
    const tiByLeaf = Object.entries(groups).map(([leaf, heights]) => ({
      leaf: Number(leaf),
      heights: Array.isArray(heights) ? heights.slice() : [],
      count: Array.isArray(heights) ? heights.length : 0,
      length: Number(ti?.length) || 0, // longueur TI (identique pour chaque traverse)
    }));

    return {
      overall: {
        range: String(range.value),
        width: Number(width.value) || 0,
        totalWidth:
          rail.value === "simple"
            ? Number(width.value) * Number(leavesCount.value) * 2
            : Number(width.value),
        height: Number(height.value) || 0, // hauteur totale
        tick: String(tick?.value ?? ""), // épaisseur
        filling: String(filling?.value ?? ""), // valeur config.filling
        arrangement: String(arrangement.value || ""),
        rail: String(rail.value),
        leavesCount: n,
        profilesColor: { code: finishCode, label: finishLabel }, // couleur des profils
      },
      profiles: {
        rails: {
          top: pack(r?.rails?.top),
          bottom: pack(r?.rails?.bottom),
        },
        handle: {
          ...pack(r?.handle),
          y: Number(r?.handle?.y) || 0, // <-- nouveau
          z: Number(r?.handle?.z) || 0, // <-- nouveau
          c: Number(r?.handle?.c) || 0, // <-- nouveau
          t: Number(r?.handle?.t) || 0, // <-- nouveau
        },
        corner: pack(r?.corner),
        traverses: {
          top: pack(r?.traverses?.top),
          bottom: pack(r?.traverses?.bottom),
          intermediate: {
            ref: r?.traverses?.intermediate?.ref || null,
            length: Number(r?.traverses?.intermediate?.length) || 0,
            type:
              String(
                traverses.value?.type ??
                  traverses.value?.groups?.[0]?.type ??
                  ""
              ) || null,
            qty: Number(r?.traverses?.intermediate?.qty) || 0,
            byLeaf: tiByLeaf, // ✅ rangé par vantail avec leurs hauteurs
          },
        },
      },
      fillings: {
        // largeur utile calculée par ProfilesCalculator
        widthPerLeaf: Number(r?.meta?.fillingWidth) || 0, // :contentReference[oaicite:4]{index=4}
        heightsByLeaf: groups, // mm depuis le bas (config)  :contentReference[oaicite:5]{index=5}
        computed: fillings.value || null, // passe-plat du calcul complet (si utilisé par ta 3D)
      },
    };
  });

  return { raw, profils, accessories, fillings, geometry };
});
