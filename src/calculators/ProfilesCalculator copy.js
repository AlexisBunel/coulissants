// src/calculators/ProfilesCalculator.js
import { profils } from "../data/profiles";
import { FINISH_LABEL } from "../data/finishes";
import { FillingsCalculator } from "./FillingsCalculator";

export const ProfilesCalculator = {
  calculate(cfg = {}) {
    const range = (cfg.range || "").toString().toUpperCase();
    const railType = cfg.rail === "simple" ? "simple" : "double";
    const W = Math.max(0, Math.floor(Number(cfg.width) || 0));
    const H = Math.max(0, Math.floor(Number(cfg.height) || 0));
    const leaves = Math.max(1, Math.floor(Number(cfg.leavesCount) || 1));
    const finishCode = (cfg.finishCode || "").toString();
    const finishLabel = FINISH_LABEL[finishCode] || finishCode || "";

    const fillingWidth = FillingsCalculator.calculateWidth({
      range,
      rail: railType,
      arrangement: cfg.arrangement,
      width: W,
      leavesCount: cfg.leavesCount,
      handle: cfg.handle,
    });

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
      handleRef: cfg.handle,
      finishCode,
      finishLabel,
    });
    const corners = calcCorners({ range, W, finishCode, finishLabel });
    const topBottomTraverses = calcTopBottomTraverses({
      range,
      W,
      leaves,
      finishCode,
      finishLabel,
    });
    const intermediateTraverses = calcIntermediateTraverses({
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
      ...topBottomTraverses,
      ...intermediateTraverses,
    ];

    return {
      rails,
      handles,
      corners,
      topBottomTraverses,
      intermediateTraverses,
      all,
      fillingWidth,
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

/* ------------------------------ Rails ------------------------------ */

function calcRails({ range, railType, W, leaves, finishCode, finishLabel }) {
  const { topRef, bottomRef } = pickRailRefs(range, railType);

  // Monorail (simple) : longueur = W * leavesCount * 2 (Haut + Bas)
  // Double rail : longueur = W (Haut + Bas ont chacun la largeur totale)
  const leafCount = Math.max(1, Number(leaves) || 1);
  const railLength = railType === "simple" ? W * leafCount * 2 : W;

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
  // Si une référence de poignée est fournie et existe, on la prend. Sinon, on essaie une poignée par défaut de la gamme.
  let ref = handleRef && findProfileMeta(handleRef) ? handleRef : null;

  // if (!ref) {
  //   // fallback simple : choisir une poignée “courante” par gamme
  //   if (range === "82") ref = "P100";
  //   else if (range === "96") ref = "P300-19";
  //   else if (range === "96CA") ref = "P810";
  // }

  if (!findProfileMeta(ref)) return []; // aucune poignée connue

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

function calcCorners({ range, W, finishCode, finishLabel }) {
  // DB dispo : CCLA (cornière basse) pour 82/96/96CA
  // Hypothèse raisonnable : 1 cornière basse de la largeur totale
  if (!["82", "96", "96CA"].includes(range)) return [];
  if (!findProfileMeta("CCLA")) return [];

  return [
    makeRow({
      ref: "CCLA",
      fallbackLabel: "Cornière basse",
      length: W,
      qty: 1,
      finishCode,
      finishLabel,
    }),
  ];
}

/* ------------------------ Traverses hautes / basses ------------------------ */

function calcTopBottomTraverses({ range, W, leaves, finishCode, finishLabel }) {
  // En base de données : THB52 (Traverse haute ET basse) pour 96CA uniquement.
  // Hypothèse : 2 traverses par vantail (1 haute + 1 basse), longueur = largeur par vantail.
  if (range !== "96CA") return [];

  const meta = findProfileMeta("THB52");
  if (!meta) return [];

  const leafWidth = leaves > 0 ? Math.floor(W / leaves) : W;
  const qty = 2 * leaves; // haut + bas par vantail

  return [
    makeRow({
      ref: "THB52",
      fallbackLabel: "Traverse haute/basse 52",
      length: leafWidth,
      qty,
      finishCode,
      finishLabel,
    }),
  ];
}

/* -------------------------- Traverses intermédiaires -------------------------- */

function calcIntermediateTraverses({
  range,
  tick,
  traverses,
  W,
  leaves,
  finishCode,
  finishLabel,
}) {
  // Map des références en fonction de la gamme / type de traverse / épaisseur
  // 96 → types '7' ou '25' utilisent TI16 (tick=16) ou TI19 (tick=19)
  // 96CA → types '28' → TI28 | '37' → TI37
  const refFor = (type) => {
    if (range === "96") {
      const t = tick.replace(/\s/g, "");
      if (t === "16") return "TI16";
      if (t === "19") return "TI19";
      // fallback si tick non reconnu
      return "TI19";
    }
    if (range === "96CA") {
      if (String(type) === "28") return "TI28";
      if (String(type) === "37") return "TI37";
      return null;
    }
    // 82 : pas de traverse intermédiaire en base fournie
    return null;
  };

  const groups = Array.isArray(traverses?.groups) ? traverses.groups : [];
  if (!groups.length) return [];

  // Longueur d’une traverse intermédiaire : hypothèse = largeur par vantail
  const leafWidth = leaves > 0 ? Math.floor(W / leaves) : W;

  // Quantités :
  // - si sameForAllLeaves : on prend le groupe 0 et on multiplie par le nombre de vantaux
  // - sinon : on additionne les counts de chaque groupe (déjà “par vantail”)
  let totalByRef = new Map(); // ref -> { qty, length }

  const addQty = (ref, qty) => {
    if (!ref || qty <= 0) return;
    const prev = totalByRef.get(ref) || { qty: 0, length: leafWidth };
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
