// src/calculators/ProfilesCalculator.js
import { profils } from "../data/profiles";
import { FINISH_LABEL } from "../data/finishes";

export const ProfilesCalculator = {
  calculate(cfg = {}) {
    const range = (cfg.range || "").toString().toUpperCase();
    const railType = cfg.rail === "simple" ? "simple" : "double";
    const handleRef = cfg.handle;
    const arrangement = cfg.arrangement;
    const W = Math.max(0, Math.floor(Number(cfg.width) || 0));
    const H = Math.max(0, Math.floor(Number(cfg.height) || 0));
    const leaves = Math.max(1, Math.floor(Number(cfg.leavesCount) || 1));
    const finishCode = (cfg.finishCode || "").toString();
    const finishLabel = FINISH_LABEL[finishCode] || finishCode || "";

    const rails = calcRails({
      range,
      railType,
      W,
      leaves,
      finishCode,
      finishLabel,
    });
    const handles = calcHandles({
      range,
      leaves,
      H,
      handleRef,
      finishCode,
      finishLabel,
    });
    const corners = calcCorners({
      handleRef,
      railType,
      range,
      arrangement,
      leaves,
      W,
      finishCode,
      finishLabel,
    });
    const topTraverses = calcTopTraverses({
      handleRef,
      railType,
      arrangement,
      range,
      W,
      leaves,
      finishCode,
      finishLabel,
    });
    const bottomTraverses = calcBottomTraverses({
      handleRef,
      railType,
      arrangement,
      range,
      W,
      leaves,
      finishCode,
      finishLabel,
    });
    const intermediateTraverses = calcIntermediateTraverses({
      handleRef,
      railType,
      arrangement,
      range,
      tick: tickFromConfig(cfg),
      traverses: cfg.traverses,
      W,
      leaves,
      finishCode,
      finishLabel,
    });

    const all = [
      ...rails,
      ...handles,
      ...corners,
      ...topTraverses,
      ...bottomTraverses,
      ...intermediateTraverses,
    ];

    return {
      rails,
      handles,
      corners,
      topTraverses,
      bottomTraverses,
      intermediateTraverses,
      all,
    };
  },
};

/* ------------------------------ Helpers ------------------------------ */

function findProfileMeta(ref) {
  return profils.find((p) => p.reference === ref);
}

function makeRow({
  ref,
  fallbackLabel,
  length = 0,
  qty = 1,
  finishCode = "",
  finishLabel = "",
}) {
  const meta = findProfileMeta(ref);
  const description = meta?.designation || fallbackLabel || "Profil";
  return {
    ref,
    description,
    length: Math.max(0, Math.floor(Number(length) || 0)),
    qty: Math.max(0, Math.floor(Number(qty) || 0)),
    finishCode,
    finishLabel,
  };
}

function tickFromConfig(cfg) {
  // '16' | '19' | '6-8' | '12' ...
  return (cfg.tick || cfg.t || "").toString();
}

function getVariablesFromProfiles(handleRef) {
  const meta = profils.find((p) => p.reference === handleRef);
  // y, z peuvent être non définis (ou string); on sécurise
  const y = Number(meta?.y) || 0;
  const z = Number(meta?.z) || 0;
  const c = Number(meta?.c) || 0;
  const t = Number(meta?.t) || 0;
  return { y, z, c, t, found: !!meta };
}

function getFillingWidth(railType, arrangement, W, z, y, leaves) {
  if (railType === "double") {
    if (arrangement === "centre") {
      return Math.max(0, Math.floor((W - 4 * z + y * 2) / 4));
    }

    return Math.max(0, Math.floor((W - 2 * z + y * (leaves - 1)) / leaves));
  }

  return Math.max(0, Math.floor(W - 2 * z));
}

/* ------------------------------ Rails ------------------------------ */

function calcRails({ range, railType, W, leaves, finishCode, finishLabel }) {
  const { topRef, bottomRef } = pickRailRefs(range, railType);

  const railLength = railType === "simple" ? W * Number(leaves) * 2 : W;

  return [
    makeRow({
      ref: topRef,
      fallbackLabel: "Rail haut",
      length: railLength,
      qty: 1,
      finishCode,
      finishLabel,
    }),
    makeRow({
      ref: bottomRef,
      fallbackLabel: "Rail bas",
      length: railLength,
      qty: 1,
      finishCode,
      finishLabel,
    }),
  ];
}

function pickRailRefs(range, railType) {
  if (range === "82") {
    return { topRef: "RH82", bottomRef: "RB55" };
  }
  if (range === "96" || range === "96CA") {
    if (railType === "double") return { topRef: "RH96", bottomRef: "RB65" };
    return { topRef: "RH50", bottomRef: "RB48" };
  }

  return { topRef: "RH96", bottomRef: "RB65" };
}

/* ------------------------------ Poignées ------------------------------ */

