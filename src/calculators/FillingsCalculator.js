// src/calculators/FillingsCalculator.js
import { profils } from "../data/profiles";

// Certaines références de poignées n’existent pas telles quelles dans la DB, on mappe vers la ref “de base”.
const HANDLE_ALIASES = {
  "P300-19": "P300",
  "P600-18": "P600",
  "P30-18": "P30",
};

function resolveHandleRef(ref, range) {
  const r = String(ref || "");
  if (r) return HANDLE_ALIASES[r] || r;

  // Fallback si aucune poignée n'est fournie : on choisit une poignée cohérente par gamme
  if (String(range) === "82") return "P100";
  if (String(range) === "96") return "P300";
  if (String(range) === "96CA") return "P810";
  return "P300";
}

function getYZFromProfiles(handleRef) {
  const meta = profils.find((p) => p.reference === handleRef);
  // y, z peuvent être non définis (ou string); on sécurise
  const y = Number(meta?.y) || 0;
  const z = Number(meta?.z) || 0;
  return { y, z, found: !!meta };
}

/**
 * Calcule la largeur du remplissage (unitaire) selon :
 *  - rail=double & arrangement=quinconce : (width - 2*z + (y * (leavesCount-1))) / leavesCount
 *  - rail=double & arrangement=centre    : (width - 4*z + (y * 2)) / 4
 *  - rail=simple                         :  width - 2*z
 *
 * cfg attendu :
 * {
 *   range: '82' | '96' | '96CA',
 *   rail: 'simple' | 'double',
 *   arrangement: 'quinconce' | 'centre',
 *   width: number,
 *   leavesCount: number,
 *   handle?: 'P100' | 'P200' | 'P300-19' | ...
 * }
 */
export const FillingsCalculator = {
  calculateWidth(cfg = {}) {
    const rail = String(cfg.rail || "double");
    const arrangement = String(cfg.arrangement || "quinconce");
    const W = Math.max(0, Math.floor(Number(cfg.width) || 0));
    const leaves = Math.max(1, Math.floor(Number(cfg.leavesCount) || 1));

    // Poignée → y / z
    const resolvedRef = resolveHandleRef(cfg.handle, cfg.range);
    const { y, z } = getYZFromProfiles(resolvedRef); // profils.js contient bien y et z pour les poignées.

    if (rail === "double") {
      if (arrangement === "centre") {
        // (width - 4*z + (y*2)) / 4
        return Math.max(0, Math.floor((W - 4 * z + y * 2) / 4));
      }
      // quinconce par défaut
      // (width - 2*z + (y*(leaves-1))) / leaves
      return Math.max(0, Math.floor((W - 2 * z + y * (leaves - 1)) / leaves));
    }

    // rail simple : width - 2*z
    return Math.max(0, Math.floor(W - 2 * z));
  },
};
