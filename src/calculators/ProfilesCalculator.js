import { profils } from "../data/profiles";
import { FINISH_LABEL } from "../data/finishes";

export const ProfilesCalculator = {
  calculate(cfg) {
    const range = (cfg.range || "").toString().toUpperCase();
    const railType = cfg.rail === "simple" ? "simple" : "double";
    const W = Math.max(0, Math.floor(Number(cfg.width) || 0));
    const finishCode = (cfg.finishCode || "").toString();
    const finishLabel = FINISH_LABEL[finishCode] || finishCode || "";

    const { topRef, bottomRef } = pickRailRefs(range, railType);
    const railLength = railType === "simple" ? W * 2 : W;

    const rows = [];
    rows.push(
      makeRow(topRef, "Rail haut", railLength, 1, finishCode, finishLabel)
    );
    rows.push(
      makeRow(bottomRef, "Rail bas", railLength, 1, finishCode, finishLabel)
    );
    return rows;
  },
};

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

function makeRow(ref, fallbackLabel, length, qty, finishCode, finishLabel) {
  const meta = profils.find((p) => p.reference === ref);
  const description = meta?.designation || fallbackLabel;
  return {
    ref,
    description,
    length: Math.max(0, Math.floor(Number(length) || 0)),
    qty: Math.max(0, Math.floor(Number(qty) || 0)),
    finishCode,
    finishLabel,
  };
}

function guessLabelFromRef(ref) {
  // Si la ref n’est pas trouvée dans la DB
  if (/^RH/.test(ref)) return "Rail haut";
  if (/^RB/.test(ref)) return "Rail bas";
  return "Profil";
}
