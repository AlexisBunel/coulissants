import { profils } from "../data/profiles";

export const ProfilesCalculator = {
  compute(cfg = {}) {
    const range = (cfg.range || "").toString().toUpperCase();
    const railType = cfg.rail === "simple" ? "simple" : "double";
    const arrangement = (cfg.arrangement || "").toString();
    const handleRef = cfg.handle;
    const tick = tickFromConfig(cfg);

    const W = Math.max(0, Math.floor(Number(cfg.width) || 0));
    const H = Math.max(0, Math.floor(Number(cfg.height) || 0));
    const leaves = Math.max(1, Math.floor(Number(cfg.leavesCount) || 1));
    const traversesCfg = cfg.traverses || {};

    const { y, z, c, t } = getVariablesFromProfiles(handleRef);

    const fillingWidth = getFillingWidth(
      railType,
      arrangement,
      W,
      z,
      y,
      leaves
    );

    /* ------------------------------- Rails top/bottom ------------------------------- */
    const { topRef, bottomRef } = pickRailRefs(range, railType);
    const railLength = railType === "simple" ? W * Number(leaves) * 2 : W;
    const rails = {
      top: { ref: topRef, length: railLength, qty: 1, role: "rail-top" },
      bottom: {
        ref: bottomRef,
        length: railLength,
        qty: 1,
        role: "rail-bottom",
      },
    };

    /* ----------------------------------- Handle ----------------------------------- */
    const handleLength =
      range === "96CA" ? Math.max(0, H - 54) : Math.max(0, H - 50);
    const handle = findProfileMeta(handleRef)
      ? {
          ref: handleRef,
          length: handleLength,
          qty: leaves * 2,
          role: "handle",
          y: Number(y) || 0,
          z: Number(z) || 0,
        }
      : null;

    /* ----------------------------------- Corner ----------------------------------- */
    const corner =
      range === "96CA"
        ? null
        : findProfileMeta("CCLA")
        ? {
            ref: "CCLA",
            length: Math.max(0, fillingWidth - c),
            qty: leaves,
            role: "corner",
          }
        : null;

    /* -------------------------- Traverses hautes / basses -------------------------- */
    const traverses = { top: null, bottom: null, intermediate: null };

    if (range === "96CA") {
      if (findProfileMeta("TI28")) {
        traverses.top = {
          ref: "TI28",
          length: Math.max(0, fillingWidth - t),
          qty: leaves,
          role: "traverse-top",
        };
      }
      if (findProfileMeta("THB52")) {
        traverses.bottom = {
          ref: "THB52",
          length: Math.max(0, fillingWidth - t),
          qty: leaves,
          role: "traverse-bottom",
        };
      }
    }

    /* ------------------------ Traverses intermédiaires (TI) ------------------------ */
    const tiRef = refForIntermediate(
      range,
      tick,
      traversesCfg?.groups?.[0]?.type
    );
    if (tiRef && findProfileMeta(tiRef)) {
      const tiQty = computeIntermediateQty(traversesCfg, leaves);
      const tiLen = Math.max(0, fillingWidth - t);
      traverses.intermediate =
        tiQty > 0
          ? {
              ref: tiRef,
              length: tiLen,
              qty: tiQty,
              role: "traverse-intermediate",
            }
          : null;
    }

    return {
      rails,
      handle,
      corner,
      traverses,
      meta: { range, railType, arrangement, leaves, fillingWidth },
    };
  },
};

/* -------------------------------- Helpers -------------------------------- */

function findProfileMeta(ref) {
  return profils.find((p) => p.reference === ref);
}

function tickFromConfig(cfg) {
  return (cfg.tick || cfg.t || "").toString();
}

function getVariablesFromProfiles(handleRef) {
  const meta = profils.find((p) => p.reference === handleRef);
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

function refForIntermediate(range, tick, groupType) {
  const r = (range || "").toString().toUpperCase();
  if (r === "96") {
    const t = (tick || "").replace(/\s/g, "");
    if (t === "16") return "TI16";
    if (t === "19") return "TI19";
    return "TI19";
  }
  if (r === "96CA") {
    const ty = (groupType || "").toString();
    if (ty === "28") return "TI28";
    if (ty === "37") return "TI37";
    return null;
  }
  return null;
}

function computeIntermediateQty(traverses, leaves) {
  const groups = Array.isArray(traverses?.groups) ? traverses.groups : [];
  if (!groups.length) return 0;
  const same = !!traverses?.sameForAllLeaves;

  if (same) {
    const g0 = groups[0] || { count: 0 };
    return (
      Math.max(0, Number(g0.count) || 0) * Math.max(1, Number(leaves) || 1)
    );
  }
  let sum = 0;
  for (const g of groups) sum += Math.max(0, Number(g?.count) || 0);
  return sum;
}