function calcHandles({ range, leaves, H, handleRef, finishCode, finishLabel }) {
  let ref = handleRef && findProfileMeta(handleRef) ? handleRef : null;

  if (!findProfileMeta(ref)) return [];

  const pLength = range === "96CA" ? H - 54 : H - 50;
  return [
    makeRow({
      ref,
      fallbackLabel: "Poignée",
      qty: leaves * 2, // 1 poignée par vantail
      length: pLength, // pas de longueur utile
      finishCode,
      finishLabel,
    }),
  ];
}

/* ------------------------------ Cornières ------------------------------ */

function calcCorners({
  handleRef,
  railType,
  range,
  arrangement,
  leaves,
  W,
  finishCode,
  finishLabel,
}) {
  if (!findProfileMeta("CCLA")) return [];
  if (range === "96CA") return [];

  const { y, z, c } = getVariablesFromProfiles(handleRef);
  const fillingWidth = getFillingWidth(railType, arrangement, W, z, y, leaves);

  const length = fillingWidth - 2 * c;
  const quantity = leaves;

  return [
    makeRow({
      ref: "CCLA",
      fallbackLabel: "Cornière basse",
      length: length,
      qty: quantity,
      finishCode,
      finishLabel,
    }),
  ];
}

/* ------------------------ Traverses hautes / basses ------------------------ */

function calcTopTraverses({
  handleRef,
  railType,
  arrangement,
  range,
  W,
  leaves,
  finishCode,
  finishLabel,
}) {
  if (range !== "96CA") return [];

  const meta = findProfileMeta("TI28");
  if (!meta) return [];

  const { y, z, c, t } = getVariablesFromProfiles(handleRef);
  const fillingWidth = getFillingWidth(railType, arrangement, W, z, y, leaves);
  const length = fillingWidth - t;
  const qty = 1 * leaves;

  return [
    makeRow({
      ref: "TI28",
      fallbackLabel: "Traverse intermédiaire 28",
      length: length,
      qty,
      finishCode,
      finishLabel,
    }),
  ];
}

function calcBottomTraverses({
  handleRef,
  railType,
  arrangement,
  range,
  W,
  leaves,
  finishCode,
  finishLabel,
}) {
  if (range !== "96CA") return [];

  const meta = findProfileMeta("THB52");
  if (!meta) return [];

  const { y, z, c, t } = getVariablesFromProfiles(handleRef);
  const fillingWidth = getFillingWidth(railType, arrangement, W, z, y, leaves);
  const length = fillingWidth - t;
  const qty = 1 * leaves;

  return [
    makeRow({
      ref: "THB52",
      fallbackLabel: "Traverse haute/basse 52",
      length: length,
      qty,
      finishCode,
      finishLabel,
    }),
  ];
}

/* -------------------------- Traverses intermédiaires -------------------------- */

function calcIntermediateTraverses({
  handleRef,
  railType,
  arrangement,
  range,
  tick,
  traverses,
  W,
  leaves,
  finishCode,
  finishLabel,
}) {
  const refFor = (type) => {
    if (range === "96") {
      const t = tick.replace(/\s/g, "");
      if (t === "16") return "TI16";
      if (t === "19") return "TI19";
      return "TI19";
    }
    if (range === "96CA") {
      if (String(type) === "28") return "TI28";
      if (String(type) === "37") return "TI37";
      return null;
    }
    return null;
  };

  const groups = Array.isArray(traverses?.groups) ? traverses.groups : [];
  if (!groups.length) return [];

  // Longueur d’une traverse intermédiaire : hypothèse = largeur par vantail
  const { y, z, c, t } = getVariablesFromProfiles(handleRef);
  const fillingWidth = getFillingWidth(railType, arrangement, W, z, y, leaves);
  const tLength = fillingWidth - t;

  // Quantités :
  // - si sameForAllLeaves : on prend le groupe 0 et on multiplie par le nombre de vantaux
  // - sinon : on additionne les counts de chaque groupe (déjà “par vantail”)
  let totalByRef = new Map(); // ref -> { qty, length }

  const addQty = (ref, qty) => {
    if (!ref || qty <= 0) return;
    const prev = totalByRef.get(ref) || { qty: 0, length: tLength };
    prev.qty += qty;
    totalByRef.set(ref, prev);
  };

  const same = !!traverses?.sameForAllLeaves;

  if (same) {
    const g0 = groups[0] || { type: null, count: 0 };
    const ref = refFor(g0.type);
    addQty(ref, Math.max(0, g0.count) * leaves);
  } else {
    for (const g of groups) {
      const ref = refFor(g.type);
      addQty(ref, Math.max(0, Number(g.count) || 0));
    }
  }

  // Générer les lignes
  const rows = [];
  for (const [ref, data] of totalByRef.entries()) {
    if (!ref) continue;
    if (!findProfileMeta(ref)) continue;

    rows.push(
      makeRow({
        ref,
        fallbackLabel: "Traverse intermédiaire",
        length: data.length,
        qty: data.qty,
        finishCode,
        finishLabel,
      })
    );
  }
  return rows;
}
